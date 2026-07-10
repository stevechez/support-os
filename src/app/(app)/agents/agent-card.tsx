"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bot, Thermometer, Trash2, Zap, ZapOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VersionHistoryButton } from "@/components/version-history-button";
import type { Tables } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { deleteAgent, toggleAgent } from "./actions";

export function AgentCard({ agent }: { agent: Tables<"agent_configs"> }) {
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-xl border p-5 transition-opacity",
        !agent.enabled && "opacity-60"
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Bot className="size-5" />
      </div>

      <Link href={`/agents/${agent.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium hover:underline">
            {agent.name}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              agent.enabled
                ? "border-emerald-500/20 bg-emerald-500/15 text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {agent.enabled ? "On" : "Off"}
          </Badge>
        </div>
        {agent.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {agent.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{agent.model || "Workspace default"}</span>
          <span className="flex items-center gap-1">
            <Thermometer className="size-3" />
            {Number(agent.temperature).toFixed(1)}
          </span>
        </div>
      </Link>

      <div className="flex shrink-0 items-center">
        <VersionHistoryButton
          entityType="agent_config"
          entityId={agent.id}
          revalidatePath="/agents"
        />
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          title={agent.enabled ? "Turn off" : "Turn on"}
          onClick={() =>
            startTransition(() => toggleAgent(agent.id, !agent.enabled))
          }
        >
          {agent.enabled ? (
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
          onClick={() => startTransition(() => deleteAgent(agent.id))}
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
