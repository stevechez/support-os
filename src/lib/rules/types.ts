import type { Database } from "@/lib/database.types";

export type BusinessRule = Database["public"]["Tables"]["business_rules"]["Row"];

export type RuleAction = "escalate" | "require_approval";

export type RuleApplicableStep = "ai_auto_reply" | "ai_draft_reply";

/** Ticket-shaped input the rule engine needs — kept minimal and pure. */
export type RuleTicket = {
  tags: string[];
  intent: string | null;
};

export type RuleViolation = {
  rule: BusinessRule;
  /** What tripped the rule, for the audit trail. */
  reason: string;
};

export const STARTER_RULES: Array<
  Pick<
    BusinessRule,
    | "name"
    | "description"
    | "match_tags"
    | "match_intents"
    | "match_keywords"
    | "match_regex"
    | "applies_to"
    | "action"
  >
> = [
  {
    name: "Never quote custom pricing",
    description:
      "Blocks AI replies that mention dollar amounts or discount percentages not confirmed in the knowledge base.",
    match_tags: [],
    match_intents: [],
    match_keywords: [],
    match_regex: "\\$\\s?\\d|\\d+\\s?%\\s?(off|discount)",
    applies_to: ["ai_auto_reply", "ai_draft_reply"],
    action: "escalate",
  },
  {
    name: "Escalate refund requests",
    description: "Any ticket tagged or classified as a refund goes to a human.",
    match_tags: ["refund"],
    match_intents: ["refund"],
    match_keywords: ["refund", "chargeback", "money back"],
    match_regex: null,
    applies_to: ["ai_auto_reply", "ai_draft_reply"],
    action: "escalate",
  },
  {
    name: "Never promise availability",
    description:
      "Blocks AI replies that guarantee stock, delivery dates, or appointment slots.",
    match_tags: [],
    match_intents: [],
    match_keywords: [],
    match_regex:
      "(guarantee|guaranteed|promise|definitely) (in stock|available|delivery|arrive)",
    applies_to: ["ai_auto_reply", "ai_draft_reply"],
    action: "escalate",
  },
  {
    name: "Escalate legal questions",
    description: "Liability, lawsuit, and compliance questions always go to a human.",
    match_tags: ["legal"],
    match_intents: ["legal"],
    match_keywords: ["lawsuit", "lawyer", "attorney", "liability", "sue"],
    match_regex: null,
    applies_to: ["ai_auto_reply", "ai_draft_reply"],
    action: "escalate",
  },
  {
    name: "Require approval for discounts",
    description: "AI can't unilaterally offer a discount or credit.",
    match_tags: [],
    match_intents: [],
    match_keywords: ["discount", "coupon", "promo code", "credit"],
    match_regex: null,
    applies_to: ["ai_auto_reply"],
    action: "require_approval",
  },
];
