"use client";

import { useEffect, useOptimistic, useRef } from "react";
import { Bot, Lock } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Message } from "@/lib/database.types";
import { initials, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ReplyForm } from "./reply-form";

export type MessageRow = Message & {
  member: { id: string; display_name: string | null } | null;
};

export function ThreadMessages({
  ticketId,
  messages,
  customerName,
  memberName,
}: {
  ticketId: string;
  messages: MessageRow[];
  customerName: string;
  memberName: string;
}) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (current, next: MessageRow) => [...current, next]
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = optimisticMessages.length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [count, ticketId]);

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {optimisticMessages.map((message) => {
          const fromCustomer = message.sender === "customer";
          const isAi = message.sender === "ai";
          const pending = message.id.startsWith("optimistic-");
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
                !fromCustomer && "flex-row-reverse",
                pending && "opacity-60"
              )}
            >
              <Avatar className="size-8 shrink-0">
                <AvatarFallback
                  className={cn(isAi && "bg-primary text-primary-foreground")}
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
                  <span>{pending ? "sending…" : timeAgo(message.created_at)}</span>
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
                    "inline-block whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-left text-sm leading-relaxed",
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
        <div ref={bottomRef} />
      </div>

      <ReplyForm
        ticketId={ticketId}
        onOptimisticSend={(body, isInternal) =>
          addOptimistic({
            id: `optimistic-${Date.now()}`,
            organization_id: "",
            ticket_id: ticketId,
            sender: "agent",
            member_id: null,
            body,
            sentiment: null,
            is_internal: isInternal,
            created_at: new Date().toISOString(),
            member: { id: "self", display_name: memberName },
          })
        }
      />
    </>
  );
}
