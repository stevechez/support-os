import { describe, expect, it } from "vitest";

import {
  extractEmailRef,
  isReplySubject,
  normalizeSubject,
  stripEmailRef,
  withEmailRef,
} from "./threading";

describe("extractEmailRef", () => {
  it("finds a token anywhere in the subject", () => {
    expect(extractEmailRef("Re: Help me [#ab12cd34ef]")).toBe("ab12cd34ef");
    expect(extractEmailRef("[#ff00aa11bb] weird placement")).toBe(
      "ff00aa11bb"
    );
  });

  it("is case-insensitive and lowercases the result", () => {
    expect(extractEmailRef("Re: Help [#AB12CD34EF]")).toBe("ab12cd34ef");
  });

  it("returns null when absent or malformed", () => {
    expect(extractEmailRef("Re: Help me")).toBeNull();
    expect(extractEmailRef("Order [#12]")).toBeNull(); // too short
    expect(extractEmailRef("Chores [#do laundry]")).toBeNull();
  });
});

describe("withEmailRef / stripEmailRef", () => {
  it("appends the token once", () => {
    expect(withEmailRef("Refund request", "ab12cd34ef")).toBe(
      "Refund request [#ab12cd34ef]"
    );
  });

  it("is idempotent", () => {
    const once = withEmailRef("Refund request", "ab12cd34ef");
    expect(withEmailRef(once, "ab12cd34ef")).toBe(once);
  });

  it("replaces a stale token", () => {
    expect(withEmailRef("Help [#0000000000]", "ab12cd34ef")).toBe(
      "Help [#ab12cd34ef]"
    );
  });

  it("strips cleanly", () => {
    expect(stripEmailRef("Help [#ab12cd34ef] please")).toBe("Help please");
  });
});

describe("isReplySubject", () => {
  it("matches common reply/forward prefixes", () => {
    for (const s of [
      "Re: hello",
      "RE: hello",
      "Fwd: hello",
      "FW: hello",
      "Re: Re: hello",
      "  re : hello",
    ]) {
      expect(isReplySubject(s)).toBe(true);
    }
  });

  it("does not match fresh subjects", () => {
    expect(isReplySubject("Refund request")).toBe(false);
    expect(isReplySubject("Recent order issue")).toBe(false);
  });
});

describe("normalizeSubject", () => {
  it("strips reply chains, tokens, and case", () => {
    expect(normalizeSubject("Re: Re: Refund Request [#ab12cd34ef]")).toBe(
      "refund request"
    );
  });

  it("collapses whitespace", () => {
    expect(normalizeSubject("Re:   Refund    request ")).toBe(
      "refund request"
    );
  });

  it("matches the original ticket subject", () => {
    const original = "API rate limits blocking production traffic";
    expect(normalizeSubject(`Re: ${original} [#ff00aa11bb]`)).toBe(
      normalizeSubject(original)
    );
  });
});
