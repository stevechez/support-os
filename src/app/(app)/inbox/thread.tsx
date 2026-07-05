import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { Customer, Ticket } from "@/lib/database.types";
import { ThreadMessages, type MessageRow } from "./thread-messages";
import { TicketControls } from "./ticket-controls";

export function Thread({
  ticket,
  messages,
  members,
  memberName,
}: {
  ticket: Ticket & { customer: Pick<Customer, "id" | "name" | "email"> | null };
  messages: MessageRow[];
  members: { id: string; display_name: string | null }[];
  memberName: string;
}) {
  const customerName =
    ticket.customer?.name ?? ticket.customer?.email ?? "Customer";

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/inbox"
            className="shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">
              {ticket.subject}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {customerName}
              {ticket.tags.length > 0 && ` · ${ticket.tags.join(", ")}`}
              {ticket.csat_rating != null && (
                <span className="text-amber-400">
                  {" "}
                  · ★ {ticket.csat_rating}/5
                </span>
              )}
            </p>
          </div>
        </div>
        <TicketControls ticket={ticket} members={members} />
      </div>

      <ThreadMessages
        ticketId={ticket.id}
        messages={messages}
        customerName={customerName}
        memberName={memberName}
      />
    </div>
  );
}
