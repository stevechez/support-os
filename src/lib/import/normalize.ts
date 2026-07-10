import type { TicketPriority, TicketStatus } from "@/lib/database.types";

export type ImportSource = "zendesk" | "intercom" | "generic";

export type NormalizedTicket = {
  externalId?: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerEmail: string;
  customerName?: string;
  body: string;
  createdAt?: string;
};

export type ImportRowError = { row: number; reason: string };

export type NormalizeResult = {
  tickets: NormalizedTicket[];
  errors: ImportRowError[];
};

/** Look up the first present column from a list of accepted aliases. */
function pick(record: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    const value = record[alias];
    if (value) return value;
  }
  return "";
}

const STATUS_ALIASES: Record<string, TicketStatus> = {
  new: "open",
  open: "open",
  pending: "waiting",
  hold: "waiting",
  snoozed: "waiting",
  waiting: "waiting",
  solved: "resolved",
  resolved: "resolved",
  closed: "closed",
};

const PRIORITY_ALIASES: Record<string, TicketPriority> = {
  low: "low",
  normal: "medium",
  medium: "medium",
  high: "high",
  urgent: "urgent",
};

function normalizeStatus(raw: string): TicketStatus {
  return STATUS_ALIASES[raw.trim().toLowerCase()] ?? "open";
}

function normalizePriority(raw: string): TicketPriority {
  return PRIORITY_ALIASES[raw.trim().toLowerCase()] ?? "medium";
}

function normalizeDate(raw: string): string | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Column aliases cover the common real-world export variants for each
 * platform — Zendesk and Intercom CSV exports vary per-installation
 * (custom fields, renamed columns), so we match loosely rather than
 * requiring one exact schema.
 */
const COLUMN_ALIASES: Record<
  ImportSource,
  Record<keyof Omit<NormalizedTicket, "status" | "priority">, string[]>
> = {
  zendesk: {
    externalId: ["ticket id", "id", "#"],
    subject: ["subject", "ticket subject"],
    customerEmail: ["requester email", "email", "requester"],
    customerName: ["requester", "requester name", "name"],
    body: ["description", "first comment", "comment", "body"],
    createdAt: ["created at", "created", "date"],
  },
  intercom: {
    externalId: ["conversation_id", "conversation id", "id"],
    subject: ["subject", "title", "source.subject"],
    customerEmail: ["user_email", "email", "user.email", "contact_email"],
    customerName: ["user_name", "name", "user.name", "contact_name"],
    body: ["source.body", "body", "message", "first_message", "conversation_message.body"],
    createdAt: ["created_at", "created", "date"],
  },
  generic: {
    externalId: ["id", "ticket id", "#"],
    subject: ["subject", "title"],
    customerEmail: ["email", "customer email", "requester email"],
    customerName: ["name", "customer name", "requester name"],
    body: ["body", "description", "message"],
    createdAt: ["created at", "created", "date"],
  },
};

export function normalizeImportRows(
  records: Record<string, string>[],
  source: ImportSource
): NormalizeResult {
  const aliases = COLUMN_ALIASES[source];
  const tickets: NormalizedTicket[] = [];
  const errors: ImportRowError[] = [];

  records.forEach((record, i) => {
    const rowNum = i + 2; // +1 for header row, +1 for 1-indexing
    const subject = pick(record, aliases.subject);
    const customerEmail = pick(record, aliases.customerEmail);

    if (!customerEmail || !/\S+@\S+\.\S+/.test(customerEmail)) {
      errors.push({ row: rowNum, reason: "Missing or invalid customer email" });
      return;
    }
    if (!subject) {
      errors.push({ row: rowNum, reason: "Missing subject" });
      return;
    }

    const rawStatus = pick(record, ["status", "state"]);
    const rawPriority = pick(record, ["priority"]);

    tickets.push({
      externalId: pick(record, aliases.externalId) || undefined,
      subject: subject.slice(0, 500),
      status: normalizeStatus(rawStatus),
      priority: normalizePriority(rawPriority),
      customerEmail: customerEmail.toLowerCase(),
      customerName: pick(record, aliases.customerName) || undefined,
      body: pick(record, aliases.body) || subject,
      createdAt: normalizeDate(pick(record, aliases.createdAt)),
    });
  });

  return { tickets, errors };
}
