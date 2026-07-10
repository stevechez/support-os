import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";

import { withModelFailover } from "@/lib/ai/models";
import { getOrgModelId } from "@/lib/ai/org-model";
import { checkAiBudget } from "@/lib/billing/usage";
import { sendEmail } from "@/lib/channels/email-outbound";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

const MAX_ORDERS_PER_ORG_PER_RUN = 20;

const PROACTIVE_SYSTEM =
  "You write short, honest, proactive heads-up messages to customers whose order is running behind schedule — reaching out before they have to ask. Acknowledge the delay plainly, don't over-apologize or grovel, state what's known about the current status, and reassure them it's being watched. Never invent a new delivery date or reason for the delay beyond what's given. Keep it under 100 words. Output only the message body — no subject line, no signature.";

type DelayedOrder = {
  id: string;
  organization_id: string;
  order_number: string;
  status: string;
  description: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  expected_delivery: string | null;
  customer_id: string;
  customer: { name: string | null; email: string | null } | null;
};

/**
 * Proactive support sweep: finds orders that are past their expected
 * delivery date and still processing/shipped, and reaches out to the
 * customer before they file a ticket about it. Opt-in per org (via the
 * `proactive_support` setting) and capped per run to bound AI/email cost.
 * Runs on the same per-minute cadence as the job queue and SLA sweep —
 * one poller, three jobs, no extra infrastructure.
 */
export async function runProactiveSweep(
  supabase: Client
): Promise<{ checked: number; sent: number }> {
  const { data: enabledSettings } = await supabase
    .from("settings")
    .select("organization_id, value")
    .eq("key", "proactive_support");

  const eligibleOrgIds = (enabledSettings ?? [])
    .filter((s) => (s.value as { enabled?: boolean } | null)?.enabled)
    .map((s) => s.organization_id);

  if (eligibleOrgIds.length === 0) return { checked: 0, sent: 0 };

  let checked = 0;
  let sent = 0;

  for (const orgId of eligibleOrgIds) {
    const { data: orders } = await supabase
      .from("orders")
      .select(
        "id, organization_id, order_number, status, description, tracking_number, tracking_url, expected_delivery, customer_id, customer:customers(name, email)"
      )
      .eq("organization_id", orgId)
      .in("status", ["processing", "shipped"])
      .is("proactive_alert_sent_at", null)
      .not("expected_delivery", "is", null)
      .lt("expected_delivery", new Date().toISOString())
      .limit(MAX_ORDERS_PER_ORG_PER_RUN);

    if (!orders?.length) continue;

    for (const order of orders as unknown as DelayedOrder[]) {
      checked++;
      const didSend = await sendProactiveAlert(supabase, orgId, order);
      if (didSend) sent++;
    }
  }

  return { checked, sent };
}

async function sendProactiveAlert(
  supabase: Client,
  orgId: string,
  order: DelayedOrder
): Promise<boolean> {
  if (!order.customer_id) return false;

  const reason = "Shipping delay — past expected delivery date";

  // Claim first so a concurrent sweep tick can't double-send.
  const { data: claimed } = await supabase
    .from("orders")
    .update({ proactive_alert_sent_at: new Date().toISOString(), proactive_reason: reason })
    .eq("id", order.id)
    .is("proactive_alert_sent_at", null)
    .select("id")
    .maybeSingle();
  if (!claimed) return false;

  const preferredId = await getOrgModelId(orgId);
  const email = order.customer?.email;
  const firstName = order.customer?.name?.split(" ")[0];

  const fallbackBody = [
    `Hi${firstName ? ` ${firstName}` : ""},`,
    "",
    `We wanted to give you a heads-up: your order ${order.order_number}${
      order.description ? ` (${order.description})` : ""
    } is running past its expected delivery date. We're keeping an eye on it${
      order.tracking_url ? ` — you can track it here: ${order.tracking_url}` : ""
    }.`,
    "",
    "Reply to this message if you'd like an update sooner.",
  ].join("\n");

  let body = fallbackBody;

  const budget = await checkAiBudget(supabase, orgId);
  if (budget.ok) {
    try {
      const prompt = [
        `Order ${order.order_number}${order.description ? ` (${order.description})` : ""}.`,
        `Status: ${order.status}.`,
        order.expected_delivery
          ? `Was expected by ${new Date(order.expected_delivery).toDateString()}, which has passed.`
          : "",
        order.tracking_url ? `Tracking: ${order.tracking_url}` : "No tracking link available yet.",
        `Customer first name: ${firstName ?? "unknown"}.`,
      ]
        .filter(Boolean)
        .join("\n");

      const { text } = await withModelFailover(preferredId, (model) =>
        generateText({ model, system: PROACTIVE_SYSTEM, prompt })
      );
      if (text.trim()) body = text.trim();
    } catch (e) {
      console.error(
        "[proactive] draft generation failed, using fallback:",
        e instanceof Error ? e.message : e
      );
    }
  }

  const subject = `An update on your order ${order.order_number}`;

  const { data: ticket } = await supabase
    .from("tickets")
    .insert({
      organization_id: orgId,
      customer_id: order.customer_id,
      subject,
      status: "open",
      priority: "medium",
      tags: ["proactive"],
      channel: "proactive",
      intent: "proactive_outreach",
    })
    .select("id")
    .single();

  if (ticket) {
    await supabase.from("messages").insert({
      organization_id: orgId,
      ticket_id: ticket.id,
      sender: "ai",
      body,
    });
  }

  if (email) {
    await sendEmail(supabase, orgId, {
      to: email,
      subject,
      text: body,
      html: `<div style="font-family:sans-serif;line-height:1.6;max-width:480px">${body
        .split("\n")
        .map((line) => `<p>${line.replace(/</g, "&lt;")}</p>`)
        .join("")}</div>`,
    });
  }

  await supabase.from("activity_log").insert({
    organization_id: orgId,
    actor_type: "system",
    action: "proactive.sent",
    entity_type: "order",
    entity_id: order.id,
    metadata: { order_number: order.order_number, reason, ticket_id: ticket?.id },
  });

  return true;
}
