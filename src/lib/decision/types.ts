import type { RetrievedChunk } from "@/lib/ai/context";
import type { OrderContext } from "@/lib/orders/lookup";
import type { RuleViolation } from "@/lib/rules/types";

export type DecisionPath = "auto" | "cited" | "escalated";

export type Decision = {
  path: DecisionPath;
  /** 0–1. How confident the AI is that it can safely act alone. */
  confidence: number;
  reason: string;
  citations: RetrievedChunk[];
  violation?: RuleViolation;
  orderContext?: OrderContext;
};

/** High confidence responds outright. Medium cites sources. Low escalates. */
export const CONFIDENCE_THRESHOLDS = {
  auto: 0.75,
  cited: 0.45,
} as const;
