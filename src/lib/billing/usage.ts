import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { planFromBilling, type BillingState, type Plan } from "./plans";

type Client = SupabaseClient<Database>;

export async function getBilling(
  supabase: Client,
  orgId: string
): Promise<BillingState | null> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("organization_id", orgId)
    .eq("key", "billing")
    .maybeSingle();
  return (data?.value as BillingState | null) ?? null;
}

export async function getPlan(supabase: Client, orgId: string): Promise<Plan> {
  return planFromBilling(await getBilling(supabase, orgId));
}

export async function getAiUsageThisMonth(
  supabase: Client,
  orgId: string
): Promise<number> {
  const period = new Date().toISOString().slice(0, 7);
  const { data } = await supabase
    .from("usage_counters")
    .select("count")
    .eq("organization_id", orgId)
    .eq("period", period)
    .eq("key", "ai_actions")
    .maybeSingle();
  return data?.count ?? 0;
}

type Budget = { ok: true } | { ok: false; error: string };

/**
 * Counts one AI action against the org's monthly budget.
 * Increment-then-check keeps it atomic under concurrency.
 */
export async function checkAiBudget(
  supabase: Client,
  orgId: string
): Promise<Budget> {
  const plan = await getPlan(supabase, orgId);
  const { data: count } = await supabase.rpc("increment_usage", {
    p_org: orgId,
    p_key: "ai_actions",
  });

  if ((count ?? 0) > plan.maxAiActionsPerMonth) {
    return {
      ok: false,
      error: `Monthly AI limit reached (${plan.maxAiActionsPerMonth} on the ${plan.label} plan). Upgrade in Settings → Billing.`,
    };
  }
  return { ok: true };
}

export async function checkKnowledgeBudget(
  supabase: Client,
  orgId: string
): Promise<Budget> {
  const plan = await getPlan(supabase, orgId);
  const { count } = await supabase
    .from("knowledge_documents")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if ((count ?? 0) >= plan.maxKnowledgeDocs) {
    return {
      ok: false,
      error: `Knowledge base limit reached (${plan.maxKnowledgeDocs} documents on the ${plan.label} plan). Upgrade in Settings → Billing.`,
    };
  }
  return { ok: true };
}

export async function checkMemberBudget(
  supabase: Client,
  orgId: string
): Promise<Budget> {
  const plan = await getPlan(supabase, orgId);
  if (plan.maxMembers === Number.POSITIVE_INFINITY) return { ok: true };

  const [{ count: members }, { count: pending }] = await Promise.all([
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("invitations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("accepted_at", null),
  ]);

  if ((members ?? 0) + (pending ?? 0) >= plan.maxMembers) {
    return {
      ok: false,
      error: `Team limit reached (${plan.maxMembers} seats on the ${plan.label} plan). Upgrade in Settings → Billing.`,
    };
  }
  return { ok: true };
}
