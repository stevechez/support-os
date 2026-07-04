import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Mail, Phone } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { initials, timeAgo } from "@/lib/format";
import { priorityStyles, statusStyles } from "@/lib/ticket-ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*, tickets(*)")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const who = customer.name ?? customer.email ?? "Customer";
  const tickets = [...customer.tickets].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Customers
      </Link>

      <div className="flex items-start gap-4">
        <Avatar className="size-14">
          <AvatarFallback className="text-lg">{initials(who)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-3xl">{who}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {customer.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {customer.email}
              </span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" /> {customer.phone}
              </span>
            )}
            {customer.company && (
              <span className="flex items-center gap-1.5">
                <Building2 className="size-3.5" /> {customer.company}
              </span>
            )}
          </div>
          {customer.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {customer.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Lifetime value</p>
          <p className="text-2xl font-semibold">
            {customer.lifetime_value
              ? `$${Number(customer.lifetime_value).toLocaleString()}`
              : "—"}
          </p>
        </div>
      </div>

      {customer.ai_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {customer.ai_summary}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Conversations ({tickets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/inbox?t=${ticket.id}`}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
            >
              <span className="min-w-0 truncate text-sm">
                {ticket.subject}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize text-[10px]",
                    priorityStyles[ticket.priority]
                  )}
                >
                  {ticket.priority}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize text-[10px]",
                    statusStyles[ticket.status]
                  )}
                >
                  {ticket.status}
                </Badge>
                <span className="w-10 text-right text-xs text-muted-foreground">
                  {timeAgo(ticket.created_at)}
                </span>
              </span>
            </Link>
          ))}
          {tickets.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No conversations yet.
            </p>
          )}
        </CardContent>
      </Card>

      {customer.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {customer.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
