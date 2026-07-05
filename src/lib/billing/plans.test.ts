import { describe, expect, it } from "vitest";

import { PLANS, planFromBilling } from "./plans";

describe("planFromBilling", () => {
  it("defaults to free with no billing record", () => {
    expect(planFromBilling(null).id).toBe("free");
  });

  it("is pro when subscription is active", () => {
    expect(
      planFromBilling({ plan: "pro", status: "active" }).id
    ).toBe("pro");
  });

  it("is pro when trialing", () => {
    expect(
      planFromBilling({ plan: "pro", status: "trialing" }).id
    ).toBe("pro");
  });

  it("falls back to free when subscription lapses", () => {
    for (const status of ["canceled", "past_due", "unpaid", "paused"]) {
      expect(planFromBilling({ plan: "pro", status }).id).toBe("free");
    }
  });

  it("free plan has finite limits, pro has unlimited seats", () => {
    expect(Number.isFinite(PLANS.free.maxMembers)).toBe(true);
    expect(Number.isFinite(PLANS.free.maxAiActionsPerMonth)).toBe(true);
    expect(Number.isFinite(PLANS.pro.maxMembers)).toBe(false);
    expect(PLANS.pro.maxAiActionsPerMonth).toBeGreaterThan(
      PLANS.free.maxAiActionsPerMonth
    );
  });
});
