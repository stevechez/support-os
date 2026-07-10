export type RuleMatchers = {
  matchTags: string[];
  matchIntents: string[];
  matchKeywords: string[];
  matchRegex: string | null;
};

export type PreviewTicket = {
  id: string;
  subject: string;
  tags: string[];
  intent: string | null;
  /** All message bodies, customer + agent + AI, joined. */
  conversationText: string;
  /** Past AI replies that actually reached the customer (not internal notes). */
  aiReplyText: string;
};

export type PreviewMatch = { ticketId: string; subject: string; reason: string };

function safeRegex(pattern: string | null): RegExp | null {
  if (!pattern) return null;
  try {
    return new RegExp(pattern, "i");
  } catch {
    return null;
  }
}

/**
 * Pure, zero-cost preview of what a rule (saved or still being drafted)
 * would have flagged against historical tickets. No AI calls — ticket-level
 * matches are checked directly, and reply-content rules are checked against
 * AI replies that were already generated and sent in the past.
 */
export function previewRuleImpact(
  rule: RuleMatchers,
  tickets: PreviewTicket[]
): PreviewMatch[] {
  const matches: PreviewMatch[] = [];
  const regex = safeRegex(rule.matchRegex);

  for (const t of tickets) {
    const tags = t.tags.map((x) => x.toLowerCase());

    const tagHit = rule.matchTags.find((tag) => tags.includes(tag.toLowerCase()));
    if (tagHit) {
      matches.push({ ticketId: t.id, subject: t.subject, reason: `tag: ${tagHit}` });
      continue;
    }

    if (
      t.intent &&
      rule.matchIntents.some((i) => i.toLowerCase() === t.intent!.toLowerCase())
    ) {
      matches.push({ ticketId: t.id, subject: t.subject, reason: `intent: ${t.intent}` });
      continue;
    }

    const lowerConvo = t.conversationText.toLowerCase();
    const keywordHitConvo = rule.matchKeywords.find((k) =>
      lowerConvo.includes(k.toLowerCase())
    );
    if (keywordHitConvo) {
      matches.push({
        ticketId: t.id,
        subject: t.subject,
        reason: `conversation mentions "${keywordHitConvo}"`,
      });
      continue;
    }

    if (t.aiReplyText) {
      const lowerReply = t.aiReplyText.toLowerCase();
      const keywordHitReply = rule.matchKeywords.find((k) =>
        lowerReply.includes(k.toLowerCase())
      );
      if (keywordHitReply) {
        matches.push({
          ticketId: t.id,
          subject: t.subject,
          reason: `past AI reply contains "${keywordHitReply}"`,
        });
        continue;
      }

      if (regex?.test(t.aiReplyText)) {
        matches.push({
          ticketId: t.id,
          subject: t.subject,
          reason: `past AI reply matches pattern "${rule.matchRegex}"`,
        });
      }
    }
  }

  return matches;
}
