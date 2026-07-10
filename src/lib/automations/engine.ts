import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject, generateText } from "ai";
import { z } from "zod";

import { referenceBlock, retrieveKnowledge, type RetrievedChunk } from "@/lib/ai/context";
import { withModelFailover } from "@/lib/ai/models";
import { getOrgModelId } from "@/lib/ai/org-model";
import { checkAiBudget } from "@/lib/billing/usage";
import { sendTicketEmail } from "@/lib/channels/email-outbound";
import { sendSms, smsOutboundConfigured } from "@/lib/channels/sms-outbound";
import { sendCsatSurvey } from "@/lib/csat";
import { updateCustomerMemory } from "@/lib/customers/memory";
import type { Database } from "@/lib/database.types";
import { decide } from "@/lib/decision/engine";
import { resolveExperimentAgent } from "@/lib/experiments/engine";
import { retrieveOrderContext } from "@/lib/orders/lookup";
import { checkDraftText, checkTicketRules, fetchEnabledRules } from "@/lib/rules/engine";
import { matches } from "./match";
import type { Step, Trigger, TriggerEvent } from "./types";

type Client = SupabaseClient<Database>;

export type TicketRow = Database["public"]["Tables"]["tickets"]["Row"] & {
  customer: { name: string | null; email: string | null; ai_summary: string | null } | null;
  messages: Database["public"]["Tables"]["messages"]["Row"][];
};

export async function fetchTicket(
  supabase: Client,
  ticketId: string
): Promise<TicketRow | null> {
  const { data } = await supabase
    .from("tickets")
    .select("*, customer:customers(name, email, ai_summary), messages(*)")
    .eq("id", ticketId)
    .maybeSingle();
  return data as TicketRow | null;
}

export function transcript(ticket: TicketRow): string {
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
  const history = ticket.customer?.ai_summary
    ? `Customer history: ${ticket.customer.ai_summary}\n`
    : "";
  return `Subject: ${ticket.subject}\nStatus: ${ticket.status} · Priority: ${ticket.priority}\n${history}\n${messages}`;
}

const DEFAULT_REPLY_SYSTEM =
  "You draft replies for customer support. Write the next reply to the customer: warm, professional, concise, specific. Never invent order numbers, policies, or commitments not present in the conversation. Output only the reply body.";

const REPLY_GUARDRAILS =
  "\n\nYou are replying on behalf of the support team. Never invent order numbers, policies, prices, or commitments not present in the conversation. Output only the reply body — no signature, no preamble.";

export function combineGrounding(
  chunks: RetrievedChunk[],
  orderBlock: string | null
): string | undefined {
  const parts = [
    chunks.length > 0 ? referenceBlock(chunks) : null,
    orderBlock,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

export async function generateReply(
  supabase: Client,
  orgId: string,
  ticket: TicketRow,
  agentId?: string,
  groundingBlock?: string
): Promise<string> {
  // Load the agent persona, if one is attached to this step.
  let agent: {
    system_prompt: string;
    model: string;
    temperature: number;
    enabled: boolean;
  } | null = null;

  if (agentId) {
    const { data } = await supabase
      .from("agent_configs")
      .select("system_prompt, model, temperature, enabled")
      .eq("id", agentId)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (data?.enabled) agent = data;
  }

  const preferredId = agent?.model ?? (await getOrgModelId(orgId));

  const budget = await checkAiBudget(supabase, orgId);
  if (!budget.ok) throw new Error(budget.error);

  const base = agent ? agent.system_prompt + REPLY_GUARDRAILS : DEFAULT_REPLY_SYSTEM;
  const system = groundingBlock
    ? `${base}\n\nGround factual claims (policies, procedures, timelines) in these knowledge base excerpts and do not contradict them:\n\n${groundingBlock}`
    : base;

  const { text } = await withModelFailover(preferredId, (model) =>
    generateText({
      model,
      system,
      temperature: agent ? Number(agent.temperature) : undefined,
      prompt: transcript(ticket),
    })
  );
  return text;
}

/** Escalate a ticket and record why — used by both business rules and low-confidence routing. */
async function escalateForReview(
  supabase: Client,
  orgId: string,
  ticket: TicketRow,
  reason: string,
  confidence: number | null,
  path: "escalated"
): Promise<void> {
  await supabase
    .from("tickets")
    .update({
      priority: "urgent",
      status: "open",
      decision_confidence: confidence,
      decision_path: path,
      decision_reason: reason,
    })
    .eq("id", ticket.id);

  await supabase.from("messages").insert({
    organization_id: orgId,
    ticket_id: ticket.id,
    sender: "system",
    body: `Escalated to a human: ${reason}`,
    is_internal: true,
  });

  await supabase.from("activity_log").insert({
    organization_id: orgId,
    actor_type: "system",
    action: "decision.escalated",
    entity_type: "ticket",
    entity_id: ticket.id,
    metadata: { reason, confidence },
  });
}

/**
 * Resolve which agent persona to use for a reply step. If the step is
 * attached to an experiment, deterministically bucket the ticket into
 * variant A/B and persist that assignment so results can be grouped
 * later — the same ticket always stays in the same variant.
 */
async function resolveStepAgent(
  supabase: Client,
  orgId: string,
  ticket: TicketRow,
  step: { agentId?: string; experimentId?: string }
): Promise<string | undefined> {
  if (!step.experimentId) return step.agentId;

  const resolved = await resolveExperimentAgent(
    supabase,
    orgId,
    step.experimentId,
    ticket.id
  );
  if (!resolved) return step.agentId;

  if (ticket.experiment_id !== step.experimentId) {
    await supabase
      .from("tickets")
      .update({
        experiment_id: step.experimentId,
        experiment_variant: resolved.variant,
      })
      .eq("id", ticket.id);
  }

  return resolved.agentId;
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
      const preferredId = await getOrgModelId(orgId);

      const budget = await checkAiBudget(supabase, orgId);
      if (!budget.ok) throw new Error(budget.error);
      const { object } = await withModelFailover(preferredId, (model) =>
        generateObject({
          model,
          schema: classifySchema,
          system:
            "Classify this support conversation: sentiment, intent (one or two lowercase words), priority, category tags.",
          prompt: transcript(ticket),
        })
      );
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
      const rules = await fetchEnabledRules(supabase, orgId, "ai_draft_reply");
      const violation = checkTicketRules(
        rules,
        { tags: ticket.tags, intent: ticket.intent },
        transcript(ticket)
      );
      if (violation) {
        await escalateForReview(
          supabase,
          orgId,
          ticket,
          `Rule "${violation.rule.name}" (${violation.reason}) — drafting skipped.`,
          0,
          "escalated"
        );
        return `blocked by rule: ${violation.rule.name}`;
      }

      const chunks = await retrieveKnowledge(orgId, ticket);
      const orderContext = await retrieveOrderContext(supabase, orgId, {
        customerId: ticket.customer_id,
        conversationText: transcript(ticket),
      });
      const draftAgentId = await resolveStepAgent(supabase, orgId, ticket, step);
      const draft = await generateReply(
        supabase,
        orgId,
        ticket,
        draftAgentId,
        combineGrounding(chunks, orderContext.block)
      );

      const textViolation = checkDraftText(rules, draft);
      if (textViolation) {
        await escalateForReview(
          supabase,
          orgId,
          ticket,
          `Draft reply tripped rule "${textViolation.rule.name}" (${textViolation.reason}).`,
          0,
          "escalated"
        );
        return `draft blocked by rule: ${textViolation.rule.name}`;
      }

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
      const rules = await fetchEnabledRules(supabase, orgId, "ai_auto_reply");
      const ticketViolation = checkTicketRules(
        rules,
        { tags: ticket.tags, intent: ticket.intent },
        transcript(ticket)
      );
      if (ticketViolation) {
        await escalateForReview(
          supabase,
          orgId,
          ticket,
          `Rule "${ticketViolation.rule.name}" (${ticketViolation.reason}).`,
          0,
          "escalated"
        );
        return `blocked by rule: ${ticketViolation.rule.name}`;
      }

      const chunks = await retrieveKnowledge(orgId, ticket);
      const orderContext = await retrieveOrderContext(supabase, orgId, {
        customerId: ticket.customer_id,
        conversationText: transcript(ticket),
      });
      const replyAgentId = await resolveStepAgent(supabase, orgId, ticket, step);
      const reply = await generateReply(
        supabase,
        orgId,
        ticket,
        replyAgentId,
        combineGrounding(chunks, orderContext.block)
      );

      const textViolation = checkDraftText(rules, reply);
      const decision = decide({
        chunks,
        violation: textViolation,
        sentimentNegative: ticket.sentiment === "negative",
        orderContext,
      });

      if (decision.path === "escalated") {
        await escalateForReview(
          supabase,
          orgId,
          ticket,
          decision.reason,
          decision.confidence,
          "escalated"
        );
        return `escalated (confidence ${decision.confidence.toFixed(2)}): ${decision.reason}`;
      }

      const body =
        decision.path === "cited" && chunks.length > 0
          ? `${reply}\n\n— Sources: ${[...new Set(chunks.map((c) => c.document_title))].join(", ")}`
          : reply;

      await supabase.from("messages").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        sender: "ai",
        body,
      });

      // "cited" replies are grounded but not fully confident — never
      // auto-resolve on medium confidence, regardless of the step config.
      const canResolve = step.resolve && decision.path === "auto";

      const update: Database["public"]["Tables"]["tickets"]["Update"] = {
        first_response_at:
          ticket.first_response_at ?? new Date().toISOString(),
        decision_confidence: decision.confidence,
        decision_path: decision.path,
        decision_reason: decision.reason,
      };
      if (canResolve) {
        update.status = "resolved";
        update.ai_resolved = true;
        update.resolved_at = new Date().toISOString();
      }
      await supabase.from("tickets").update(update).eq("id", ticket.id);

      // Email-channel tickets: deliver the AI reply to the customer.
      let delivery = "";
      if (ticket.channel === "email" && ticket.customer?.email) {
        const sent = await sendTicketEmail(supabase, orgId, {
          ticketId: ticket.id,
          to: ticket.customer.email,
          subject: ticket.subject,
          body,
        });
        delivery = sent.ok ? " & emailed" : " (email failed)";
      }

      if (canResolve) {
        await sendCsatSurvey(supabase, orgId, ticket.id);
        await updateCustomerMemory(supabase, orgId, ticket.id);
      }

      return canResolve
        ? `AI replied${delivery} & resolved (${decision.path}, ${decision.confidence.toFixed(2)})`
        : `AI replied${delivery} (${decision.path}, ${decision.confidence.toFixed(2)})`;
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
      if (step.status === "resolved") {
        await sendCsatSurvey(supabase, orgId, ticket.id);
        await updateCustomerMemory(supabase, orgId, ticket.id);
      }
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

    case "create_appointment": {
      const scheduledAt = new Date(
        Date.now() + (step.offsetHours ?? 24) * 60 * 60 * 1000
      );
      await supabase.from("appointments").insert({
        organization_id: orgId,
        customer_id: ticket.customer_id,
        ticket_id: ticket.id,
        title: step.title || "Follow-up",
        scheduled_at: scheduledAt.toISOString(),
      });
      await supabase.from("messages").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        sender: "system",
        body: `Appointment scheduled: "${step.title || "Follow-up"}" for ${scheduledAt.toLocaleString()}.`,
        is_internal: true,
      });
      return "appointment scheduled";
    }

    case "create_lead": {
      await supabase.from("leads").insert({
        organization_id: orgId,
        customer_id: ticket.customer_id,
        ticket_id: ticket.id,
        name: ticket.customer?.name ?? null,
        email: ticket.customer?.email ?? null,
        source: "automation",
      });
      return "lead created";
    }

    case "send_sms": {
      const { data: customer } = ticket.customer_id
        ? await supabase
            .from("customers")
            .select("phone")
            .eq("id", ticket.customer_id)
            .maybeSingle()
        : { data: null };

      if (!customer?.phone) return "skipped SMS (no phone on file)";

      const smsBody = step.message || "Update on your support ticket.";
      let status: "simulated" | "sent" | "failed" = "simulated";
      let outcome = "SMS logged (simulated — Twilio not configured)";

      if (smsOutboundConfigured()) {
        const result = await sendSms(supabase, orgId, {
          to: customer.phone,
          body: smsBody,
        });
        status = result.ok ? "sent" : "failed";
        outcome = result.ok ? "SMS sent" : `SMS failed: ${result.error}`;
      }

      await supabase.from("sms_messages").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        to_phone: customer.phone,
        body: smsBody,
        status,
      });
      return outcome;
    }

    case "update_customer": {
      if (!ticket.customer_id) return "skipped (no customer on ticket)";
      const tag = step.tag?.trim().toLowerCase();
      const note = step.note?.trim();
      if (!tag && !note) return "skipped (nothing to update)";

      const { data: customer } = await supabase
        .from("customers")
        .select("tags, notes")
        .eq("id", ticket.customer_id)
        .maybeSingle();
      if (!customer) return "skipped (customer not found)";

      const nextTags =
        tag && !customer.tags.includes(tag)
          ? [...customer.tags, tag]
          : customer.tags;
      const nextNotes = note
        ? [customer.notes, note].filter(Boolean).join("\n")
        : customer.notes;

      await supabase
        .from("customers")
        .update({ tags: nextTags, notes: nextNotes })
        .eq("id", ticket.customer_id);
      return "customer record updated";
    }

    case "request_action": {
      // Never fabricate an order to act on — an action request must be
      // grounded in a real order on file for this customer.
      const orderContext = await retrieveOrderContext(supabase, orgId, {
        customerId: ticket.customer_id,
        conversationText: transcript(ticket),
      });
      const order = orderContext.matchedOrder;
      if (!order) {
        return "skipped action request (no matched order to ground it in)";
      }

      const preferredId = await getOrgModelId(orgId);

      const budget = await checkAiBudget(supabase, orgId);
      if (!budget.ok) return `skipped action request (${budget.error})`;

      const orderSummary = `Order on file: #${order.order_number}, status ${order.status}, total $${order.total ?? "unknown"}.`;
      const extractSystem =
        "You extract structured parameters for a customer service action request from a support conversation. Only use information explicitly present in the conversation — never invent amounts, reasons, or addresses. If something isn't stated, use an empty string or zero.";

      let params: Record<string, string | number>;
      try {
        if (step.action === "refund") {
          const { object } = await withModelFailover(preferredId, (model) =>
            generateObject({
              model,
              schema: z.object({
                amount: z.number().min(0),
                reason: z.string(),
              }),
              system: `${extractSystem} Extract the refund amount (must not exceed the order total) and the reason.`,
              prompt: `${transcript(ticket)}\n\n${orderSummary}`,
            })
          );
          params = {
            amount: Math.min(object.amount, Number(order.total ?? object.amount)),
            reason: object.reason,
          };
        } else if (step.action === "cancel_order") {
          const { object } = await withModelFailover(preferredId, (model) =>
            generateObject({
              model,
              schema: z.object({ reason: z.string() }),
              system: `${extractSystem} Extract the reason the customer wants to cancel this order.`,
              prompt: `${transcript(ticket)}\n\n${orderSummary}`,
            })
          );
          params = { reason: object.reason };
        } else {
          const { object } = await withModelFailover(preferredId, (model) =>
            generateObject({
              model,
              schema: z.object({ new_address: z.string() }),
              system: `${extractSystem} Extract the new shipping address the customer provided.`,
              prompt: `${transcript(ticket)}\n\n${orderSummary}`,
            })
          );
          params = { new_address: object.new_address };
        }
      } catch (e) {
        return `skipped action request (extraction failed: ${e instanceof Error ? e.message : "unknown error"})`;
      }

      const { error } = await supabase.from("action_requests").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        order_id: order.id,
        action_type: step.action,
        params,
        reasoning: `Requested while handling "${ticket.subject}" — order #${order.order_number}.`,
      });
      if (error) return `failed to create action request: ${error.message}`;

      await supabase.from("messages").insert({
        organization_id: orgId,
        ticket_id: ticket.id,
        sender: "system",
        body: `AI requested action: ${step.action.replace("_", " ")} for order #${order.order_number} — pending approval in Actions.`,
        is_internal: true,
      });

      return `action requested: ${step.action} (pending approval)`;
    }
  }
}

type AutomationRow = Database["public"]["Tables"]["automations"]["Row"];

/**
 * Run a single automation against a single ticket, if its trigger
 * conditions match. Steps execute sequentially; each step sees the
 * ticket state left by the previous one. Shared by both event-driven
 * automations (runAutomations) and the time-based SLA sweep.
 * Returns true if the automation actually fired.
 */
export async function runAutomationForTicket(
  supabase: Client,
  orgId: string,
  automation: AutomationRow,
  ticketId: string
): Promise<boolean> {
  const trigger = automation.trigger as unknown as Trigger;
  const steps = automation.steps as unknown as Step[];
  if (!Array.isArray(steps)) return false;

  const ticket = await fetchTicket(supabase, ticketId);
  if (!ticket || !matches(ticket, trigger)) return false;

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
    metadata: { automation: automation.name, automation_id: automation.id, results },
  });

  return true;
}

/**
 * Run all enabled automations matching the event against a ticket.
 * Failures in one automation are logged and don't block the others.
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
    if (trigger?.event !== event) continue;
    await runAutomationForTicket(supabase, orgId, automation, ticketId);
  }
}
