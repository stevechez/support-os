"use client";

import { useState } from "react";
import { Bot, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import type { Ticket } from "@/lib/database.types";
import { cn } from "@/lib/utils";

type DecisionPath = "auto" | "cited" | "escalated";

const PATH_META: Record<
  DecisionPath,
  { label: string; icon: typeof Bot; className: string }
> = {
  auto: {
    label: "AI replied",
    icon: Bot,
    className: "border-emerald-500/20 bg-emerald-500/15 text-emerald-400",
  },
  cited: {
    label: "AI replied · cited",
    icon: Sparkles,
    className: "border-sky-500/20 bg-sky-500/15 text-sky-400",
  },
  escalated: {
    label: "AI escalated",
    icon: ShieldAlert,
    className: "border-amber-500/20 bg-amber-500/15 text-amber-400",
  },
};

export function DecisionTrace({
  ticket,
}: {
  ticket: Pick<Ticket, "decision_path" | "decision_confidence" | "decision_reason">;
}) {
  const [open, setOpen] = useState(false);

  if (!ticket.decision_path) return null;

  const path = ticket.decision_path as DecisionPath;
  const meta = PATH_META[path] ?? PATH_META.escalated;
  const Icon = meta.icon;
  const confidencePct =
    ticket.decision_confidence != null
      ? Math.round(ticket.decision_confidence * 100)
      : null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        <Badge
          variant="outline"
          className={cn("cursor-pointer gap-1", meta.className)}
        >
          <Icon className="size-3" />
          {meta.label}
          {confidencePct != null && ` · ${confidencePct}%`}
        </Badge>
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="AI decision trace"
        description="Why the AI handled this ticket the way it did."
      >
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("gap-1", meta.className)}>
              <Icon className="size-3" />
              {meta.label}
            </Badge>
            {confidencePct != null && (
              <span className="text-xs text-muted-foreground">
                {confidencePct}% confidence
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            {ticket.decision_reason ?? "No reason recorded."}
          </p>
        </div>
      </Dialog>
    </>
  );
}
