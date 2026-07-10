"use server";

import { revalidatePath } from "next/cache";

import { requireMember } from "@/lib/org";
import { previewRuleImpact, type PreviewMatch } from "@/lib/rules/preview";
import { STARTER_RULES } from "@/lib/rules/types";
import { createClient } from "@/lib/supabase/server";
import { recordVersion } from "@/lib/versions/engine";

const SAMPLE_SIZE = 25;

function splitList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export type SaveResult = { error?: string; id?: string };

export type RuleInput = {
  name: string;
  description: string;
  matchTags: string;
  matchIntents: string;
  matchKeywords: string;
  matchRegex: string;
  action: "escalate" | "require_approval";
};

function ruleRow(input: RuleInput) {
  return {
    name: input.name.trim(),
    description: input.description.trim() || null,
    match_tags: splitList(input.matchTags),
    match_intents: splitList(input.matchIntents),
    match_keywords: splitList(input.matchKeywords),
    match_regex: input.matchRegex.trim() || null,
    action: input.action,
  };
}

export async function createRule(input: RuleInput): Promise<SaveResult> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const name = input.name.trim();
  if (!name) return { error: "Give the rule a name." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_rules")
    .insert({
      organization_id: current.member.organization_id,
      ...ruleRow(input),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  await recordVersion(supabase, {
    orgId: current.member.organization_id,
    entityType: "business_rule",
    entityId: data.id,
    snapshot: ruleRow(input),
    createdBy: current.member.id,
    note: "Created",
  });
  revalidatePath("/rules");
  return { id: data.id };
}

export async function updateRule(id: string, input: RuleInput): Promise<SaveResult> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const name = input.name.trim();
  if (!name) return { error: "Give the rule a name." };

  const supabase = await createClient();
  const row = ruleRow(input);
  const { error } = await supabase.from("business_rules").update(row).eq("id", id);
  if (error) return { error: error.message };

  await recordVersion(supabase, {
    orgId: current.member.organization_id,
    entityType: "business_rule",
    entityId: id,
    snapshot: row,
    createdBy: current.member.id,
    note: "Edited",
  });
  revalidatePath("/rules");
  return { id };
}

export async function toggleRule(id: string, enabled: boolean) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("business_rules").update({ enabled }).eq("id", id);
  revalidatePath("/rules");
}

export async function deleteRule(id: string) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("business_rules").delete().eq("id", id);
  revalidatePath("/rules");
}

export type PreviewResult = { matches: PreviewMatch[]; sampleSize: number } | { error: string };

/**
 * Zero-cost preview: how many of the org's recent tickets would this
 * (possibly unsaved) rule have flagged? No AI calls — checks tags/intent
 * directly and scans AI replies that were already generated in the past.
 */
export async function previewNewRuleImpact(input: {
  matchTags: string;
  matchIntents: string;
  matchKeywords: string;
  matchRegex: string;
}): Promise<PreviewResult> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, tags, intent, messages(sender, body, is_internal)")
    .eq("organization_id", current.member.organization_id)
    .order("created_at", { ascending: false })
    .limit(SAMPLE_SIZE);

  const previewTickets = (tickets ?? []).map((t) => ({
    id: t.id,
    subject: t.subject,
    tags: t.tags,
    intent: t.intent,
    conversationText: t.messages.map((m) => m.body).join("\n"),
    aiReplyText: t.messages
      .filter((m) => m.sender === "ai" && !m.is_internal)
      .map((m) => m.body)
      .join("\n"),
  }));

  const matches = previewRuleImpact(
    {
      matchTags: splitList(input.matchTags),
      matchIntents: splitList(input.matchIntents),
      matchKeywords: splitList(input.matchKeywords),
      matchRegex: input.matchRegex.trim() || null,
    },
    previewTickets
  );

  return { matches, sampleSize: previewTickets.length };
}

export async function seedStarterRules() {
  const gate = await requireMember("admin");
  if (!gate.ok) return;
  const { current } = gate;

  const supabase = await createClient();
  await supabase.from("business_rules").insert(
    STARTER_RULES.map((rule) => ({
      ...rule,
      organization_id: current.member.organization_id,
    }))
  );
  revalidatePath("/rules");
}
