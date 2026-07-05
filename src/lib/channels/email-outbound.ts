import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { withEmailRef } from "./threading";

type Client = SupabaseClient<Database>;

export function emailOutboundConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fromAddress(supabase: Client, orgId: string): Promise<string> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("organization_id", orgId)
    .eq("key", "email_outbound")
    .maybeSingle();

  const stored = (data?.value as { from_address?: string } | null)
    ?.from_address;
  return (
    stored?.trim() ||
    process.env.EMAIL_FROM ||
    // Resend's shared test sender — works without domain verification,
    // but only delivers to the Resend account owner's email.
    "SupportOS <onboarding@resend.dev>"
  );
}

/** Low-level Resend delivery. */
export async function sendEmail(
  supabase: Client,
  orgId: string,
  input: {
    to: string;
    subject: string;
    text: string;
    html: string;
    headers?: Record<string, string>;
  }
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const from = await fromAddress(supabase, orgId);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        headers: input.headers,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      return {
        ok: false,
        error: data?.message ?? `Resend error (${res.status})`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Email delivery failed",
    };
  }
}

export function textAsHtml(text: string): string {
  return `<div style="font-family:sans-serif;line-height:1.6;white-space:pre-wrap">${escapeHtml(text)}</div>`;
}

/**
 * Send a ticket reply to the customer via Resend.
 * On failure, drops an internal note on the ticket so agents notice.
 */
export async function sendTicketEmail(
  supabase: Client,
  orgId: string,
  input: {
    ticketId: string;
    to: string;
    subject: string;
    body: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  // Thread token: customer replies to this subject land on the same ticket.
  const { data: refRow } = await supabase
    .from("tickets")
    .select("email_ref")
    .eq("id", input.ticketId)
    .maybeSingle();

  let subject = input.subject.startsWith("Re:")
    ? input.subject
    : `Re: ${input.subject}`;
  if (refRow?.email_ref) {
    subject = withEmailRef(subject, refRow.email_ref);
  }

  const { error } = await sendEmail(supabase, orgId, {
    to: input.to,
    subject,
    text: input.body,
    html: textAsHtml(input.body),
    headers: { "X-Ticket-Id": input.ticketId },
  });

  if (error) {
    // Surface the failure in the thread so it isn't silent.
    await supabase.from("messages").insert({
      organization_id: orgId,
      ticket_id: input.ticketId,
      sender: "system",
      body: `Email delivery to ${input.to} failed: ${error}`,
      is_internal: true,
    });
    return { ok: false, error };
  }

  return { ok: true };
}
