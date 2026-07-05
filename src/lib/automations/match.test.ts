import { describe, expect, it } from "vitest";

import { matches, type MatchableTicket } from "./match";
import type { Trigger } from "./types";

const ticket: MatchableTicket = {
  subject: "Refund request for order #123",
  priority: "high",
  sentiment: "negative",
  tags: ["billing", "urgent-customer"],
  messages: [
    { sender: "customer", body: "I was double charged, please refund me." },
    { sender: "agent", body: "Looking into it." },
  ],
};

function trigger(conditions: Trigger["conditions"]): Trigger {
  return { event: "ticket.created", conditions };
}

describe("automation trigger matching", () => {
  it("matches with no conditions", () => {
    expect(matches(ticket, trigger([]))).toBe(true);
  });

  it("matches subject_contains against the subject (case-insensitive)", () => {
    expect(
      matches(ticket, trigger([{ field: "subject_contains", value: "REFUND" }]))
    ).toBe(true);
  });

  it("matches subject_contains against the last customer message", () => {
    expect(
      matches(
        ticket,
        trigger([{ field: "subject_contains", value: "double charged" }])
      )
    ).toBe(true);
  });

  it("does not match agent messages for subject_contains", () => {
    expect(
      matches(
        ticket,
        trigger([{ field: "subject_contains", value: "looking into it" }])
      )
    ).toBe(false);
  });

  it("matches priority_is exactly", () => {
    expect(
      matches(ticket, trigger([{ field: "priority_is", value: "high" }]))
    ).toBe(true);
    expect(
      matches(ticket, trigger([{ field: "priority_is", value: "low" }]))
    ).toBe(false);
  });

  it("matches sentiment_is", () => {
    expect(
      matches(ticket, trigger([{ field: "sentiment_is", value: "negative" }]))
    ).toBe(true);
    expect(
      matches(
        { ...ticket, sentiment: null },
        trigger([{ field: "sentiment_is", value: "negative" }])
      )
    ).toBe(false);
  });

  it("matches tag_is case-insensitively", () => {
    expect(
      matches(ticket, trigger([{ field: "tag_is", value: "Billing" }]))
    ).toBe(true);
    expect(
      matches(ticket, trigger([{ field: "tag_is", value: "shipping" }]))
    ).toBe(false);
  });

  it("requires ALL conditions (AND semantics)", () => {
    expect(
      matches(
        ticket,
        trigger([
          { field: "subject_contains", value: "refund" },
          { field: "priority_is", value: "high" },
        ])
      )
    ).toBe(true);
    expect(
      matches(
        ticket,
        trigger([
          { field: "subject_contains", value: "refund" },
          { field: "priority_is", value: "low" },
        ])
      )
    ).toBe(false);
  });
});
