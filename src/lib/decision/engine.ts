import "server-only";

import type { RetrievedChunk } from "@/lib/ai/context";
import type { OrderContext } from "@/lib/orders/lookup";
import type { RuleViolation } from "@/lib/rules/types";
import { CONFIDENCE_THRESHOLDS, type Decision } from "./types";

/**
 * Confidence is grounded in how well the knowledge base actually
 * supports the reply — the average similarity of the top retrieved
 * chunks. No chunks retrieved means the AI has nothing to stand on.
 */
export function scoreKnowledgeConfidence(chunks: RetrievedChunk[]): number {
  if (chunks.length === 0) return 0.3;
  const avg =
    chunks.reduce((sum, c) => sum + c.similarity, 0) / chunks.length;
  return Math.max(0, Math.min(1, avg));
}

/**
 * The core routing decision: given what the AI knows (retrieved
 * knowledge) and whether any business rule fired, decide whether to
 * respond outright, respond with cited sources, or escalate to a human.
 * A rule violation always wins — confidence doesn't override policy.
 */
export function decide(input: {
  chunks: RetrievedChunk[];
  violation: RuleViolation | null;
  sentimentNegative?: boolean;
  orderContext?: OrderContext;
}): Decision {
  const { chunks, violation, sentimentNegative, orderContext } = input;

  if (violation) {
    return {
      path: "escalated",
      confidence: 0,
      reason: `Blocked by business rule "${violation.rule.name}" (${violation.reason}).`,
      citations: chunks,
      violation,
      orderContext,
    };
  }

  // The conversation looks like an order question but we found no order
  // data to ground the reply in — never let the model guess at a status.
  if (orderContext?.relevant && !orderContext.matchedOrder && orderContext.recentOrders.length === 0) {
    return {
      path: "escalated",
      confidence: 0.2,
      reason:
        "Conversation appears to be about an order, but no order records were found for this customer.",
      citations: chunks,
      orderContext,
    };
  }

  let confidence = scoreKnowledgeConfidence(chunks);

  // A specific matched order is ground truth — trust it more than
  // knowledge-base similarity alone.
  if (orderContext?.matchedOrder) {
    confidence = Math.max(confidence, 0.85);
  }

  // Extra caution on visibly upset customers — don't let a borderline
  // score auto-send when the stakes of getting it wrong are higher.
  if (sentimentNegative && confidence < CONFIDENCE_THRESHOLDS.auto) {
    confidence = Math.min(confidence, CONFIDENCE_THRESHOLDS.cited - 0.01);
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.auto) {
    return {
      path: "auto",
      confidence,
      reason: orderContext?.matchedOrder
        ? `Grounded in order #${orderContext.matchedOrder.order_number}.`
        : chunks.length > 0
          ? "Knowledge base strongly supports this reply."
          : "No knowledge grounding needed; high-confidence response.",
      citations: chunks,
      orderContext,
    };
  }

  if (confidence >= CONFIDENCE_THRESHOLDS.cited) {
    return {
      path: "cited",
      confidence,
      reason: "Partial knowledge base support — replying with cited sources.",
      citations: chunks,
      orderContext,
    };
  }

  return {
    path: "escalated",
    confidence,
    reason: "Not enough grounding to answer confidently.",
    citations: chunks,
    orderContext,
  };
}
