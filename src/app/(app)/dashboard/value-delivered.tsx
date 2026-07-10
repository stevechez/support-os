import { Clock, PiggyBank, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

// Documented assumptions, not hidden magic numbers — shown in the footnote
// so this stays a credible ROI signal instead of a marketing trick.
const AVG_HANDLE_MINUTES = 12; // typical human handle time for a routine ticket
const HOURLY_RATE_USD = 28; // blended fully-loaded support rep cost

export async function ValueDelivered({
  orgId,
  monthlyPriceUsd,
}: {
  orgId: string;
  monthlyPriceUsd: number;
}) {
  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ count: aiResolvedCount }, { count: totalResolvedCount }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("ai_resolved", true)
        .gte("resolved_at", startOfMonth.toISOString()),
      supabase
        .from("tickets")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .not("resolved_at", "is", null)
        .gte("resolved_at", startOfMonth.toISOString()),
    ]);

  const aiResolved = aiResolvedCount ?? 0;
  if (aiResolved === 0) return null; // nothing to show yet — avoid a hollow $0 card

  const hoursSaved = (aiResolved * AVG_HANDLE_MINUTES) / 60;
  const dollarsSaved = hoursSaved * HOURLY_RATE_USD;
  const roiMultiple =
    monthlyPriceUsd > 0 ? dollarsSaved / monthlyPriceUsd : null;
  const resolutionShare =
    totalResolvedCount && totalResolvedCount > 0
      ? Math.round((aiResolved / totalResolvedCount) * 100)
      : null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Value delivered this month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-1.5 text-2xl font-semibold">
              <PiggyBank className="size-5 text-primary" />
              ${Math.round(dollarsSaved).toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              estimated agent cost saved
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-2xl font-semibold">
              <Clock className="size-5 text-primary" />
              {hoursSaved.toFixed(1)}h
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              of agent time returned ({aiResolved} conversation
              {aiResolved === 1 ? "" : "s"} auto-resolved
              {resolutionShare !== null ? `, ${resolutionShare}% of resolutions` : ""})
            </p>
          </div>
          {roiMultiple !== null && (
            <div>
              <div className="text-2xl font-semibold">
                {roiMultiple.toFixed(1)}x
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                what you&apos;re paying for SupportOS this month
              </p>
            </div>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Estimate assumes {AVG_HANDLE_MINUTES} minutes of human handle time
          and a ${HOURLY_RATE_USD}/hr blended support cost per conversation
          AI fully resolved — adjust to your own numbers for an exact figure.
        </p>
      </CardContent>
    </Card>
  );
}
