import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GitCompareArrows } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ExperimentRow } from "./experiment-row";
import { NewExperimentForm } from "./new-experiment-form";

export const metadata: Metadata = { title: "Experiments" };

type VariantStats = {
  count: number;
  aiResolved: number;
  avgCsat: number | null;
  avgConfidence: number | null;
};

function summarize(rows: { ai_resolved: boolean; csat_rating: number | null; decision_confidence: number | null }[]): VariantStats {
  const rated = rows.filter((r) => r.csat_rating != null);
  const scored = rows.filter((r) => r.decision_confidence != null);
  return {
    count: rows.length,
    aiResolved: rows.filter((r) => r.ai_resolved).length,
    avgCsat:
      rated.length > 0
        ? rated.reduce((sum, r) => sum + (r.csat_rating ?? 0), 0) / rated.length
        : null,
    avgConfidence:
      scored.length > 0
        ? scored.reduce((sum, r) => sum + (r.decision_confidence ?? 0), 0) / scored.length
        : null,
  };
}

export default async function ExperimentsPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const [{ data: experiments }, { data: agents }] = await Promise.all([
    supabase
      .from("agent_experiments")
      .select("*, agent_a:agent_configs!agent_experiments_agent_a_id_fkey(name), agent_b:agent_configs!agent_experiments_agent_b_id_fkey(name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("agent_configs")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("name"),
  ]);

  const rows = experiments ?? [];

  const results = await Promise.all(
    rows.map(async (experiment) => {
      const { data: tickets } = await supabase
        .from("tickets")
        .select("experiment_variant, ai_resolved, csat_rating, decision_confidence")
        .eq("experiment_id", experiment.id);

      const all = tickets ?? [];
      return {
        experiment,
        a: summarize(all.filter((t) => t.experiment_variant === "a")),
        b: summarize(all.filter((t) => t.experiment_variant === "b")),
      };
    })
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Experiments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Split traffic between two agent personas and see which one
            actually performs better — resolution rate, CSAT, confidence.
          </p>
        </div>
      </div>

      <NewExperimentForm agents={agents ?? []} />

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <GitCompareArrows className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No experiments yet. Create one, then attach it to an AI reply
            step in Automations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map(({ experiment, a, b }) => (
            <ExperimentRow key={experiment.id} experiment={experiment} a={a} b={b} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to run one</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Create an experiment above, then open an automation with an
          &quot;AI: reply to customer&quot; or &quot;AI: draft reply&quot;
          step and pick it from the Experiment dropdown instead of a fixed
          persona. Each ticket is deterministically bucketed into variant A
          or B and stays there for its whole lifetime.
        </CardContent>
      </Card>
    </div>
  );
}
