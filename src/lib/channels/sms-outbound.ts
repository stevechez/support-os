import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export function smsOutboundConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

async function fromNumber(supabase: Client, orgId: string): Promise<string | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("organization_id", orgId)
    .eq("key", "sms")
    .maybeSingle();

  return (data?.value as { from_number?: string } | null)?.from_number ?? null;
}

/**
 * Low-level Twilio SMS send. One Twilio account for the whole deployment
 * (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN, same pattern as RESEND_API_KEY for
 * email) — each org picks its own sending number via Settings.
 */
export async function sendSms(
  supabase: Client,
  orgId: string,
  input: { to: string; body: string }
): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { ok: false, error: "Twilio not configured" };
  }

  const from = await fromNumber(supabase, orgId);
  if (!from) {
    return { ok: false, error: "No SMS sending number configured for this workspace" };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: input.to,
          From: from,
          Body: input.body,
        }),
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `Twilio ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}
