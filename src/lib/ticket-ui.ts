import type { Sentiment, TicketPriority, TicketStatus } from "@/lib/database.types";

export const STATUSES: TicketStatus[] = [
  "open",
  "waiting",
  "resolved",
  "closed",
];

export const PRIORITIES: TicketPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const statusStyles: Record<TicketStatus, string> = {
  open: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  waiting: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  closed: "bg-muted text-muted-foreground border-transparent",
};

export const priorityStyles: Record<TicketPriority, string> = {
  low: "bg-muted text-muted-foreground border-transparent",
  medium: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
};

export const sentimentDot: Record<Sentiment, string> = {
  positive: "bg-emerald-400",
  neutral: "bg-zinc-400",
  negative: "bg-red-400",
};
