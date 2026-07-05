"use server";

import { revalidatePath } from "next/cache";
import { generateObject, generateText } from "ai";
import { z } from "zod";

import { loadTicketContext } from "@/lib/ai/context";
import { getOrgModel } from "@/lib/ai/org-model";
import { checkAiBudget } from "@/lib/billing/usage";
import { PERMISSION_ERROR, requireMember, roleAtLeast } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type AiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const NO_MODEL_ERROR =
  "No AI provider configured. Add an API key (e.g. ANTHROPIC_API_KEY) to .env.local and restart the dev server.";

/** Resolve the org's model and charge one AI action against the budget. */
async function gateAi(
  orgId: string
): Promise<
  | { ok: true; model: NonNullable<Awaited<ReturnType<typeof getOrgModel>>> }
  | { ok: false; error: string }
> {
  const resolved = await getOrgModel(orgId);
  if (!resolved) return { ok: false, error: NO_MODEL_ERROR };

  const supabase = await createClient();
  const budget = await checkAiBudget(supabase, orgId);
  if (!budget.ok) return { ok: false, error: budget.error };

  return { ok: true, model: resolved };
}

export async function setAiModel(modelId: string) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;
  const { current } = gate;

  const supabase = await createClient();
  await supabase.from("settings").upsert({
    organization_id: current.member.organization_id,
    key: "ai_model",
    value: { id: modelId },
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/inbox");
}

const analysisSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  intent: z
    .string()
    .describe(
      "One or two word intent label, lowercase, e.g. 'refund', 'question', 'incident', 'feedback', 'account'"
    ),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  tags: z
    .array(z.enum(["product", "billing", "technical", "sales", "shipping"]))
    .describe("Applicable categories"),
});

export async function analyzeTicket(ticketId: string): Promise<AiResult> {
  const ctx = await loadTicketContext(ticketId);
  if (!ctx) return { ok: false, error: "Ticket not found." };
  if (!roleAtLeast(ctx.current.member.role, "agent")) {
    return { ok: false, error: PERMISSION_ERROR };
  }
  const gate = await gateAi(ctx.current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };

  try {
    const { object } = await generateObject({
      model: gate.model.model,
      schema: analysisSchema,
      system:
        "Analyze this customer support conversation. Classify the customer's sentiment, their intent, the appropriate priority, and applicable category tags.",
      prompt: ctx.context,
    });

    await ctx.supabase
      .from("tickets")
      .update({
        sentiment: object.sentiment,
        intent: object.intent,
        priority: object.priority,
        tags: object.tags,
      })
      .eq("id", ticketId);

    revalidatePath("/inbox");
    revalidatePath("/tickets");

    return {
      ok: true,
      text: `Sentiment: ${object.sentiment}\nIntent: ${object.intent}\nPriority: ${object.priority}\nTags: ${object.tags.join(", ") || "none"}\n\nApplied to the ticket.`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }
}

export async function rewriteDraft(
  draft: string,
  tone: "friendly" | "formal" | "concise"
): Promise<AiResult> {
  const gate0 = await requireMember("agent");
  if (!gate0.ok) return { ok: false, error: gate0.error };
  const { current } = gate0;
  if (!draft.trim()) return { ok: false, error: "Write a draft first." };

  const gate = await gateAi(current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };

  try {
    const { text } = await generateText({
      model: gate.model.model,
      system: `Rewrite the given customer support reply in a ${tone} tone. Preserve all facts and commitments exactly. Output only the rewritten text.`,
      prompt: draft,
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }
}

export async function translateDraft(
  draft: string,
  language: string
): Promise<AiResult> {
  const gate0 = await requireMember("agent");
  if (!gate0.ok) return { ok: false, error: gate0.error };
  const { current } = gate0;
  if (!draft.trim()) return { ok: false, error: "Write a draft first." };

  const gate = await gateAi(current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };

  try {
    const { text } = await generateText({
      model: gate.model.model,
      system: `Translate the given customer support reply into ${language}. Keep the tone and meaning. Output only the translation.`,
      prompt: draft,
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }
}

export async function escalateTicket(ticketId: string): Promise<AiResult> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { ok: false, error: gate.error };
  const { current } = gate;

  const supabase = await createClient();
  await supabase
    .from("tickets")
    .update({ priority: "urgent", status: "open" })
    .eq("id", ticketId);

  await supabase.from("messages").insert({
    organization_id: current.member.organization_id,
    ticket_id: ticketId,
    sender: "system",
    member_id: current.member.id,
    body: `Escalated by ${current.member.display_name ?? "an agent"}.`,
    is_internal: true,
  });

  await supabase.from("activity_log").insert({
    organization_id: current.member.organization_id,
    actor_type: "member",
    member_id: current.member.id,
    action: "ticket.escalated",
    entity_type: "ticket",
    entity_id: ticketId,
  });

  revalidatePath("/inbox");
  revalidatePath("/tickets");
  return { ok: true, text: "Ticket escalated — priority set to urgent." };
}
