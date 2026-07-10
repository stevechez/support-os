import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { Distribution, Kpi, VolumeChart } from "./charts";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

function countByPath(
  rows: { decision_path: string | null }[]
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.decision_path ?? "unknown";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const { range: rangeParam } = await searchParams;
  const range = (RANGES as readonly number[]).includes(Number(rangeParam))
    ? Number(rangeParam)
    : 30;

  const since = new Date();
  since.setDate(since.getDate() - (range - 1));
  since.setHours(0, 0, 0, 0);

  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("tickets")
    .select(
      "id, subject, created_at, status, priority, sentiment, channel, tags, ai_resolved, first_response_at, resolved_at, csat_rating, decision_path, decision_reason, decision_confidence"
    )
    .gte("created_at", since.toISOString());

  const rows = tickets ?? [];

  // AI quality signals — surfaced for a human to review, never acted on automatically.
  const aiTouched = rows.filter((t) => t.decision_path !== null);
  const lowCsatAi = aiTouched.filter(
    (t) => t.csat_rating !== null && t.csat_rating <= 2
  );
  const lowCsatByPath = countByPath(lowCsatAi);

  const aiResolvedRated = rows.filter((t) => t.ai_resolved && t.csat_rating !== null);
  const humanResolvedRated = rows.filter(
    (t) => t.resolved_at && !t.ai_resolved && t.csat_rating !== null
  );
  const avgOf = (list: typeof rows) =>
    list.length > 0
      ? list.reduce((sum, t) => sum + (t.csat_rating ?? 0), 0) / list.length
      : null;
  const aiCsatAvg = avgOf(aiResolvedRated);
  const humanCsatAvg = avgOf(humanResolvedRated);

  const recentLowCsat = [...lowCsatAi]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  // Daily volume
  const days: { label: string; total: number; aiResolved: number }[] = [];
  const dayIndex = new Map<string, number>();
  for (let i = 0; i < range; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    dayIndex.set(key, i);
    days.push({
      label: d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      total: 0,
      aiResolved: 0,
    });
  }
  for (const t of rows) {
    const idx = dayIndex.get(t.created_at.slice(0, 10));
    if (idx !== undefined) {
      days[idx].total++;
      if (t.ai_resolved) days[idx].aiResolved++;
    }
  }

  // Distributions
  const countBy = (key: (t: (typeof rows)[number]) => string | null) => {
    const map = new Map<string, number>();
    for (const t of rows) {
      const value = key(t) ?? "unknown";
      map.set(value, (map.get(value) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const statusDist = countBy((t) => t.status);
  const channelDist = countBy((t) => t.channel);
  const sentimentDist = countBy((t) => t.sentiment ?? "unrated");
  const priorityDist = countBy((t) => t.priority);

  const tagCounts = new Map<string, number>();
  for (const t of rows) {
    for (const tag of t.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // KPIs
  const resolved = rows.filter((t) => t.resolved_at);
  const aiResolved = resolved.filter((t) => t.ai_resolved);
  const aiRate =
    resolved.length > 0
      ? `${Math.round((aiResolved.length / resolved.length) * 100)}%`
      : "—";

  const responded = rows.filter((t) => t.first_response_at);
  const avgResponse =
    responded.length > 0
      ? formatDuration(
          responded.reduce(
            (sum, t) =>
              sum +
              (new Date(t.first_response_at!).getTime() -
                new Date(t.created_at).getTime()),
            0
          ) / responded.length
        )
      : "—";

  const ratedRows = rows.filter((t) => t.csat_rating !== null);
  const avgCsat =
    ratedRows.length > 0
      ? `${(
          ratedRows.reduce((sum, t) => sum + (t.csat_rating ?? 0), 0) /
          ratedRows.length
        ).toFixed(1)} / 5`
      : "—";
  const csatDist = [5, 4, 3, 2, 1].map((n) => ({
    label: `${n} star${n === 1 ? "" : "s"}`,
    count: ratedRows.filter((t) => t.csat_rating === n).length,
  }));

  const avgResolution =
    resolved.length > 0
      ? formatDuration(
          resolved.reduce(
            (sum, t) =>
              sum +
              (new Date(t.resolved_at!).getTime() -
                new Date(t.created_at).getTime()),
            0
          ) / resolved.length
        )
      : "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How your support operation is performing.
          </p>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Button
              key={r}
              asChild
              variant={range === r ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
            >
              <Link href={`/analytics?range=${r}`}>{r}d</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi
          label="Tickets"
          value={String(rows.length)}
          hint={`last ${range} days`}
        />
        <Kpi
          label="AI resolution rate"
          value={aiRate}
          hint={`${aiResolved.length} of ${resolved.length} resolved`}
        />
        <Kpi label="Avg first response" value={avgResponse} />
        <Kpi label="Avg time to resolve" value={avgResolution} />
        <Kpi
          label="CSAT"
          value={avgCsat}
          hint={
            ratedRows.length > 0
              ? `${ratedRows.length} response${ratedRows.length === 1 ? "" : "s"}`
              : "no responses yet"
          }
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Ticket volume</CardTitle>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary/25" /> Created
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-emerald-500/70" />{" "}
              AI-resolved
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tickets in this period yet.
            </p>
          ) : (
            <VolumeChart days={days} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribution
              items={statusDist}
              colors={{
                open: "bg-blue-400/70",
                waiting: "bg-amber-400/70",
                resolved: "bg-emerald-400/70",
                closed: "bg-muted-foreground/50",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribution items={channelDist} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribution
              items={sentimentDist}
              colors={{
                positive: "bg-emerald-400/70",
                neutral: "bg-muted-foreground/50",
                negative: "bg-red-400/70",
                unrated: "bg-muted-foreground/30",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribution
              items={priorityDist}
              colors={{
                low: "bg-muted-foreground/50",
                medium: "bg-sky-400/70",
                high: "bg-orange-400/70",
                urgent: "bg-red-400/70",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">CSAT ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribution
              items={csatDist}
              colors={{
                "5 stars": "bg-emerald-400/70",
                "4 stars": "bg-emerald-400/50",
                "3 stars": "bg-amber-400/60",
                "2 stars": "bg-orange-400/60",
                "1 star": "bg-red-400/70",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top tags</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribution items={topTags} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="size-4 text-amber-400" /> AI quality signals
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Surfaced for review — nothing here changes AI behavior
            automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">AI-resolved CSAT</p>
              <p className="text-xl font-semibold">
                {aiCsatAvg != null ? `${aiCsatAvg.toFixed(1)}/5` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Human-resolved CSAT</p>
              <p className="text-xl font-semibold">
                {humanCsatAvg != null ? `${humanCsatAvg.toFixed(1)}/5` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low-CSAT AI tickets</p>
              <p className="text-xl font-semibold">{lowCsatAi.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">of {aiTouched.length} AI-touched</p>
              <p className="text-xl font-semibold">
                {aiTouched.length > 0
                  ? `${Math.round((lowCsatAi.length / aiTouched.length) * 100)}%`
                  : "—"}
              </p>
            </div>
          </div>

          {lowCsatByPath.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Low-CSAT tickets by decision path
              </p>
              <Distribution
                items={lowCsatByPath}
                colors={{
                  auto: "bg-emerald-400/70",
                  cited: "bg-sky-400/70",
                  escalated: "bg-amber-400/70",
                }}
              />
            </div>
          )}

          {recentLowCsat.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Recent low-CSAT AI conversations
              </p>
              {recentLowCsat.map((t) => (
                <Link
                  key={t.id}
                  href={`/inbox?t=${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{t.subject}</p>
                    {t.decision_reason && (
                      <p className="truncate text-xs text-muted-foreground">
                        {t.decision_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {t.decision_path}
                    </Badge>
                    <span className="text-xs text-amber-400">
                      ★ {t.csat_rating}/5
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {lowCsatAi.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No low-rated AI conversations in this period.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
