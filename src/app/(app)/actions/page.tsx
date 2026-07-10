import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wand2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { ActionRow, type ActionRequestRow } from "./action-row";

export const metadata: Metadata = { title: "Actions" };

type RawRow = {
  id: string;
  action_type: string;
  params: unknown;
  reasoning: string | null;
  status: string;
  created_at: string;
  ticket_id: string;
  ticket: { subject: string; customer: { name: string | null; email: string | null } | null } | null;
  order: { order_number: string } | null;
};

function toRow(raw: RawRow): ActionRequestRow {
  return {
    id: raw.id,
    action_type: raw.action_type,
    params: (raw.params as Record<string, unknown>) ?? {},
    reasoning: raw.reasoning,
    status: raw.status,
    created_at: raw.created_at,
    ticket_id: raw.ticket_id,
    ticket_subject: raw.ticket?.subject ?? "Ticket",
    order_number: raw.order?.order_number ?? null,
    customer_name: raw.ticket?.customer?.name ?? null,
    customer_email: raw.ticket?.customer?.email ?? null,
  };
}

export default async function ActionsPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const { data } = await supabase
    .from("action_requests")
    .select(
      "id, action_type, params, reasoning, status, created_at, ticket_id, ticket:tickets(subject, customer:customers(name, email)), order:orders(order_number)"
    )
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = ((data ?? []) as unknown as RawRow[]).map(toRow);
  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="font-serif text-3xl">Actions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real account actions AI wants to take — refunds, cancellations,
          shipping updates — grounded in real orders and always held for
          your approval before anything actually happens.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Wand2 className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No pending actions. When AI encounters a request it can&apos;t
            fully resolve by talking alone — a refund, a cancellation — it
            will show up here for your review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Pending your review ({pending.length})
          </h2>
          {pending.map((r) => (
            <ActionRow key={r.id} request={r} />
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Recent decisions
          </h2>
          {decided.slice(0, 20).map((r) => (
            <ActionRow key={r.id} request={r} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How this works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Add an &quot;AI: request account action&quot; step to an
          automation. AI extracts what it can from the conversation —
          grounded in a real matched order, never invented — and posts it
          here instead of acting on its own. Approving sends a signed
          webhook to your configured fulfillment system (set it up in
          Settings → Integrations); nothing is executed by SupportOS
          itself.
        </CardContent>
      </Card>
    </div>
  );
}
