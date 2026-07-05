import { ScrollText } from "lucide-react";

import type { Json } from "@/lib/database.types";
import { timeAgo } from "@/lib/format";

type Entry = {
  id: string;
  action: string;
  actor_type: string;
  metadata: Json;
  created_at: string;
  member: { display_name: string | null } | null;
};

function describe(entry: Entry): string {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>;
  const actor =
    entry.member?.display_name ??
    (entry.actor_type === "system" ? "System" : "Someone");

  switch (entry.action) {
    case "member.invited":
      return `${actor} invited ${meta.email} as ${meta.role}`;
    case "member.invite_revoked":
      return `${actor} revoked the invitation for ${meta.email}`;
    case "member.joined":
      return `${meta.email} joined the workspace`;
    case "member.role_changed":
      return `${actor} changed ${meta.member}'s role to ${meta.role}`;
    case "member.removed":
      return `${actor} removed ${meta.member}`;
    case "ticket.escalated":
      return `${actor} escalated a ticket`;
    case "automation.executed":
      return `Automation “${meta.automation}” ran (${(meta.results as string[])?.length ?? 0} steps)`;
    case "workspace.created":
      return "Workspace created";
    case "billing.updated":
      return `Billing changed to ${meta.plan} (${meta.status})`;
    default:
      return `${actor} · ${entry.action}`;
  }
}

export function AuditLog({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <ScrollText className="size-4" /> Audit log
      </h2>
      <div className="overflow-x-auto rounded-xl border">
        {entries.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No activity yet.
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5 text-sm last:border-0"
            >
              <span className="min-w-0 truncate">{describe(entry)}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(entry.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
