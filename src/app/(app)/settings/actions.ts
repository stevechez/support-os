"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Json } from "@/lib/database.types";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

async function upsertSetting(key: string, value: Json) {
  const current = await getCurrentMember();
  if (!current) redirect("/login");

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
  const current = await getCurrentMember();
  if (!current) redirect("/login");

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
