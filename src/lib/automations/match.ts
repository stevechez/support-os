import type { Trigger } from "./types";

export type MatchableTicket = {
  subject: string;
  priority: string;
  sentiment: string | null;
  tags: string[];
  messages: { sender: string; body: string }[];
};

/** Pure trigger-condition matcher (AND semantics). */
export function matches(ticket: MatchableTicket, trigger: Trigger): boolean {
  return trigger.conditions.every((c) => {
    const value = c.value.toLowerCase().trim();
    switch (c.field) {
      case "subject_contains": {
        const lastCustomerBody =
          [...ticket.messages]
            .reverse()
            .find((m) => m.sender === "customer")?.body ?? "";
        return (
          ticket.subject.toLowerCase().includes(value) ||
          lastCustomerBody.toLowerCase().includes(value)
        );
      }
      case "priority_is":
        return ticket.priority === value;
      case "sentiment_is":
        return ticket.sentiment === value;
      case "tag_is":
        return ticket.tags.map((t) => t.toLowerCase()).includes(value);
      default:
        return false;
    }
  });
}
