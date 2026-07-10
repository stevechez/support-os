"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import type { Json } from "@/lib/database.types";
import { PERMISSION_ERROR, requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

async function upsertSetting(key: string, value: Json) {
  const gate = await requireMember("admin");
  if (!gate.ok) throw new Error(PERMISSION_ERROR);
  const { current } = gate;

  const supabase = await createClient();
  await supabase.from("settings").upsert({
    organization_id: current.member.organization_id,
    key,
    value,
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/settings");
}

export async function toggleChatWidget(enabled: boolean, existingToken?: string) {
  const token = existingToken || randomBytes(18).toString("base64url");
  await upsertSetting("chat_widget", { enabled, token });
}

export async function regenerateChatToken() {
  await upsertSetting("chat_widget", {
    enabled: true,
    token: randomBytes(18).toString("base64url"),
  });
}

export async function toggleInboundEmail(
  enabled: boolean,
  existingToken?: string
) {
  const token = existingToken || randomBytes(18).toString("base64url");
  await upsertSetting("inbound_email", { enabled, token });
}

export async function toggleOrderSync(enabled: boolean, existingToken?: string) {
  const token = existingToken || randomBytes(18).toString("base64url");
  await upsertSetting("order_sync", { enabled, token });
}

export async function regenerateOrderSyncToken() {
  await upsertSetting("order_sync", {
    enabled: true,
    token: randomBytes(18).toString("base64url"),
  });
}

export async function toggleProactiveSupport(enabled: boolean) {
  await upsertSetting("proactive_support", { enabled });
}

export async function toggleVoice(enabled: boolean, existingToken?: string) {
  const token = existingToken || randomBytes(18).toString("base64url");
  await upsertSetting("voice", { enabled, token });
}

export async function regenerateVoiceToken() {
  await upsertSetting("voice", {
    enabled: true,
    token: randomBytes(18).toString("base64url"),
  });
}

export async function toggleSms(
  enabled: boolean,
  existingToken?: string,
  fromNumber?: string
) {
  const token = existingToken || randomBytes(18).toString("base64url");
  await upsertSetting("sms", { enabled, token, from_number: fromNumber ?? "" });
}

export async function saveSmsFromNumber(fromNumber: string, existingToken?: string) {
  const token = existingToken || randomBytes(18).toString("base64url");
  await upsertSetting("sms", { enabled: true, token, from_number: fromNumber.trim() });
}

export async function regenerateSmsToken(fromNumber?: string) {
  await upsertSetting("sms", {
    enabled: true,
    token: randomBytes(18).toString("base64url"),
    from_number: fromNumber ?? "",
  });
}

export async function toggleHelpCenter(enabled: boolean, existingToken?: string) {
  const token = existingToken || randomBytes(18).toString("base64url");
  await upsertSetting("help_center", { enabled, token });
}

export async function regenerateHelpCenterToken() {
  await upsertSetting("help_center", {
    enabled: true,
    token: randomBytes(18).toString("base64url"),
  });
}

export type ActionWebhookFormState = { error?: string; success?: string };

export async function saveActionWebhook(
  _prev: ActionWebhookFormState,
  formData: FormData
): Promise<ActionWebhookFormState> {
  const url = (formData.get("url") as string)?.trim();
  const secret = (formData.get("secret") as string)?.trim();

  if (url && !/^https:\/\//.test(url)) {
    return { error: "Webhook URL must start with https://" };
  }

  try {
    await upsertSetting("action_webhook", { enabled: !!url, url, secret });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" };
  }
  return { success: url ? "Fulfillment webhook saved." : "Fulfillment webhook cleared." };
}

export async function toggleActionWebhook(enabled: boolean, url?: string, secret?: string) {
  await upsertSetting("action_webhook", { enabled, url: url ?? "", secret: secret ?? "" });
}

export async function saveEmailFrom(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const from = (formData.get("from_address") as string)?.trim();
  if (from && !/^.+<[^@\s]+@[^@\s]+\.[^@\s]+>$|^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)) {
    return {
      error: "Use an email address, optionally with a display name: Support <help@yourdomain.com>",
    };
  }
  await upsertSetting("email_outbound", { from_address: from });
  return { success: from ? "Sender address saved." : "Sender address cleared." };
}

export async function saveSlackWebhook(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const url = (formData.get("webhook_url") as string)?.trim();
  if (url && !/^https:\/\/hooks\.slack\.com\//.test(url)) {
    return { error: "That doesn't look like a Slack incoming-webhook URL." };
  }
  await upsertSetting("slack", { webhook_url: url });
  return { success: url ? "Slack webhook saved." : "Slack webhook removed." };
}

export async function updateWorkspaceName(
  _prev: { error?: string; success?: string },
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Workspace name can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", current.member.organization_id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: "Workspace name updated." };
}
