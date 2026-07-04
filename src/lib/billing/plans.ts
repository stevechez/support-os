export type PlanId = "free" | "pro";

export type Plan = {
  id: PlanId;
  label: string;
  price: string;
  maxMembers: number;
  maxAiActionsPerMonth: number;
  maxKnowledgeDocs: number;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    label: "Free",
    price: "$0",
    maxMembers: 3,
    maxAiActionsPerMonth: 50,
    maxKnowledgeDocs: 20,
  },
  pro: {
    id: "pro",
    label: "Pro",
    price: "$49/mo",
    maxMembers: Number.POSITIVE_INFINITY,
    maxAiActionsPerMonth: 2000,
    maxKnowledgeDocs: 500,
  },
};

export type BillingState = {
  plan: PlanId;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status?: string;
  current_period_end?: string;
};

export function planFromBilling(billing: BillingState | null): Plan {
  const active =
    billing?.plan === "pro" &&
    (billing.status === "active" || billing.status === "trialing");
  return active ? PLANS.pro : PLANS.free;
}
