import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  Clock,
  MessagesSquare,
  Smile,
  Ticket,
  TriangleAlert,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    { count: todayCount },
    { count: openCount },
    { count: escalations },
    { data: resolvedTickets },
    { data: respondedTickets },
    { data: recentMessages },
    { data: ratedTickets },
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "waiting"]),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("priority", "urgent")
      .in("status", ["open", "waiting"]),
    supabase
      .from("tickets")
      .select("ai_resolved")
      .not("resolved_at", "is", null),
    supabase
      .from("tickets")
      .select("created_at, first_response_at")
      .not("first_response_at", "is", null),
    supabase
      .from("messages")
      .select("id, body, sender, created_at, ticket:tickets(id, subject)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("tickets")
      .select("csat_rating")
      .not("csat_rating", "is", null),
  ]);

  const resolved = resolvedTickets ?? [];
  const aiRate =
    resolved.length > 0
      ? Math.round(
          (resolved.filter((t) => t.ai_resolved).length / resolved.length) *
            100
        ) + "%"
      : "—";

  const responded = respondedTickets ?? [];
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

  const rated = ratedTickets ?? [];
  const csat =
    rated.length > 0
      ? `${(
          rated.reduce((sum, t) => sum + (t.csat_rating ?? 0), 0) /
          rated.length
        ).toFixed(1)} / 5`
      : "—";

  const metrics = [
    { label: "Today's Tickets", value: String(todayCount ?? 0), icon: Ticket },
    { label: "AI Resolution Rate", value: aiRate, icon: Bot },
    {
      label: "Open Conversations",
      value: String(openCount ?? 0),
      icon: MessagesSquare,
    },
    { label: "Avg Response Time", value: avgResponse, icon: Clock },
    { label: "Customer Satisfaction", value: csat, icon: Smile },
    {
      label: "Escalations",
      value: String(escalations ?? 0),
      icon: TriangleAlert,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A calm overview of your support operation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(recentMessages ?? []).map((message) => (
            <Link
              key={message.id}
              href={`/inbox?t=${message.ticket?.id}`}
              className="flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/50"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="capitalize text-muted-foreground">
                  {message.sender}
                </span>{" "}
                on <span className="font-medium">{message.ticket?.subject}</span>
                <span className="text-muted-foreground"> — {message.body}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(message.created_at)}
              </span>
            </Link>
          ))}
          {(recentMessages ?? []).length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              Activity will appear here once conversations start flowing.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
