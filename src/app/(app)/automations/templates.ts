import type { Step, Trigger } from "@/lib/automations/types";

export type Template = {
  id: string;
  name: string;
  description: string;
  trigger: Trigger;
  steps: Step[];
};

export const TEMPLATES: Template[] = [
  {
    id: "refund-review",
    name: "Refund request review",
    description:
      "Classify refund requests, draft a response, and notify the team for human review.",
    trigger: {
      event: "ticket.created",
      conditions: [{ field: "subject_contains", value: "refund" }],
    },
    steps: [
      { type: "ai_classify" },
      { type: "add_tag", tag: "billing" },
      { type: "ai_draft_reply" },
      {
        type: "notify",
        message: "Refund request — AI draft ready for review.",
      },
    ],
  },
  {
    id: "angry-customer",
    name: "Angry customer escalation",
    description:
      "When sentiment is negative, escalate and alert the team immediately.",
    trigger: {
      event: "message.created",
      conditions: [{ field: "sentiment_is", value: "negative" }],
    },
    steps: [
      { type: "escalate" },
      {
        type: "notify",
        message: "Negative sentiment detected — manager attention needed.",
      },
      { type: "ai_draft_reply" },
    ],
  },
  {
    id: "stale-ticket-escalation",
    name: "Escalate stale tickets",
    description:
      "If a ticket sits open with no new activity for 24 hours, escalate it and notify the team.",
    trigger: { event: "ticket.stale", conditions: [], staleAfterHours: 24 },
    steps: [
      { type: "escalate" },
      {
        type: "slack_notify",
        message: "⏰ Ticket has been inactive for 24h and needs attention.",
      },
    ],
  },
  {
    id: "password-reset",
    name: "Password reset auto-answer",
    description:
      "Answer password reset requests automatically and resolve the ticket.",
    trigger: {
      event: "ticket.created",
      conditions: [{ field: "subject_contains", value: "password" }],
    },
    steps: [
      { type: "add_tag", tag: "technical" },
      { type: "ai_auto_reply", resolve: true },
    ],
  },
  {
    id: "ai-requested-refund",
    name: "AI-requested refund",
    description:
      "For refund requests tied to a real order, AI extracts the amount and reason and queues it in Actions for your approval — no autonomous refunds.",
    trigger: {
      event: "ticket.created",
      conditions: [{ field: "subject_contains", value: "refund" }],
    },
    steps: [
      { type: "ai_classify" },
      { type: "add_tag", tag: "billing" },
      { type: "request_action", action: "refund" },
      {
        type: "notify",
        message: "Refund requested by AI — review it in Actions.",
      },
    ],
  },
];
