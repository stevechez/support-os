import { describe, expect, it } from "vitest";

import {
  STEP_TYPES,
  defaultStep,
  describeStep,
  describeTrigger,
} from "./types";

describe("defaultStep", () => {
  it("produces a valid default for every declared step type", () => {
    for (const { id } of STEP_TYPES) {
      const step = defaultStep(id);
      expect(step.type).toBe(id);
      // Every step must be describable without throwing.
      expect(describeStep(step)).toBeTruthy();
    }
  });
});

describe("describeTrigger", () => {
  it("describes a bare event", () => {
    expect(
      describeTrigger({ event: "ticket.created", conditions: [] })
    ).toBe("Ticket created");
  });

  it("includes conditions in plain language", () => {
    const text = describeTrigger({
      event: "message.created",
      conditions: [
        { field: "subject_contains", value: "refund" },
        { field: "sentiment_is", value: "negative" },
      ],
    });
    expect(text).toContain("Customer message received");
    expect(text).toContain("refund");
    expect(text).toContain("negative");
    expect(text).toContain("and");
  });
});
