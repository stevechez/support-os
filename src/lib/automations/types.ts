import type { TicketPriority, TicketStatus } from "@/lib/database.types";

export type TriggerEvent = "ticket.created" | "message.created" | "ticket.stale";

export type ConditionField =
  | "subject_contains"
  | "priority_is"
  | "sentiment_is"
  | "tag_is";

export type Condition = { field: ConditionField; value: string };

export type Trigger = {
  event: TriggerEvent;
  conditions: Condition[];
  /** Only used by the "ticket.stale" event — hours of inactivity before it fires. */
  staleAfterHours?: number;
};

export type Step =
  | { type: "ai_classify" }
  | { type: "ai_draft_reply"; agentId?: string; experimentId?: string }
  | { type: "ai_auto_reply"; resolve?: boolean; agentId?: string; experimentId?: string }
  | { type: "set_priority"; priority: TicketPriority }
  | { type: "set_status"; status: TicketStatus }
  | { type: "add_tag"; tag: string }
  | { type: "assign"; memberId: string }
  | { type: "notify"; message: string }
  | { type: "slack_notify"; message: string }
  | { type: "escalate" }
  | { type: "create_appointment"; title: string; offsetHours?: number }
  | { type: "create_lead" }
  | { type: "send_sms"; message: string }
  | { type: "update_customer"; tag?: string; note?: string }
  | {
      type: "request_action";
      action: "refund" | "cancel_order" | "update_shipping_address";
    };

export type StepType = Step["type"];

export const TRIGGER_EVENTS: { id: TriggerEvent; label: string }[] = [
  { id: "ticket.created", label: "Ticket created" },
  { id: "message.created", label: "Customer message received" },
  { id: "ticket.stale", label: "Ticket inactive for…" },
];

export const DEFAULT_STALE_HOURS = 24;

export const CONDITION_FIELDS: { id: ConditionField; label: string }[] = [
  { id: "subject_contains", label: "Subject contains" },
  { id: "priority_is", label: "Priority is" },
  { id: "sentiment_is", label: "Sentiment is" },
  { id: "tag_is", label: "Has tag" },
];

export const STEP_TYPES: {
  id: StepType;
  label: string;
  description: string;
  needsAi: boolean;
}[] = [
  {
    id: "ai_classify",
    label: "AI: classify ticket",
    description: "Set sentiment, intent, priority, and tags",
    needsAi: true,
  },
  {
    id: "ai_draft_reply",
    label: "AI: draft reply for human review",
    description: "Posts the draft as an internal note",
    needsAi: true,
  },
  {
    id: "ai_auto_reply",
    label: "AI: reply to customer",
    description: "Sends an AI reply directly, optionally resolving",
    needsAi: true,
  },
  {
    id: "set_priority",
    label: "Set priority",
    description: "Change the ticket priority",
    needsAi: false,
  },
  {
    id: "set_status",
    label: "Set status",
    description: "Change the ticket status",
    needsAi: false,
  },
  {
    id: "add_tag",
    label: "Add tag",
    description: "Attach a tag to the ticket",
    needsAi: false,
  },
  {
    id: "assign",
    label: "Assign to member",
    description: "Route the ticket to a teammate",
    needsAi: false,
  },
  {
    id: "notify",
    label: "Notify team",
    description: "Post an internal note",
    needsAi: false,
  },
  {
    id: "slack_notify",
    label: "Send to Slack",
    description: "Post to your Slack channel (set the webhook in Settings)",
    needsAi: false,
  },
  {
    id: "escalate",
    label: "Escalate",
    description: "Set urgent priority and flag the ticket",
    needsAi: false,
  },
  {
    id: "create_appointment",
    label: "Schedule appointment",
    description: "Creates an appointment record for the customer",
    needsAi: false,
  },
  {
    id: "create_lead",
    label: "Create CRM lead",
    description: "Creates a lead record from this conversation",
    needsAi: false,
  },
  {
    id: "send_sms",
    label: "Send SMS",
    description: "Logs an SMS to the customer (simulated until a provider is connected)",
    needsAi: false,
  },
  {
    id: "update_customer",
    label: "Update customer record",
    description: "Adds a tag and/or note to the customer profile",
    needsAi: false,
  },
  {
    id: "request_action",
    label: "AI: request account action",
    description:
      "Refund, cancel order, or update shipping — extracted from the conversation, grounded in a real matched order, always held for human approval",
    needsAi: true,
  },
];

export function defaultStep(type: StepType): Step {
  switch (type) {
    case "set_priority":
      return { type, priority: "high" };
    case "set_status":
      return { type, status: "waiting" };
    case "add_tag":
      return { type, tag: "" };
    case "assign":
      return { type, memberId: "" };
    case "notify":
    case "slack_notify":
      return { type, message: "" };
    case "ai_auto_reply":
      return { type, resolve: false };
    case "create_appointment":
      return { type, title: "Follow-up call", offsetHours: 24 };
    case "send_sms":
      return { type, message: "" };
    case "update_customer":
      return { type, tag: "", note: "" };
    case "request_action":
      return { type, action: "refund" };
    default:
      return { type } as Step;
  }
}

export function describeTrigger(trigger: Trigger): string {
  const event =
    trigger.event === "ticket.stale"
      ? `Ticket inactive for ${trigger.staleAfterHours ?? DEFAULT_STALE_HOURS}h`
      : (TRIGGER_EVENTS.find((e) => e.id === trigger.event)?.label ??
        trigger.event);
  if (trigger.conditions.length === 0) return event;
  const conds = trigger.conditions
    .map((c) => {
      const field =
        CONDITION_FIELDS.find((f) => f.id === c.field)?.label ?? c.field;
      return `${field.toLowerCase()} “${c.value}”`;
    })
    .join(" and ");
  return `${event} · ${conds}`;
}

export function describeStep(step: Step): string {
  switch (step.type) {
    case "ai_classify":
      return "AI classify";
    case "ai_draft_reply":
      return "AI draft reply";
    case "ai_auto_reply":
      return step.resolve ? "AI reply & resolve" : "AI reply";
    case "set_priority":
      return `Priority → ${step.priority}`;
    case "set_status":
      return `Status → ${step.status}`;
    case "add_tag":
      return `Tag + ${step.tag || "…"}`;
    case "assign":
      return "Assign";
    case "notify":
      return "Notify team";
    case "slack_notify":
      return "Send to Slack";
    case "escalate":
      return "Escalate";
    case "create_appointment":
      return `Schedule "${step.title || "…"}"`;
    case "create_lead":
      return "Create CRM lead";
    case "send_sms":
      return "Send SMS";
    case "update_customer":
      return "Update customer record";
    case "request_action": {
      const actionLabel =
        step.action === "refund"
          ? "Refund"
          : step.action === "cancel_order"
            ? "Cancel order"
            : "Update shipping address";
      return `Request action: ${actionLabel}`;
    }
  }
}
