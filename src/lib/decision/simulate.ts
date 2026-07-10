import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { retrieveKnowledge } from "@/lib/ai/context";
import {
  combineGrounding,
  fetchTicket,
  generateReply,
  transcript,
} from "@/lib/automations/engine";
import type { Database } from "@/lib/database.types";
import { retrieveOrderContext } from "@/lib/orders/lookup";
import { checkDraftText, checkTicketRules, fetchEnabledRules } from "@/lib/rules/engine";
import { decide } from "./engine";
import type { Decision } from "./types";

type Client = SupabaseClient<Database>;

export type DryRunResult =
  | {
      ticketId: string;
      subject: string;
      skipped: false;
      reply: string;
      decision: Decision;
    }
  | { ticketId: string; subject: string; skipped: true; reason: string };

/**
 * Same logic path as the real ai_auto_reply automation step — rules,
 * knowledge/order grounding, generation, confidence routing — but reads
 * only. Nothing is written to the ticket, no message is sent, no
 * customer is touched. Still consumes real AI budget since it calls the
 * model for a real prediction.
 */
export async function simulateReply(
  supabase: Client,
  orgId: string,
  ticketId: string,
  agentId?: string
): Promise<DryRunResult | { error: string }> {
  const ticket = await fetchTicket(supabase, ticketId);
  if (!ticket) return { error: "Ticket not found." };

  const rules = await fetchEnabledRules(supabase, orgId, "ai_auto_reply");
  const ticketViolation = checkTicketRules(
    rules,
    { tags: ticket.tags, intent: ticket.intent },
    transcript(ticket)
  );
  if (ticketViolation) {
    return {
      ticketId,
      subject: ticket.subject,
      skipped: true,
      reason: `Would be blocked before generating: rule "${ticketViolation.rule.name}" (${ticketViolation.reason}).`,
    };
  }

  const chunks = await retrieveKnowledge(ticket);
  const orderContext = await retrieveOrderContext(supabase, orgId, {
    customerId: ticket.customer_id,
    conversationText: transcript(ticket),
  });

  let reply: string;
  try {
    reply = await generateReply(
      supabase,
      orgId,
      ticket,
      agentId,
      combineGrounding(chunks, orderContext.block)
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Generation failed." };
  }

  const textViolation = checkDraftText(rules, reply);
  const decision = decide({
    chunks,
    violation: textViolation,
    sentimentNegative: ticket.sentiment === "negative",
    orderContext,
  });

  return { ticketId, subject: ticket.subject, skipped: false, reply, decision };
}
