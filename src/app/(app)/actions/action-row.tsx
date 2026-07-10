"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ExternalLink, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { approveActionRequest, rejectActionRequest } from "./actions";

export type ActionRequestRow = {
  id: string;
  action_type: string;
  params: Record<string, unknown>;
  reasoning: string | null;
  status: string;
  created_at: string;
  ticket_id: string;
  ticket_subject: string;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  approved: "bg-blue-500/15 text-blue-400",
  sent: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-destructive/15 text-destructive",
  rejected: "bg-muted text-muted-foreground",
};

function actionLabel(type: string): string {
  switch (type) {
    case "refund":
      return "Refund";
    case "cancel_order":
      return "Cancel order";
    case "update_shipping_address":
      return "Update shipping address";
    default:
      return type;
  }
}

function formatParams(type: string, params: Record<string, unknown>): string {
  if (type === "refund") {
    return `$${Number(params.amount ?? 0).toFixed(2)} — ${params.reason ?? "no reason given"}`;
  }
  if (type === "cancel_order") {
    return String(params.reason ?? "no reason given");
  }
  if (type === "update_shipping_address") {
    return String(params.new_address ?? "—");
  }
  return JSON.stringify(params);
}

export function ActionRow({ request }: { request: ActionRequestRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isPendingDecision = request.status === "pending";

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 py-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{actionLabel(request.action_type)}</span>
            <Badge className={STATUS_STYLE[request.status] ?? ""} variant="secondary">
              {request.status}
            </Badge>
            {request.order_number && (
              <span className="text-xs text-muted-foreground">
                order #{request.order_number}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatParams(request.action_type, request.params)}
          </p>
          <p className="text-xs text-muted-foreground">
            {request.customer_name ?? request.customer_email ?? "Unknown customer"} ·{" "}
            <Link
              href={`/inbox?t=${request.ticket_id}`}
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
            >
              {request.ticket_subject} <ExternalLink className="size-3" />
            </Link>
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {isPendingDecision && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await rejectActionRequest(request.id);
                  if (res?.error) setError(res.error);
                })
              }
            >
              <X className="size-3.5" /> Reject
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const res = await approveActionRequest(request.id);
                  if (res?.error) setError(res.error);
                })
              }
            >
              <Check className="size-3.5" /> Approve
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
