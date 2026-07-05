import "server-only";

import { embedQuery, embeddingsAvailable } from "@/lib/ai/embeddings";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

/** Load a ticket with customer + transcript, scoped to the current member. */
export async function loadTicketContext(ticketId: string) {
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

  return {
    current,
    supabase,
    ticket,
    context: `${header}\n\n--- Conversation ---\n${transcript}`,
  };
}

export type RetrievedChunk = {
  document_title: string;
  content: string;
  similarity: number;
};

/** Retrieve knowledge chunks relevant to a ticket (empty if unavailable). */
export async function retrieveKnowledge(
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

export function referenceBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] ${c.document_title}\n${c.content}`)
    .join("\n\n");
}

export const SUGGEST_REPLY_SYSTEM =
  "You draft replies for customer support agents. Write the next reply to the customer: warm, professional, concise, and specific to the conversation. Address the customer by first name if known. Never invent order numbers, policies, or commitments not present in the conversation or reference material. If information is missing, ask for it politely. Output only the reply body — no subject line, no signature, no preamble.";

export const SUMMARIZE_SYSTEM =
  "You summarize customer support conversations for busy agents. Be concise and factual. Output 3-5 short bullet points covering: the customer's issue, what has been done so far, current blocker or next step, and customer mood. Plain text bullets with '•', no headers.";

export const CHECKLIST_SYSTEM =
  "You create short action checklists for support agents based on a conversation. Output 3-6 checkbox items ('☐ ...'), ordered, each a single concrete action the agent should take to resolve the ticket. Plain text only.";

export const FIND_DOCS_SYSTEM =
  "You answer support agents' questions using ONLY the numbered knowledge base excerpts provided. Summarize what the documentation says that is relevant to the customer's issue, citing excerpts inline like [1], [2]. If the excerpts don't fully answer the issue, say what's missing. Keep it under 150 words.";
