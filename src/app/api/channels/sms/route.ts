import type { NextRequest } from "next/server";

import { retrieveKnowledge } from "@/lib/ai/context";
import {
  combineGrounding,
  fetchTicket,
  generateReply,
} from "@/lib/automations/engine";
import { checkAiBudget } from "@/lib/billing/usage";
import {
  findOrCreateCustomerByPhone,
  orgForToken,
  resolveOrCreateSmsTicket,
} from "@/lib/channels/inbound";
import { clientIp, rateLimit } from "@/lib/channels/rate-limit";
import { verifyTwilioSignature } from "@/lib/channels/twilio-auth";
import {
  twimlEmptyResponse,
  twimlMessage,
  twimlResponse,
} from "@/lib/channels/voice-twiml";
import { retrieveOrderContext } from "@/lib/orders/lookup";
import { checkDraftText, checkTicketRules, fetchEnabledRules } from "@/lib/rules/engine";
import { createAdminClient } from "@/lib/supabase/admin";

const HANDOFF_MESSAGE =
  "Thanks for the details — I'm passing this to a specialist on our team who will follow up with you shortly.";
const TROUBLE_MESSAGE =
  "Sorry, we're having trouble on our end right now. Please try again in a few minutes.";

/**
 * Inbound SMS via Twilio. Each text is a separate webhook call with no
 * session, so threading is resolved server-side (resolveOrCreateSmsTicket).
 * Runs through the exact same grounded-reply + business-rules pipeline as
 * voice, chat, and email — same brain, different channel. Replying with a
 * TwiML <Message> lets Twilio deliver the response without a separate
 * outbound API call.
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return twimlResponse(twimlMessage(TROUBLE_MESSAGE));
  }

  const allowed = await rateLimit(supabase, `sms:${clientIp(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!allowed) {
    return twimlResponse(twimlMessage(TROUBLE_MESSAGE));
  }

  const url = request.nextUrl;
  const token = url.searchParams.get("token") ?? "";
  const orgId = await orgForToken(supabase, "sms", token);
  if (!orgId) {
    return twimlResponse(twimlEmptyResponse());
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return twimlResponse(twimlMessage(TROUBLE_MESSAGE));
  }

  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  const signatureOk = verifyTwilioSignature(
    url.toString(),
    params,
    request.headers.get("x-twilio-signature")
  );
  if (!signatureOk) {
    return twimlResponse(twimlEmptyResponse());
  }

  const from = params.From ?? "";
  const body = params.Body?.trim();
  if (!from || !body) {
    return twimlResponse(twimlEmptyResponse());
  }

  try {
    const customerId = await findOrCreateCustomerByPhone(supabase, orgId, from);
    const ticketId = await resolveOrCreateSmsTicket(supabase, orgId, customerId);

    await supabase.from("messages").insert({
      organization_id: orgId,
      ticket_id: ticketId,
      sender: "customer",
      body,
    });

    const ticket = await fetchTicket(supabase, ticketId);
    if (!ticket) {
      return twimlResponse(twimlMessage(TROUBLE_MESSAGE));
    }

    const rules = await fetchEnabledRules(supabase, orgId, "ai_auto_reply");
    const ticketViolation = checkTicketRules(
      rules,
      { tags: ticket.tags, intent: ticket.intent },
      body
    );
    if (ticketViolation) {
      await handOff(supabase, orgId, ticketId, ticketViolation.rule.name, ticketViolation.reason);
      return twimlResponse(twimlMessage(HANDOFF_MESSAGE));
    }

    const budget = await checkAiBudget(supabase, orgId);
    if (!budget.ok) {
      await handOff(supabase, orgId, ticketId, "AI budget exceeded", budget.error ?? "over plan limit");
      return twimlResponse(twimlMessage(HANDOFF_MESSAGE));
    }

    const chunks = await retrieveKnowledge(orgId, ticket);
    const orderContext = await retrieveOrderContext(supabase, orgId, {
      customerId: ticket.customer_id,
      conversationText: body,
    });

    const reply = await generateReply(
      supabase,
      orgId,
      ticket,
      undefined,
      combineGrounding(chunks, orderContext.block)
    );

    const textViolation = checkDraftText(rules, reply);
    if (textViolation) {
      await handOff(supabase, orgId, ticketId, textViolation.rule.name, textViolation.reason);
      return twimlResponse(twimlMessage(HANDOFF_MESSAGE));
    }

    await supabase.from("messages").insert({
      organization_id: orgId,
      ticket_id: ticketId,
      sender: "ai",
      body: reply,
    });

    const confidence = chunks.length > 0 || orderContext.matchedOrder ? 0.75 : 0.5;
    await supabase
      .from("tickets")
      .update({
        status: "waiting",
        first_response_at: ticket.first_response_at ?? new Date().toISOString(),
        decision_confidence: confidence,
        decision_path: "auto",
        decision_reason: "Live SMS reply — grounded in knowledge base and order data where available.",
      })
      .eq("id", ticketId);

    return twimlResponse(twimlMessage(reply));
  } catch (e) {
    console.error("[sms] inbound handling failed:", e instanceof Error ? e.message : e);
    return twimlResponse(twimlMessage(TROUBLE_MESSAGE));
  }
}

async function handOff(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string,
  ticketId: string,
  ruleName: string,
  reason: string
) {
  if (!supabase) return;
  await supabase
    .from("tickets")
    .update({
      priority: "urgent",
      status: "open",
      decision_confidence: 0,
      decision_path: "escalated",
      decision_reason: `Rule "${ruleName}" (${reason}) — handed off to a human.`,
    })
    .eq("id", ticketId);

  await supabase.from("messages").insert({
    organization_id: orgId,
    ticket_id: ticketId,
    sender: "system",
    body: `Handed off to a human: rule "${ruleName}" (${reason}).`,
    is_internal: true,
  });
}
