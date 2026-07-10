import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { matches, type MatchableTicket } from "@/lib/automations/match";
import { describeTrigger, type Step, type Trigger } from "@/lib/automations/types";
import { getCurrentMember } from "@/lib/org";
import { matchTextRule, matchTicketRule } from "@/lib/rules/engine";
import type { BusinessRule } from "@/lib/rules/types";
import { createClient } from "@/lib/supabase/server";
import { DryRunPanel } from "./dry-run-panel";

export const metadata: Metadata = { title: "Simulate" };

const SAMPLE_SIZE = 25;

export default async function SimulatePage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const [{ data: automations }, { data: rules }, { data: tickets }, { data: agents }] =
    await Promise.all([
      supabase.from("automations").select("*").eq("organization_id", orgId),
      supabase.from("business_rules").select("*").eq("organization_id", orgId),
      supabase
        .from("tickets")
        .select("id, subject, tags, intent, priority, sentiment, messages(sender, body, is_internal)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(SAMPLE_SIZE),
      supabase
        .from("agent_configs")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("enabled", true)
        .order("name"),
    ]);

  const sample = tickets ?? [];
  const sampleSize = sample.length;

  const matchableTickets: (MatchableTicket & { id: string; subject: string })[] =
    sample.map((t) => ({
      id: t.id,
      subject: t.subject,
      priority: t.priority,
      sentiment: t.sentiment,
      tags: t.tags,
      messages: t.messages,
    }));

  const automationResults = (automations ?? []).map((a) => {
    const trigger = a.trigger as unknown as Trigger;
    const steps = a.steps as unknown as Step[];
    const count = matchableTickets.filter((t) => matches(t, trigger)).length;
    return { automation: a, trigger, steps, count };
  });

  const ruleResults = (rules ?? []).map((rule) => {
    let ticketMatches = 0;
    let replyMatches = 0;
    for (const t of sample) {
      const conversationText = t.messages.map((m) => m.body).join("\n");
      const violation = matchTicketRule(
        rule as BusinessRule,
        { tags: t.tags, intent: t.intent },
        conversationText
      );
      if (violation) {
        ticketMatches++;
        continue;
      }
      const aiReplyText = t.messages
        .filter((m) => m.sender === "ai" && !m.is_internal)
        .map((m) => m.body)
        .join("\n");
      if (aiReplyText && matchTextRule(rule as BusinessRule, aiReplyText)) {
        replyMatches++;
      }
    }
    return { rule, ticketMatches, replyMatches, total: ticketMatches + replyMatches };
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-8">
      <div>
        <h1 className="font-serif text-3xl">Simulate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Free, zero-AI-cost regression test — how would your live automations
          and rules have behaved against your last {sampleSize} tickets?
        </p>
      </div>

      {sampleSize === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FlaskConical className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No tickets yet — simulation needs history to test against.
          </p>
        </div>
      ) : (
        <>
          <DryRunPanel
            tickets={sample.map((t) => ({ id: t.id, subject: t.subject }))}
            agents={agents ?? []}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Automations ({automationResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {automationResults.map(({ automation, trigger, count }) => (
                <div
                  key={automation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {automation.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                      >
                        {automation.enabled ? "live" : "off"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      When {describeTrigger(trigger).toLowerCase()}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {count} / {sampleSize} tickets
                  </span>
                </div>
              ))}
              {automationResults.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No automations yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Business rules ({ruleResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ruleResults.map(({ rule, ticketMatches, replyMatches, total }) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {rule.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {rule.enabled ? "live" : "off"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ticketMatches} by ticket tags/intent/keywords ·{" "}
                      {replyMatches} by scanning past AI replies
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {total} / {sampleSize} tickets
                  </span>
                </div>
              ))}
              {ruleResults.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No business rules yet.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
