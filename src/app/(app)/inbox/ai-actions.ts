"use server";

import { revalidatePath } from "next/cache";
import { generateObject, generateText } from "ai";
import { z } from "zod";

import { embedQuery, embeddingsAvailable } from "@/lib/ai/embeddings";
import { getOrgModel } from "@/lib/ai/org-model";
import { checkAiBudget } from "@/lib/billing/usage";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

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

export type AiResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

const NO_MODEL_ERROR =
  "No AI provider configured. Add an API key (e.g. ANTHROPIC_API_KEY) to .env.local and restart the dev server.";

async function loadContext(ticketId: string) {
  const current = await getCurrentMember();
  if (!current) return null;

  const supabase = await createClient();
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, customer:customers(name, email, company), messages(*)")
    .eq("id", ticketId)
    .maybeSingle();

  if (!ticket) return null;

  const org = current.member.organization as unknown as { name: string };

  const transcript = [...ticket.messages]
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((m) => {
      const who =
        m.sender === "customer"
          ? (ticket.customer?.name ?? "Customer")
          : m.sender === "ai"
            ? "AI Agent"
            : "Support Agent";
      return `${who}${m.is_internal ? " (internal note)" : ""}: ${m.body}`;
    })
    .join("\n\n");

  const header = [
    `Company: ${org?.name ?? "the company"}`,
    `Subject: ${ticket.subject}`,
    `Status: ${ticket.status} · Priority: ${ticket.priority}`,
    ticket.customer
      ? `Customer: ${ticket.customer.name ?? ticket.customer.email}${ticket.customer.company ? ` (${ticket.customer.company})` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return { current, supabase, ticket, context: `${header}\n\n--- Conversation ---\n${transcript}` };
}

export async function setAiModel(modelId: string) {
  const current = await getCurrentMember();
  if (!current) return;

  const supabase = await createClient();
  await supabase.from("settings").upsert({
    organization_id: current.member.organization_id,
    key: "ai_model",
    value: { id: modelId },
    updated_at: new Date().toISOString(),
  });
  revalidatePath("/inbox");
}

export async function summarizeTicket(ticketId: string): Promise<AiResult> {
  const ctx = await loadContext(ticketId);
  if (!ctx) return { ok: false, error: "Ticket not found." };
  const gate = await gateAi(ctx.current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };
  const resolved = gate.model;

  try {
    const { text } = await generateText({
      model: resolved.model,
      system:
        "You summarize customer support conversations for busy agents. Be concise and factual. Output 3-5 short bullet points covering: the customer's issue, what has been done so far, current blocker or next step, and customer mood. Plain text bullets with '•', no headers.",
      prompt: ctx.context,
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }
}

type RetrievedChunk = {
  document_title: string;
  content: string;
  similarity: number;
};

/** Retrieve knowledge chunks relevant to a ticket (empty if unavailable). */
async function retrieveKnowledge(
  ticket: { subject: string; messages: { sender: string; body: string }[] },
  count = 4
): Promise<RetrievedChunk[]> {
  if (!embeddingsAvailable()) return [];

  const lastCustomerMessage = [...ticket.messages]
    .reverse()
    .find((m) => m.sender === "customer");
  const query = `${ticket.subject}\n${lastCustomerMessage?.body ?? ""}`;

  try {
    const embedding = await embedQuery(query);
    const supabase = await createClient();
    const { data } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_count: count,
      min_similarity: 0.25,
    });
    return data ?? [];
  } catch {
    return [];
  }
}

function referenceBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.document_title}\n${c.content}`)
    .join("\n\n");
}

export async function suggestReply(ticketId: string): Promise<AiResult> {
  const ctx = await loadContext(ticketId);
  if (!ctx) return { ok: false, error: "Ticket not found." };
  const gate = await gateAi(ctx.current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };
  const resolved = gate.model;

  const chunks = await retrieveKnowledge(ctx.ticket);
  const grounding =
    chunks.length > 0
      ? `\n\nYou have access to the company knowledge base excerpts below. Ground factual claims (policies, procedures, timelines) in these excerpts when relevant, and do not contradict them:\n\n${referenceBlock(chunks)}`
      : "";

  try {
    const { text } = await generateText({
      model: resolved.model,
      system:
        "You draft replies for customer support agents. Write the next reply to the customer: warm, professional, concise, and specific to the conversation. Address the customer by first name if known. Never invent order numbers, policies, or commitments not present in the conversation or reference material. If information is missing, ask for it politely. Output only the reply body — no subject line, no signature, no preamble." +
        grounding,
      prompt: ctx.context,
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }
}

export async function findDocumentation(ticketId: string): Promise<AiResult> {
  const ctx = await loadContext(ticketId);
  if (!ctx) return { ok: false, error: "Ticket not found." };
  const gate = await gateAi(ctx.current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };
  const resolved = gate.model;
  if (!embeddingsAvailable()) {
    return {
      ok: false,
      error:
        "Knowledge search needs an OpenAI or Google API key for embeddings.",
    };
  }

  const chunks = await retrieveKnowledge(ctx.ticket, 5);
  if (chunks.length === 0) {
    return {
      ok: true,
      text: "No relevant documentation found in the knowledge base. Try indexing more documents on the Knowledge Base page.",
    };
  }

  // Number citations per document, not per chunk.
  const docTitles = [...new Set(chunks.map((c) => c.document_title))];
  const excerpts = chunks
    .map(
      (c) =>
        `[${docTitles.indexOf(c.document_title) + 1}] ${c.document_title}\n${c.content}`
    )
    .join("\n\n");

  try {
    const { text } = await generateText({
      model: resolved.model,
      system:
        "You answer support agents' questions using ONLY the numbered knowledge base excerpts provided. Summarize what the documentation says that is relevant to the customer's issue, citing excerpts inline like [1], [2]. If the excerpts don't fully answer the issue, say what's missing. Keep it under 150 words.",
      prompt: `${ctx.context}\n\n--- Knowledge base excerpts ---\n\n${excerpts}`,
    });

    const sources = docTitles.map((t, i) => `[${i + 1}] ${t}`).join("\n");

    return { ok: true, text: `${text}\n\nSources:\n${sources}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }
}

export async function generateChecklist(ticketId: string): Promise<AiResult> {
  const ctx = await loadContext(ticketId);
  if (!ctx) return { ok: false, error: "Ticket not found." };
  const gate = await gateAi(ctx.current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };
  const resolved = gate.model;

  try {
    const { text } = await generateText({
      model: resolved.model,
      system:
        "You create short action checklists for support agents based on a conversation. Output 3-6 checkbox items ('☐ ...'), ordered, each a single concrete action the agent should take to resolve the ticket. Plain text only.",
      prompt: ctx.context,
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }
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
  const ctx = await loadContext(ticketId);
  if (!ctx) return { ok: false, error: "Ticket not found." };
  const gate = await gateAi(ctx.current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };
  const resolved = gate.model;

  try {
    const { object } = await generateObject({
      model: resolved.model,
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
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Not signed in." };
  if (!draft.trim()) return { ok: false, error: "Write a draft first." };

  const gate = await gateAi(current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };
  const resolved = gate.model;

  try {
    const { text } = await generateText({
      model: resolved.model,
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
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Not signed in." };
  if (!draft.trim()) return { ok: false, error: "Write a draft first." };

  const gate = await gateAi(current.member.organization_id);
  if (!gate.ok) return { ok: false, error: gate.error };
  const resolved = gate.model;

  try {
    const { text } = await generateText({
      model: resolved.model,
      system: `Translate the given customer support reply into ${language}. Keep the tone and meaning. Output only the translation.`,
      prompt: draft,
    });
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "AI error" };
  }
}

export async function escalateTicket(ticketId: string): Promise<AiResult> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Not signed in." };

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
