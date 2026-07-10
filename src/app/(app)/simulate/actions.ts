"use server";

import { simulateReply, type DryRunResult } from "@/lib/decision/simulate";
import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

const MAX_DRY_RUN_TICKETS = 5;

export type DryRunResponse =
  | { results: (DryRunResult | { ticketId: string; error: string })[] }
  | { error: string };

/**
 * Real AI dry-run: generates an actual predicted reply for each selected
 * ticket, using the same rules/grounding/confidence pipeline as production,
 * but writes nothing. Costs real AI budget — capped to a small batch.
 */
export async function runDryRun(
  ticketIds: string[],
  agentId?: string
): Promise<DryRunResponse> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const capped = ticketIds.slice(0, MAX_DRY_RUN_TICKETS);
  if (capped.length === 0) return { error: "Select at least one ticket." };

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const results = await Promise.all(
    capped.map(async (ticketId) => {
      const result = await simulateReply(supabase, orgId, ticketId, agentId);
      if ("error" in result) return { ticketId, error: result.error };
      return result;
    })
  );

  return { results };
}
