"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { openBillingPortal, startCheckout } from "./billing-actions";

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      {!unlimited && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-emerald-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function BillingSettings({
  planLabel,
  planPrice,
  isPro,
  status,
  periodEnd,
  usage,
  stripeConfigured,
  canManage,
}: {
  planLabel: string;
  planPrice: string;
  isPro: boolean;
  status?: string;
  periodEnd?: string;
  usage: {
    aiActions: { used: number; limit: number };
    knowledgeDocs: { used: number; limit: number };
    members: { used: number; limit: number };
  };
  stripeConfigured: boolean;
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: (origin: string) => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn(window.location.origin);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="size-4" />
            <div>
              <CardTitle className="text-base">Billing</CardTitle>
              <CardDescription>
                {isPro
                  ? `Pro plan${periodEnd ? ` · renews ${new Date(periodEnd).toLocaleDateString()}` : ""}`
                  : "You're on the Free plan."}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              isPro
                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground"
            }
          >
            {planLabel} · {planPrice}
            {status && status !== "active" && ` · ${status}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <UsageBar
            label="AI actions this month"
            used={usage.aiActions.used}
            limit={usage.aiActions.limit}
          />
          <UsageBar
            label="Knowledge documents"
            used={usage.knowledgeDocs.used}
            limit={usage.knowledgeDocs.limit}
          />
          <UsageBar
            label="Team seats"
            used={usage.members.used}
            limit={usage.members.limit}
          />
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {isPro ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending || !stripeConfigured}
                onClick={() => run(openBillingPortal)}
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Manage subscription
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={pending || !stripeConfigured}
                onClick={() => run(startCheckout)}
              >
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Upgrade to Pro
              </Button>
            )}
            {!stripeConfigured && (
              <span className="text-xs text-muted-foreground">
                Set STRIPE_SECRET_KEY, STRIPE_PRICE_PRO, and
                STRIPE_WEBHOOK_SECRET to enable.
              </span>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
