import "server-only";

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { runAutomations } from "@/lib/automations/engine";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

/** Find the org that owns a channel token (settings key + value.token). */
export async function orgForToken(
  supabase: Client,
  settingsKey: "chat_widget" | "inbound_email",
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
