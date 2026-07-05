import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendEmail } from "@/lib/channels/email-outbound";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

function siteUrl(origin?: string): string {
  return (
    origin ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

/**
 * Offer a CSAT survey for a resolved ticket. Sends at most once.
 * Email-channel (and web tickets with a known email) get an email
 * with rating links; chat tickets are rated inline in the widget.
 */
export async function sendCsatSurvey(
  supabase: Client,
  orgId: string,
  ticketId: string,
  origin?: string
): Promise<void> {
  const { data: ticket } = await supabase
    .from("tickets")
    .select(
      "id, subject, channel, csat_token, csat_sent_at, csat_rated_at, customer:customers(name, email)"
    )
    .eq("id", ticketId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!ticket || ticket.csat_sent_at || ticket.csat_rated_at) return;

  await supabase
    .from("tickets")
    .update({ csat_sent_at: new Date().toISOString() })
    .eq("id", ticketId);

  // Chat tickets rate inline in the widget — nothing to send.
  if (ticket.channel === "chat") return;

  const email = ticket.customer?.email;
  if (!email || !process.env.RESEND_API_KEY) return;

  const base = siteUrl(origin);
  const link = (score: number) =>
    `${base}/rate/${ticket.csat_token}?s=${score}`;
  const firstName = ticket.customer?.name?.split(" ")[0];

  const text = [
    `Hi${firstName ? ` ${firstName}` : ""},`,
    "",
    `Your request “${ticket.subject}” was resolved. How did we do?`,
    "",
    ...([1, 2, 3, 4, 5] as const).map((s) => `${s} — ${link(s)}`),
    "",
    "Thanks for helping us improve.",
  ].join("\n");

  const buttons = ([1, 2, 3, 4, 5] as const)
    .map(
      (s) =>
        `<a href="${link(s)}" style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;margin:0 4px;border:1px solid #d4d4d8;border-radius:10px;text-decoration:none;color:#18181b;font-size:18px;font-weight:600">${s}</a>`
    )
    .join("");

  const html = `<div style="font-family:sans-serif;line-height:1.6;max-width:480px">
    <p>Hi${firstName ? ` ${firstName}` : ""},</p>
    <p>Your request <strong>“${ticket.subject.replace(/</g, "&lt;")}”</strong> was resolved. How did we do?</p>
    <div style="margin:20px 0;text-align:center">${buttons}</div>
    <p style="color:#71717a;font-size:13px">1 = very unsatisfied · 5 = very satisfied</p>
  </div>`;

  const result = await sendEmail(supabase, orgId, {
    to: email,
    subject: "How did we do?",
    text,
    html,
    headers: { "X-Ticket-Id": ticket.id },
  });

  if (!result.ok) {
    console.error(`[csat] survey email failed for ${ticketId}:`, result.error);
  }
}
