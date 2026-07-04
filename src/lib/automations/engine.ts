import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject, generateText } from "ai";
import { z } from "zod";

import { getOrgModel } from "@/lib/ai/org-model";
import { checkAiBudget } from "@/lib/billing/usage";
import type { Database } from "@/lib/database.types";
import type { Step, Trigger, TriggerEvent } from "./types";

type Client = SupabaseClient<Database>;

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"] & {
  customer: { name: string | null; email: string | null } | null;
  messages: Database["public"]["Tables"]["messages"]["Row"][];
};

async function fetchTicket(
  supabase: Client,
  ticketId: string
): Promise<TicketRow | null> {
  const { data } = await supabase
    .from("tickets")
    .select("*, customer:customers(name, email), messages(*)")
    .eq("id", ticketId)
    .maybeSingle();
  return data as TicketRow | null;
}

function matches(ticket: TicketRow, trigger: Trigger): boolean {
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

function transcript(ticket: TicketRow): string {
  const messages = [...ticket.messages]
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((m) => {
      const who =
        m.sender === "customer"
          ? (ticket.customer?.name ?? "Customer")
          : m.sender === "ai"
            ? "AI Agent"
            : "Support Agent";
      return `${who}${m.is_internal ? " (internal)" : ""}: ${m.body}`;
    })
    .join("\n\n");
  return `Subject: ${ticket.subject}\nStatus: ${ticket.status} · Priority: ${ticket.priority}\n\n${messages}`;
}

async function generateReply(
  supabase: Client,
  orgId: string,
  ticket: TicketRow
): Promise<string> {
  const resolved = await getOrgModel(orgId);
  if (!resolved) throw new Error("No AI provider configured");

  const budget = await checkAiBudget(supabase, orgId);
  if (!budget.ok) throw new Error(budget.error);

  const { text } = await generateText({
    model: resolved.model,
    system:
      "You draft replies for customer support. Write the next reply to the customer: warm, professional, concise, specific. Never invent order numbers, policies, or commitments not present in the conversation. Output only the reply body.",
    prompt: transcript(ticket),
  });
  return text;
}

const classifySchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  intent: z.string(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  tags: z.array(
    z.enum(["product", "billing", "technical", "sales", "shipping"])
  ),
});

async function executeStep(
  supabase: Client,
  orgId: string,
  ticket: TicketRow,
  step: Step
): Promise<string> {
  switch (step.type) {
    case "ai_classify": {
      const resolved = await getOrgModel(orgId);
      if (!resolved) throw new Error("No AI provider configured");

      const budget = await checkAiBudget(supabase, orgId);
      if (!budget.ok) throw new Error(budget.error);
      const { object } = await generateObject({
        model: resolved.model,
        schema: classifySchema,
        system:
          "Classify this support conversation: sentiment, intent (one or two lowercase words), priority, category tags.",
        prompt: transcript(ticket),
      });
      await supabase
        .from("tickets")
        .update({
          sentiment: object.sentiment,
          intent: object.intent,
          priority: object.priority,
          tags: object.tags,
        })
        .eq("id", ticket.id);
      return `classified (${object.sentiment}, ${object.intent}, ${object.priority})`;
    }

    case "ai_draft_reply": {
      const draft = await generateReply(supabase, orgId, ticket);
      await supabase.from("messages").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        sender: "ai",
        body: `AI draft — review before sending:\n\n${draft}`,
        is_internal: true,
      });
      return "drafted reply (internal note)";
    }

    case "ai_auto_reply": {
      const reply = await generateReply(supabase, orgId, ticket);
      await supabase.from("messages").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        sender: "ai",
        body: reply,
      });
      const update: Database["public"]["Tables"]["tickets"]["Update"] = {
        first_response_at:
          ticket.first_response_at ?? new Date().toISOString(),
      };
      if (step.resolve) {
        update.status = "resolved";
        update.ai_resolved = true;
        update.resolved_at = new Date().toISOString();
      }
      await supabase.from("tickets").update(update).eq("id", ticket.id);
      return step.resolve ? "AI replied & resolved" : "AI replied";
    }

    case "set_priority":
      await supabase
        .from("tickets")
        .update({ priority: step.priority })
        .eq("id", ticket.id);
      return `priority → ${step.priority}`;

    case "set_status":
      await supabase
        .from("tickets")
        .update({
          status: step.status,
          resolved_at:
            step.status === "resolved" || step.status === "closed"
              ? new Date().toISOString()
              : null,
        })
        .eq("id", ticket.id);
      return `status → ${step.status}`;

    case "add_tag": {
      const tag = step.tag.trim().toLowerCase();
      if (!tag) return "skipped empty tag";
      if (!ticket.tags.includes(tag)) {
        await supabase
          .from("tickets")
          .update({ tags: [...ticket.tags, tag] })
          .eq("id", ticket.id);
      }
      return `tag + ${tag}`;
    }

    case "assign":
      if (!step.memberId) return "skipped assign (no member)";
      await supabase
        .from("tickets")
        .update({ assignee_id: step.memberId })
        .eq("id", ticket.id);
      return "assigned";

    case "notify":
      await supabase.from("messages").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        sender: "system",
        body: step.message || "Automation notification",
        is_internal: true,
      });
      return "notified team";

    case "slack_notify": {
      const { data: slackSetting } = await supabase
        .from("settings")
        .select("value")
        .eq("organization_id", orgId)
        .eq("key", "slack")
        .maybeSingle();

      const webhookUrl = (
        slackSetting?.value as { webhook_url?: string } | null
      )?.webhook_url;
      if (!webhookUrl) return "skipped Slack (no webhook configured)";

      const customer =
        ticket.customer?.name ?? ticket.customer?.email ?? "Unknown customer";
      const text = `${step.message || "Ticket update"}\n*${ticket.subject}* — ${customer} · ${ticket.priority} · ${ticket.status}`;

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(8000),
      });
      return res.ok ? "sent to Slack" : `Slack error (${res.status})`;
    }

    case "escalate":
      await supabase
        .from("tickets")
        .update({ priority: "urgent", status: "open" })
        .eq("id", ticket.id);
      await supabase.from("messages").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        sender: "system",
        body: "Escalated by automation.",
        is_internal: true,
      });
      return "escalated";
  }
}

/**
 * Run all enabled automations matching the event against a ticket.
 * Steps execute sequentially; each step sees the ticket state left
 * by the previous one. Failures are logged and don't block other
 * automations.
 */
export async function runAutomations(
  supabase: Client,
  orgId: string,
  event: TriggerEvent,
  ticketId: string
): Promise<void> {
  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("enabled", true);

  if (!automations?.length) return;

  for (const automation of automations) {
    const trigger = automation.trigger as unknown as Trigger;
    const steps = automation.steps as unknown as Step[];
    if (trigger?.event !== event || !Array.isArray(steps)) continue;

    const ticket = await fetchTicket(supabase, ticketId);
    if (!ticket || !matches(ticket, trigger)) continue;

    const results: string[] = [];
    for (const step of steps) {
      try {
        // Re-fetch so each step sees updates from the previous step.
        const fresh = await fetchTicket(supabase, ticketId);
        if (!fresh) break;
        results.push(await executeStep(supabase, orgId, fresh, step));
      } catch (e) {
        results.push(
          `failed: ${e instanceof Error ? e.message : "unknown error"}`
        );
        break;
      }
    }

    await supabase.from("activity_log").insert({
      organization_id: orgId,
      actor_type: "system",
      action: "automation.executed",
      entity_type: "ticket",
      entity_id: ticketId,
      metadata: { automation: automation.name, results },
    });
  }
}
