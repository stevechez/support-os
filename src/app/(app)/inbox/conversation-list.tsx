import Link from "next/link";
import { Bot, ShieldAlert, Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Customer, Message, Ticket } from "@/lib/database.types";
import { initials, timeAgo } from "@/lib/format";
import { priorityStyles, sentimentDot } from "@/lib/ticket-ui";
import { cn } from "@/lib/utils";

const DECISION_ICON = {
  auto: { icon: Bot, className: "text-emerald-400" },
  cited: { icon: Sparkles, className: "text-sky-400" },
  escalated: { icon: ShieldAlert, className: "text-amber-400" },
} as const;

type TicketRow = Ticket & {
  customer: Pick<Customer, "id" | "name" | "email"> | null;
  messages: Pick<Message, "body" | "created_at" | "sender">[];
};

export function ConversationList({
  tickets,
  selectedId,
  mobileHidden = false,
}: {
  tickets: TicketRow[];
  selectedId?: string;
  mobileHidden?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-full shrink-0 flex-col border-r lg:flex lg:w-80",
        mobileHidden ? "hidden" : "flex"
      )}
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <span className="text-sm font-semibold">Conversations</span>
        <span className="text-xs text-muted-foreground">
          {tickets.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tickets.map((ticket) => {
          const preview = ticket.messages[0];
          const who = ticket.customer?.name ?? ticket.customer?.email ?? "—";
          return (
            <Link
              key={ticket.id}
              href={`/inbox?t=${ticket.id}`}
              className={cn(
                "flex gap-3 border-b px-4 py-3 transition-colors",
                ticket.id === selectedId
                  ? "bg-accent"
                  : "hover:bg-accent/40"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="size-9">
                  <AvatarFallback>{initials(who)}</AvatarFallback>
                </Avatar>
                {ticket.sentiment && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-background",
                      sentimentDot[ticket.sentiment]
                    )}
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{who}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(preview?.created_at ?? ticket.created_at)}
                  </span>
                </div>
                <p className="truncate text-sm">{ticket.subject}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-1.5 py-0 text-[10px] capitalize",
                      priorityStyles[ticket.priority]
                    )}
                  >
                    {ticket.priority}
                  </Badge>
                  {ticket.channel !== "web" && (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px] capitalize"
                    >
                      {ticket.channel}
                    </Badge>
                  )}
                  {ticket.decision_path &&
                    (() => {
                      const meta =
                        DECISION_ICON[
                          ticket.decision_path as keyof typeof DECISION_ICON
                        ];
                      if (!meta) return null;
                      const DecisionIcon = meta.icon;
                      return (
                        <DecisionIcon
                          className={cn("size-3 shrink-0", meta.className)}
                        />
                      );
                    })()}
                  <p className="truncate text-xs text-muted-foreground">
                    {preview?.body ?? "No messages yet"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
