"use client";

import { useTransition } from "react";
import { Trash2, Zap, ZapOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { deleteExperiment, toggleExperiment } from "./actions";

type VariantStats = {
  count: number;
  aiResolved: number;
  avgCsat: number | null;
  avgConfidence: number | null;
};

type ExperimentWithAgents = {
  id: string;
  name: string;
  enabled: boolean;
  split_percent: number;
  agent_a: { name: string } | null;
  agent_b: { name: string } | null;
};

function VariantCard({
  label,
  agentName,
  stats,
}: {
  label: string;
  agentName: string;
  stats: VariantStats;
}) {
  const resolutionRate =
    stats.count > 0 ? Math.round((stats.aiResolved / stats.count) * 100) : null;
  return (
    <div className="flex-1 rounded-lg border p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Variant {label} · {agentName}
      </p>
      <p className="mt-1 text-2xl font-semibold">{stats.count}</p>
      <p className="text-xs text-muted-foreground">tickets</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">AI resolved</p>
          <p className="font-medium">{resolutionRate != null ? `${resolutionRate}%` : "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">CSAT</p>
          <p className="font-medium">
            {stats.avgCsat != null ? `${stats.avgCsat.toFixed(1)}/5` : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Confidence</p>
          <p className="font-medium">
            {stats.avgConfidence != null
              ? `${Math.round(stats.avgConfidence * 100)}%`
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ExperimentRow({
  experiment,
  a,
  b,
}: {
  experiment: ExperimentWithAgents;
  a: VariantStats;
  b: VariantStats;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className={cn(!experiment.enabled && "opacity-60")}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">{experiment.name}</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {experiment.enabled ? "live" : "off"} · {100 - experiment.split_percent}/
            {experiment.split_percent} split
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            title={experiment.enabled ? "Turn off" : "Turn on"}
            onClick={() =>
              startTransition(() => toggleExperiment(experiment.id, !experiment.enabled))
            }
          >
            {experiment.enabled ? (
              <Zap className="size-4 text-emerald-400" />
            ) : (
              <ZapOff className="size-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            title="Delete"
            onClick={() => startTransition(() => deleteExperiment(experiment.id))}
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex gap-3">
        <VariantCard label="A" agentName={experiment.agent_a?.name ?? "—"} stats={a} />
        <VariantCard label="B" agentName={experiment.agent_b?.name ?? "—"} stats={b} />
      </CardContent>
    </Card>
  );
}
