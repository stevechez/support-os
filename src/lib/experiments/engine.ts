import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AgentExperiment, Database, ExperimentVariant } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

/** Deterministic 0-99 bucket from a string — same ticket always lands in the same bucket. */
function bucket(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

export function pickVariant(
  experiment: Pick<AgentExperiment, "id" | "split_percent">,
  ticketId: string
): ExperimentVariant {
  return bucket(`${experiment.id}:${ticketId}`) < experiment.split_percent ? "b" : "a";
}

/**
 * Resolve which agent persona a ticket should use for a given experiment,
 * consistently across every step in the same ticket (a ticket that lands
 * in variant B stays in variant B for its whole lifetime).
 */
export async function resolveExperimentAgent(
  supabase: Client,
  orgId: string,
  experimentId: string,
  ticketId: string
): Promise<{ agentId: string; variant: ExperimentVariant } | null> {
  const { data: experiment } = await supabase
    .from("agent_experiments")
    .select("*")
    .eq("id", experimentId)
    .eq("organization_id", orgId)
    .eq("enabled", true)
    .maybeSingle();
  if (!experiment) return null;

  const variant = pickVariant(experiment, ticketId);
  return {
    agentId: variant === "b" ? experiment.agent_b_id : experiment.agent_a_id,
    variant,
  };
}
