import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import type { TicketStatus } from "@/lib/database.types";
import { STATUSES, priorityStyles, statusStyles } from "@/lib/ticket-ui";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { NewTicketButton } from "./new-ticket-button";

export const metadata: Metadata = { title: "Tickets" };

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as TicketStatus)
    ? (status as TicketStatus)
    : undefined;

  let query = supabase
    .from("tickets")
    .select("*, customer:customers(name, email), assignee:members(display_name)")
    .order("created_at", { ascending: false });

  if (filter) query = query.eq("status", filter);

  const { data: tickets } = await query;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, prioritize, and resolve issues.
          </p>
        </div>
        <NewTicketButton />
      </div>

      <div className="flex gap-1.5">
        <Button
          asChild
          variant={!filter ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs"
        >
          <Link href="/tickets">All</Link>
        </Button>
        {STATUSES.map((s) => (
          <Button
            key={s}
            asChild
            variant={filter === s ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs capitalize"
          >
            <Link href={`/tickets?status=${s}`}>{s}</Link>
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-card/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Subject</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Priority</th>
              <th className="px-4 py-2.5 font-medium">Assignee</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(tickets ?? []).map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b last:border-0 transition-colors hover:bg-accent/40"
              >
                <td className="max-w-64 px-4 py-3">
                  <Link
                    href={`/inbox?t=${ticket.id}`}
                    className="block truncate font-medium hover:underline"
                  >
                    {ticket.subject}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {ticket.customer?.name ?? ticket.customer?.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn("capitalize", statusStyles[ticket.status])}
                  >
                    {ticket.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      priorityStyles[ticket.priority]
                    )}
                  >
                    {ticket.priority}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {ticket.assignee?.display_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {timeAgo(ticket.created_at)}
                </td>
              </tr>
            ))}
            {(tickets ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No tickets{filter ? ` with status “${filter}”` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
