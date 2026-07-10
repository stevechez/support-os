"use client";

import { useState, useTransition } from "react";
import { Bot, Loader2, ShieldAlert, Sparkles, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { runDryRun, type DryRunResponse } from "./actions";

const PATH_META = {
  auto: { label: "Would auto-reply", icon: Bot, className: "border-emerald-500/20 bg-emerald-500/15 text-emerald-400" },
  cited: { label: "Would reply · cited", icon: Sparkles, className: "border-sky-500/20 bg-sky-500/15 text-sky-400" },
  escalated: { label: "Would escalate", icon: ShieldAlert, className: "border-amber-500/20 bg-amber-500/15 text-amber-400" },
} as const;

export function DryRunPanel({
  tickets,
  agents,
}: {
  tickets: { id: string; subject: string }[];
  agents: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [agentId, setAgentId] = useState("");
  const [pending, startTransition] = useTransition();
  const [response, setResponse] = useState<DryRunResponse | null>(null);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= 5 ? s : [...s, id]
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Zap className="size-4" /> Live AI dry-run
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Generates a real predicted reply for up to 5 tickets — same rules,
          grounding, and confidence scoring as production. Nothing is sent or
          saved. Uses AI budget.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-lg border p-2">
          {tickets.map((t) => (
            <label
              key={t.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent/40"
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
              />
              <span className="truncate">{t.subject}</span>
            </label>
          ))}
          {tickets.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No tickets to test against yet.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <NativeSelect
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="max-w-56"
          >
            <option value="">Default persona</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </NativeSelect>
          <Button
            disabled={pending || selected.length === 0}
            onClick={() =>
              startTransition(async () => {
                const res = await runDryRun(selected, agentId || undefined);
                setResponse(res);
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            {pending ? "Running…" : `Run dry-run (${selected.length})`}
          </Button>
        </div>

        {response && "error" in response && (
          <p className="text-sm text-destructive">{response.error}</p>
        )}

        {response && "results" in response && (
          <div className="space-y-3">
            {response.results.map((r) => {
              if ("error" in r) {
                return (
                  <div key={r.ticketId} className="rounded-lg border p-3 text-sm text-destructive">
                    Failed: {r.error}
                  </div>
                );
              }
              if (r.skipped) {
                return (
                  <div key={r.ticketId} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{r.subject}</p>
                    <Badge variant="outline" className="mt-1.5 gap-1 border-amber-500/20 bg-amber-500/15 text-amber-400">
                      <ShieldAlert className="size-3" /> Would escalate
                    </Badge>
                    <p className="mt-1.5 text-xs text-muted-foreground">{r.reason}</p>
                  </div>
                );
              }
              const meta = PATH_META[r.decision.path];
              const Icon = meta.icon;
              return (
                <div key={r.ticketId} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{r.subject}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="outline" className={cn("gap-1", meta.className)}>
                      <Icon className="size-3" /> {meta.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(r.decision.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{r.decision.reason}</p>
                  {r.decision.path !== "escalated" && (
                    <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2.5 text-xs leading-relaxed">
                      {r.reply}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
