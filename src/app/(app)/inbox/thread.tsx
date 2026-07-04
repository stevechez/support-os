import { Bot, Lock } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Customer, Message, Ticket } from "@/lib/database.types";
import { initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReplyForm } from "./reply-form";
import { TicketControls } from "./ticket-controls";

type MessageRow = Message & {
  member: { id: string; display_name: string | null } | null;
};

export function Thread({
  ticket,
  messages,
  members,
}: {
  ticket: Ticket & { customer: Pick<Customer, "id" | "name" | "email"> | null };
  messages: MessageRow[];
  members: { id: string; display_name: string | null }[];
}) {
  const customerName =
    ticket.customer?.name ?? ticket.customer?.email ?? "Customer";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{ticket.subject}</h2>
          <p className="truncate text-xs text-muted-foreground">
            {customerName}
            {ticket.tags.length > 0 && ` · ${ticket.tags.join(", ")}`}
          </p>
        </div>
        <TicketControls ticket={ticket} members={members} />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => {
          const fromCustomer = message.sender === "customer";
          const isAi = message.sender === "ai";
          const name = fromCustomer
            ? customerName
            : isAi
              ? "AI Agent"
              : message.sender === "system"
                ? "System"
                : (message.member?.display_name ?? "Agent");

          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                !fromCustomer && "flex-row-reverse"
              )}
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback
                  className={cn(
                    isAi && "bg-primary text-primary-foreground"
                  )}
                >
                  {isAi ? <Bot className="size-4" /> : initials(name)}
                </AvatarFallback>
              </Avatar>

              <div
                className={cn(
                  "max-w-[75%] space-y-1",
                  !fromCustomer && "items-end text-right"
                )}
              >
                <div
                  className={cn(
                    "flex items-baseline gap-2 text-xs text-muted-foreground",
                    !fromCustomer && "flex-row-reverse"
                  )}
                >
                  <span className="font-medium text-foreground">{name}</span>
                  <span>{timeAgo(message.created_at)}</span>
                  {message.is_internal && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-400"
                    >
                      <Lock className="size-2.5" /> Internal
                    </Badge>
                  )}
                </div>
                <div
                  className={cn(
                    "inline-block rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed",
                    fromCustomer
                      ? "rounded-tl-sm bg-muted"
                      : message.is_internal
                        ? "rounded-tr-sm border border-amber-500/20 bg-amber-500/5"
                        : "rounded-tr-sm bg-primary text-primary-foreground"
                  )}
                >
                  {message.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ReplyForm ticketId={ticket.id} />
    </div>
  );
}
