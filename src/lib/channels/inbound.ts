import "server-only";

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { runAutomations } from "@/lib/automations/engine";
import type { Database } from "@/lib/database.types";
import {
  extractEmailRef,
  isReplySubject,
  normalizeSubject,
} from "./threading";

type Client = SupabaseClient<Database>;

/**
 * Try to thread an inbound email onto an existing ticket:
 * 1. by the [#ref] token we stamp on outbound subjects,
 * 2. else, for Re:/Fwd: subjects, by same customer + same subject.
 */
export async function resolveInboundTicket(
  supabase: Client,
  orgId: string,
  input: { from: string; subject: string }
): Promise<string | null> {
  // 1. Explicit reference token — authoritative.
  const ref = extractEmailRef(input.subject);
  if (ref) {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("id")
      .eq("organization_id", orgId)
      .eq("email_ref", ref)
      .maybeSingle();
    if (ticket) return ticket.id;
  }

  // 2. Reply-looking subject from a known customer with a matching ticket.
  if (!isReplySubject(input.subject)) return null;

  const normalized = normalizeSubject(input.subject);
  if (!normalized) return null;

  const { data: candidates } = await supabase
    .from("tickets")
    .select("id, subject, customer:customers!inner(email)")
    .eq("organization_id", orgId)
    .eq("customer.email", input.from.trim().toLowerCase())
    .order("created_at", { ascending: false })
    .limit(20);

  const match = candidates?.find(
    (t) => normalizeSubject(t.subject) === normalized
  );
  return match?.id ?? null;
}

/** Find the org that owns a channel token (settings key + value.token). */
export async function orgForToken(
  supabase: Client,
  settingsKey:
    | "chat_widget"
    | "inbound_email"
    | "order_sync"
    | "voice"
    | "sms"
    | "help_center",
  token: string
): Promise<string | null> {
  if (!token) return null;
  const { data } = await supabase
    .from("settings")
    .select("organization_id, value")
    .eq("key", settingsKey);

  const row = data?.find(
    (r) =>
      (r.value as { token?: string; enabled?: boolean } | null)?.token ===
        token &&
      (r.value as { enabled?: boolean } | null)?.enabled !== false
  );
  return row?.organization_id ?? null;
}

export async function findOrCreateCustomer(
  supabase: Client,
  orgId: string,
  email: string,
  name?: string
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", normalized)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      organization_id: orgId,
      email: normalized,
      name: name?.trim() || normalized.split("@")[0],
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

/** Find-or-create a customer by phone number — voice has no email up front. */
export async function findOrCreateCustomerByPhone(
  supabase: Client,
  orgId: string,
  phone: string
): Promise<string> {
  const normalized = phone.trim();
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("organization_id", orgId)
    .eq("phone", normalized)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      organization_id: orgId,
      phone: normalized,
      name: normalized,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

/**
 * Thread an inbound SMS onto the customer's existing open/waiting SMS
 * ticket, or start a new one — SMS has no client-side session to carry a
 * ticket ID between messages, so threading has to be resolved server-side.
 * Mirrors the voice channel's one-ticket-per-episode model: once a ticket
 * resolves, the next text starts a fresh conversation rather than silently
 * reopening old history.
 */
export async function resolveOrCreateSmsTicket(
  supabase: Client,
  orgId: string,
  customerId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("tickets")
    .select("id")
    .eq("organization_id", orgId)
    .eq("customer_id", customerId)
    .eq("channel", "sms")
    .in("status", ["open", "waiting"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("tickets")
    .insert({
      organization_id: orgId,
      customer_id: customerId,
      subject: "Text message conversation",
      channel: "sms",
      tags: ["sms"],
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return created.id;
}

/** Create a ticket + first customer message on any inbound channel. */
export async function createInboundTicket(
  supabase: Client,
  orgId: string,
  input: {
    channel: "chat" | "email";
    email: string;
    name?: string;
    subject: string;
    body: string;
  }
): Promise<{ ticketId: string }> {
  const customerId = await findOrCreateCustomer(
    supabase,
    orgId,
    input.email,
    input.name
  );

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      organization_id: orgId,
      customer_id: customerId,
      subject: input.subject.slice(0, 200),
      channel: input.channel,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("messages").insert({
    organization_id: orgId,
    ticket_id: ticket.id,
    sender: "customer",
    body: input.body,
  });

  after(async () => {
    await runAutomations(supabase, orgId, "ticket.created", ticket.id);
    await runAutomations(supabase, orgId, "message.created", ticket.id);
  });

  return { ticketId: ticket.id };
}

/** Append a customer message to an existing ticket. */
export async function appendInboundMessage(
  supabase: Client,
  orgId: string,
  ticketId: string,
  body: string
): Promise<boolean> {
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", ticketId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!ticket) return false;

  await supabase.from("messages").insert({
    organization_id: orgId,
    ticket_id: ticketId,
    sender: "customer",
    body,
  });

  // Customer replied — reopen if the ticket was resolved/closed.
  if (ticket.status === "resolved" || ticket.status === "closed") {
    await supabase
      .from("tickets")
      .update({ status: "open", resolved_at: null })
      .eq("id", ticketId);
  }

  after(() => runAutomations(supabase, orgId, "message.created", ticketId));
  return true;
}
