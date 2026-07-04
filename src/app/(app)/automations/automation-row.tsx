"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowDown, Trash2, Zap, ZapOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  describeStep,
  describeTrigger,
  type Step,
  type Trigger,
} from "@/lib/automations/types";
import { cn } from "@/lib/utils";
import { deleteAutomation, toggleAutomation } from "./actions";

export function AutomationRow({
  automation,
}: {
  automation: {
    id: string;
    name: string;
    enabled: boolean;
    trigger: Trigger;
    steps: Step[];
  };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4 transition-opacity",
        !automation.enabled && "opacity-60"
      )}
    >
      <Link
        href={`/automations/${automation.id}`}
        className="min-w-0 flex-1"
      >
        <div className="flex items-center gap-2">
          <span className="truncate font-medium hover:underline">
            {automation.name}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              automation.enabled
                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {automation.enabled ? "On" : "Off"}
          </Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          When {describeTrigger(automation.trigger).toLowerCase()}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {automation.steps.map((step, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ArrowDown className="size-3 -rotate-90 text-muted-foreground/50" />
              )}
              <Badge variant="secondary" className="text-[10px] font-normal">
                {describeStep(step)}
              </Badge>
            </span>
          ))}
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          title={automation.enabled ? "Turn off" : "Turn on"}
          onClick={() =>
            startTransition(() =>
              toggleAutomation(automation.id, !automation.enabled)
            )
          }
        >
          {automation.enabled ? (
            <Zap className="size-4 text-emerald-400" />
          ) : (
            <ZapOff className="size-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          title="Delete"
          onClick={() =>
            startTransition(() => deleteAutomation(automation.id))
          }
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
