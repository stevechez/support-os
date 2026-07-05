import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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
      "created_at, status, priority, sentiment, channel, tags, ai_resolved, first_response_at, resolved_at"
    )
    .gte("created_at", since.toISOString());

  const rows = tickets ?? [];

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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

        <Card className="sm:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Top tags</CardTitle>
          </CardHeader>
          <CardContent>
            <Distribution items={topTags} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
