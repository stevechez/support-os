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
];
