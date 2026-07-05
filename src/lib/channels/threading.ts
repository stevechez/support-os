/** Pure email subject-threading helpers (no server deps — unit tested). */

const REF_PATTERN = /\[#([a-z0-9]{6,16})\]/i;
const REPLY_PREFIX = /^\s*((re|fwd?|aw|sv)\s*(\[\d+\])?\s*:\s*)+/i;

/** Extract a ticket reference like "[#ab12cd34ef]" from a subject. */
export function extractEmailRef(subject: string): string | null {
  const match = subject.match(REF_PATTERN);
  return match ? match[1].toLowerCase() : null;
}

/** Append our reference token to an outbound subject (idempotent). */
export function withEmailRef(subject: string, ref: string): string {
  if (extractEmailRef(subject) === ref.toLowerCase()) return subject;
  return `${stripEmailRef(subject)} [#${ref}]`.trim();
}

/** Remove any reference token from a subject. */
export function stripEmailRef(subject: string): string {
  return subject.replace(REF_PATTERN, "").replace(/\s{2,}/g, " ").trim();
}

/** True when the subject looks like a reply/forward. */
export function isReplySubject(subject: string): boolean {
  return REPLY_PREFIX.test(subject);
}

/**
 * Normalize for fallback matching: strip Re:/Fwd: chains and any
 * reference token, collapse whitespace, lowercase.
 */
export function normalizeSubject(subject: string): string {
  return stripEmailRef(subject.replace(REPLY_PREFIX, ""))
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
