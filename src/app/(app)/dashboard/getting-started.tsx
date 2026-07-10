import Link from "next/link";
import { Check, Circle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { dismissGettingStarted } from "./getting-started-actions";

type Step = {
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
};

/**
 * A short, real (not decorative) checklist shown until every new workspace
 * has actually connected a channel, added knowledge, invited a teammate,
 * and watched AI resolve something — the first-five-minutes moment that
 * turns "I signed up" into "this is obviously worth paying for."
 */
export async function GettingStarted({ orgId }: { orgId: string }) {
  const supabase = await createClient();

  const [
    { data: dismissSetting },
    { data: channelSettings },
    { count: knowledgeCount },
    { count: memberCount },
    { count: aiResolvedCount },
  ] = await Promise.all([
    supabase
      .from("settings")
      .select("value")
      .eq("organization_id", orgId)
      .eq("key", "onboarding_checklist")
      .maybeSingle(),
    supabase
      .from("settings")
      .select("key, value")
      .eq("organization_id", orgId)
      .in("key", ["chat_widget", "inbound_email", "slack"]),
    supabase
      .from("knowledge_documents")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("ai_resolved", true),
  ]);

  const dismissed =
    (dismissSetting?.value as { dismissed?: boolean } | null)?.dismissed ??
    false;

  const channelConnected = (channelSettings ?? []).some((s) => {
    const value = s.value as { enabled?: boolean; webhook_url?: string };
    return s.key === "slack" ? Boolean(value.webhook_url) : Boolean(value.enabled);
  });

  const steps: Step[] = [
    {
      label: "Connect a channel",
      description: "Turn on the chat widget, inbound email, or Slack alerts.",
      done: channelConnected,
      href: "/settings",
      cta: "Connect",
    },
    {
      label: "Add your knowledge",
      description: "Upload docs so AI replies are grounded and cited, not guessed.",
      done: (knowledgeCount ?? 0) > 0,
      href: "/knowledge",
      cta: "Upload",
    },
    {
      label: "Invite your team",
      description: "Support is calmer with more than one set of eyes on it.",
      done: (memberCount ?? 0) > 1,
      href: "/team",
      cta: "Invite",
    },
    {
      label: "Watch AI resolve a conversation",
      description:
        "Starter automations and guardrail rules are already active — see them work.",
      done: (aiResolvedCount ?? 0) > 0,
      href: "/inbox",
      cta: "Open inbox",
    },
  ];

  if (dismissed || steps.every((s) => s.done)) return null;

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Get the most out of SupportOS</CardTitle>
          <CardDescription>
            {doneCount} of {steps.length} done — a few minutes now saves you
            explaining this to your team later.
          </CardDescription>
        </div>
        <form action={dismissGettingStarted}>
          <Button
            type="submit"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground"
            title="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
          >
            <div className="flex min-w-0 items-start gap-3">
              {step.done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p
                  className={
                    step.done
                      ? "text-sm font-medium line-through text-muted-foreground"
                      : "text-sm font-medium"
                  }
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
            {!step.done && (
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={step.href}>{step.cta}</Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
