import type { TicketPriority, TicketStatus } from "@/lib/database.types";

export type TriggerEvent = "ticket.created" | "message.created";

export type ConditionField =
  | "subject_contains"
  | "priority_is"
  | "sentiment_is"
  | "tag_is";

export type Condition = { field: ConditionField; value: string };

export type Trigger = {
  event: TriggerEvent;
  conditions: Condition[];
};

export type Step =
  | { type: "ai_classify" }
  | { type: "ai_draft_reply" }
  | { type: "ai_auto_reply"; resolve?: boolean }
  | { type: "set_priority"; priority: TicketPriority }
  | { type: "set_status"; status: TicketStatus }
  | { type: "add_tag"; tag: string }
  | { type: "assign"; memberId: string }
  | { type: "notify"; message: string }
  | { type: "slack_notify"; message: string }
  | { type: "escalate" };

export type StepType = Step["type"];

export const TRIGGER_EVENTS: { id: TriggerEvent; label: string }[] = [
  { id: "ticket.created", label: "Ticket created" },
  { id: "message.created", label: "Customer message received" },
];

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
    default:
      return { type } as Step;
  }
}

export function describeTrigger(trigger: Trigger): string {
  const event =
    TRIGGER_EVENTS.find((e) => e.id === trigger.event)?.label ??
    trigger.event;
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
  }
}
