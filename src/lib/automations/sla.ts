import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { runAutomationForTicket } from "./engine";
import { DEFAULT_STALE_HOURS, type Trigger } from "./types";

type Client = SupabaseClient<Database>;

type CandidateTicket = {
  id: string;
  created_at: string;
  messages: { created_at: string }[];
};

function lastActivityMs(ticket: CandidateTicket): number {
  if (ticket.messages.length === 0) {
    return new Date(ticket.created_at).getTime();
  }
  return Math.max(...ticket.messages.map((m) => new Date(m.created_at).getTime()));
}

async function alreadyFiredSince(
  supabase: Client,
  automationId: string,
  ticketId: string,
  sinceMs: number
): Promise<boolean> {
  const { data } = await supabase
    .from("activity_log")
    .select("created_at, metadata")
    .eq("entity_id", ticketId)
    .eq("action", "automation.executed")
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).some((row) => {
    const metadata = row.metadata as { automation_id?: string } | null;
    if (metadata?.automation_id !== automationId) return false;
    return new Date(row.created_at).getTime() >= sinceMs;
  });
}

/**
 * Time-based SLA sweep. Unlike ticket.created/message.created automations,
 * "ticket.stale" automations aren't triggered by any single event — they
 * need to be polled. Called every minute by the same pg_cron job that
 * drives the durable job queue, so no separate scheduler is needed.
 *
 * Dedup: an automation only fires once per staleness window per ticket —
 * new activity (a message) resets the window and makes it eligible again.
 */
export async function runStaleSweep(
  supabase: Client
): Promise<{ checked: number; fired: number }> {
  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .eq("enabled", true);

  const staleAutomations = (automations ?? []).filter(
    (a) => (a.trigger as unknown as Trigger)?.event === "ticket.stale"
  );
  if (staleAutomations.length === 0) return { checked: 0, fired: 0 };

  let checked = 0;
  let fired = 0;

  // Group by org since staleness threshold and ticket pool are per-org.
  const byOrg = new Map<string, typeof staleAutomations>();
  for (const automation of staleAutomations) {
    const list = byOrg.get(automation.organization_id) ?? [];
    list.push(automation);
    byOrg.set(automation.organization_id, list);
  }

  for (const [orgId, orgAutomations] of byOrg) {
    const { data: tickets } = await supabase
      .from("tickets")
      .select("id, created_at, messages(created_at)")
      .eq("organization_id", orgId)
      .in("status", ["open", "waiting"]);

    if (!tickets?.length) continue;

    for (const automation of orgAutomations) {
      const trigger = automation.trigger as unknown as Trigger;
      const hours = trigger.staleAfterHours ?? DEFAULT_STALE_HOURS;
      const cutoffMs = Date.now() - hours * 60 * 60 * 1000;

      for (const ticket of tickets) {
        checked++;
        const lastActivity = lastActivityMs(ticket);
        if (lastActivity > cutoffMs) continue;

        if (await alreadyFiredSince(supabase, automation.id, ticket.id, lastActivity)) {
          continue;
        }

        const didFire = await runAutomationForTicket(
          supabase,
          orgId,
          automation,
          ticket.id
        );
        if (didFire) fired++;
      }
    }
  }

  return { checked, fired };
}
