import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import type {
  BusinessRule,
  RuleApplicableStep,
  RuleTicket,
  RuleViolation,
} from "./types";

type Client = SupabaseClient<Database>;

export async function fetchEnabledRules(
  supabase: Client,
  orgId: string,
  step: RuleApplicableStep
): Promise<BusinessRule[]> {
  const { data } = await supabase
    .from("business_rules")
    .select("*")
    .eq("organization_id", orgId)
    .eq("enabled", true);

  return (data ?? []).filter((rule) => rule.applies_to.includes(step));
}

function safeRegex(pattern: string | null): RegExp | null {
  if (!pattern) return null;
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

/**
 * Pre-generation check: does the ticket itself (tags/intent set by
 * classification, or keywords in the conversation) already trip a rule?
 * Lets us skip generating a reply at all for things like refund requests.
 */
export function matchTicketRule(
  rule: BusinessRule,
  ticket: RuleTicket,
  conversationText: string
): RuleViolation | null {
  const tags = ticket.tags.map((t) => t.toLowerCase());

  const tagHit = rule.match_tags.find((t) => tags.includes(t.toLowerCase()));
  if (tagHit) return { rule, reason: `ticket tagged "${tagHit}"` };

  if (
    ticket.intent &&
    rule.match_intents.some(
      (i) => i.toLowerCase() === ticket.intent!.toLowerCase()
    )
  ) {
    return { rule, reason: `intent classified as "${ticket.intent}"` };
  }

  const lowerText = conversationText.toLowerCase();
  const keywordHit = rule.match_keywords.find((k) =>
    lowerText.includes(k.toLowerCase())
  );
  if (keywordHit) {
    return { rule, reason: `conversation mentions "${keywordHit}"` };
  }

  return null;
}

/**
 * Post-generation check: scans the AI-drafted reply text itself for
 * content that should never reach a customer (pricing, promises, etc).
 */
export function matchTextRule(
  rule: BusinessRule,
  text: string
): RuleViolation | null {
  const lowerText = text.toLowerCase();

  const keywordHit = rule.match_keywords.find((k) =>
    lowerText.includes(k.toLowerCase())
  );
  if (keywordHit) {
    return { rule, reason: `reply contains "${keywordHit}"` };
  }

  const regex = safeRegex(rule.match_regex);
  if (regex?.test(text)) {
    return { rule, reason: `reply matches pattern "${rule.match_regex}"` };
  }

  return null;
}

/** Check ticket-level rules before generating anything. */
export function checkTicketRules(
  rules: BusinessRule[],
  ticket: RuleTicket,
  conversationText: string
): RuleViolation | null {
  for (const rule of rules) {
    const violation = matchTicketRule(rule, ticket, conversationText);
    if (violation) return violation;
  }
  return null;
}

/** Check a drafted reply's text against rules after generation. */
export function checkDraftText(
  rules: BusinessRule[],
  draftText: string
): RuleViolation | null {
  for (const rule of rules) {
    const violation = matchTextRule(rule, draftText);
    if (violation) return violation;
  }
  return null;
}
