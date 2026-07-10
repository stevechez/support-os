"use client";

import { useTransition } from "react";
import { Shield, ShieldOff, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VersionHistoryButton } from "@/components/version-history-button";
import type { BusinessRule } from "@/lib/rules/types";
import { cn } from "@/lib/utils";
import { deleteRule, toggleRule } from "./actions";
import { EditRuleDialog } from "./edit-rule-dialog";

export function RuleRow({ rule }: { rule: BusinessRule }) {
  const [pending, startTransition] = useTransition();

  const matchers = [
    ...rule.match_tags.map((t) => `tag: ${t}`),
    ...rule.match_intents.map((i) => `intent: ${i}`),
    ...rule.match_keywords.map((k) => `keyword: ${k}`),
    ...(rule.match_regex ? [`pattern: ${rule.match_regex}`] : []),
  ];

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-opacity",
        !rule.enabled && "opacity-60"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{rule.name}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              rule.enabled
                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {rule.enabled ? "On" : "Off"}
          </Badge>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {rule.action === "escalate" ? "Escalates to human" : "Requires approval"}
          </Badge>
        </div>
        {rule.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {rule.description}
          </p>
        )}
        {matchers.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {matchers.map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px] font-normal">
                {m}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <EditRuleDialog rule={rule} />
        <VersionHistoryButton
          entityType="business_rule"
          entityId={rule.id}
          revalidatePath="/rules"
        />
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          title={rule.enabled ? "Turn off" : "Turn on"}
          onClick={() =>
            startTransition(() => toggleRule(rule.id, !rule.enabled))
          }
        >
          {rule.enabled ? (
            <Shield className="size-4 text-emerald-400" />
          ) : (
            <ShieldOff className="size-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          title="Delete"
          onClick={() => startTransition(() => deleteRule(rule.id))}
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
