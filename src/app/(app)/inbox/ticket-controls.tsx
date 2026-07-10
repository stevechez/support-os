"use client";

import { useTransition } from "react";
import { Check, ChevronDown, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Ticket, TicketPriority, TicketStatus } from "@/lib/database.types";
import {
  PRIORITIES,
  STATUSES,
  priorityStyles,
  statusStyles,
} from "@/lib/ticket-ui";
import { cn } from "@/lib/utils";
import {
  assignTicket,
  updateTicketPriority,
  updateTicketStatus,
} from "../tickets/actions";
import { DecisionTrace } from "./decision-trace";

export function TicketControls({
  ticket,
  members,
}: {
  ticket: Ticket;
  members: { id: string; display_name: string | null }[];
}) {
  const [, startTransition] = useTransition();

  const assignee = members.find((m) => m.id === ticket.assignee_id);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <DecisionTrace ticket={ticket} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button">
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer gap-1 capitalize",
                statusStyles[ticket.status]
              )}
            >
              {ticket.status} <ChevronDown className="size-3" />
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Status</DropdownMenuLabel>
          {STATUSES.map((status) => (
            <DropdownMenuItem
              key={status}
              className="capitalize"
              onSelect={() =>
                startTransition(() =>
                  updateTicketStatus(ticket.id, status as TicketStatus)
                )
              }
            >
              {status === ticket.status && <Check />}
              {status}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button">
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer gap-1 capitalize",
                priorityStyles[ticket.priority]
              )}
            >
              {ticket.priority} <ChevronDown className="size-3" />
            </Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Priority</DropdownMenuLabel>
          {PRIORITIES.map((priority) => (
            <DropdownMenuItem
              key={priority}
              className="capitalize"
              onSelect={() =>
                startTransition(() =>
                  updateTicketPriority(ticket.id, priority as TicketPriority)
                )
              }
            >
              {priority === ticket.priority && <Check />}
              {priority}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
            <UserRound className="size-3.5" />
            {assignee?.display_name ?? "Unassigned"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
          {members.map((member) => (
            <DropdownMenuItem
              key={member.id}
              onSelect={() =>
                startTransition(() => assignTicket(ticket.id, member.id))
              }
            >
              {member.id === ticket.assignee_id && <Check />}
              {member.display_name ?? "Member"}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              startTransition(() => assignTicket(ticket.id, null))
            }
          >
            Unassign
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
