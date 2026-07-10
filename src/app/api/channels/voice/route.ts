import type { NextRequest } from "next/server";

import { retrieveKnowledge } from "@/lib/ai/context";
import { checkAiBudget } from "@/lib/billing/usage";
import {
  findOrCreateCustomerByPhone,
  orgForToken,
} from "@/lib/channels/inbound";
import { clientIp, rateLimit } from "@/lib/channels/rate-limit";
import { verifyTwilioSignature } from "@/lib/channels/twilio-auth";
import {
  twimlGather,
  twimlResponse,
  twimlSayAndHangup,
} from "@/lib/channels/voice-twiml";
import {
  combineGrounding,
  fetchTicket,
  generateReply,
} from "@/lib/automations/engine";
import { retrieveOrderContext } from "@/lib/orders/lookup";
import { checkDraftText, checkTicketRules, fetchEnabledRules } from "@/lib/rules/engine";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_TURNS = 6;
const HANDOFF_MESSAGE =
  "I want to make sure this gets handled properly, so I'm connecting you with a specialist on our team — they'll follow up with you shortly. Thanks for calling.";
const WRAP_UP_MESSAGE =
  "Thanks for calling — if anything else comes up, feel free to call back anytime. Have a great day.";
const TROUBLE_MESSAGE =
  "Sorry, we're having trouble on our end right now. Please try again in a few minutes.";

function actionUrl(base: URL, ticketId: string, turn: number): string {
  const url = new URL(base.toString());
  url.searchParams.set("t", ticketId);
  url.searchParams.set("turn", String(turn));
  return url.toString();
}

/**
 * Turn-based voice channel via Twilio's <Gather input="speech"> — Twilio
 * handles the actual speech-to-text and text-to-speech, so each webhook
 * round trip is just: read what the caller said, run it through the same
 * grounded-reply + business-rules pipeline every other channel uses, and
 * say the answer back. Not real-time barge-in streaming — a real,
 * deployable IVR loop that reuses the existing AI brain rather than
 * building a second one.
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return twimlResponse(twimlSayAndHangup(TROUBLE_MESSAGE));
  }

  const allowed = await rateLimit(supabase, `voice:${clientIp(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!allowed) {
    return twimlResponse(twimlSayAndHangup(TROUBLE_MESSAGE));
  }

  const url = request.nextUrl;
  const token = url.searchParams.get("token") ?? "";
  const ticketId = url.searchParams.get("t");
  const turn = Number(url.searchParams.get("turn") ?? "0");

  const orgId = await orgForToken(supabase, "voice", token);
  if (!orgId) {
    return twimlResponse(
      twimlSayAndHangup("This phone line isn't configured correctly.")
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return twimlResponse(twimlSayAndHangup(TROUBLE_MESSAGE));
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
    return twimlResponse(twimlSayAndHangup("This request could not be verified."));
  }

  const from = params.From ?? "";
  const speechResult = params.SpeechResult?.trim();

  try {
    // New call: no ticket yet — greet and start listening.
    if (!ticketId) {
      const customerId = await findOrCreateCustomerByPhone(supabase, orgId, from);
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .maybeSingle();

      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          organization_id: orgId,
          customer_id: customerId,
          subject: "Phone call",
          channel: "voice",
          tags: ["voice"],
        })
        .select("id")
        .single();

      if (error || !ticket) {
        return twimlResponse(twimlSayAndHangup(TROUBLE_MESSAGE));
      }

      const greeting = `Thanks for calling${org?.name ? ` ${org.name}` : ""}. How can I help you today?`;
      return twimlResponse(twimlGather(greeting, actionUrl(url, ticket.id, 1)));
    }

    // Caller went silent — wrap up.
    if (!speechResult) {
      await supabase
        .from("tickets")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          ai_resolved: true,
        })
        .eq("id", ticketId)
        .eq("organization_id", orgId)
        .is("resolved_at", null);
      return twimlResponse(twimlSayAndHangup(WRAP_UP_MESSAGE));
    }

    await supabase.from("messages").insert({
      organization_id: orgId,
      ticket_id: ticketId,
      sender: "customer",
      body: speechResult,
    });

    const ticket = await fetchTicket(supabase, ticketId);
    if (!ticket || ticket.organization_id !== orgId) {
      return twimlResponse(twimlSayAndHangup(TROUBLE_MESSAGE));
    }

    const rules = await fetchEnabledRules(supabase, orgId, "ai_auto_reply");
    const ticketViolation = checkTicketRules(
      rules,
      { tags: ticket.tags, intent: ticket.intent },
      speechResult
    );

    if (ticketViolation) {
      await handOff(supabase, orgId, ticketId, ticketViolation.rule.name, ticketViolation.reason);
      return twimlResponse(twimlSayAndHangup(HANDOFF_MESSAGE));
    }

    const budget = await checkAiBudget(supabase, orgId);
    if (!budget.ok) {
      await handOff(supabase, orgId, ticketId, "AI budget exceeded", budget.error ?? "over plan limit");
      return twimlResponse(twimlSayAndHangup(HANDOFF_MESSAGE));
    }

    const chunks = await retrieveKnowledge(orgId, ticket);
    const orderContext = await retrieveOrderContext(supabase, orgId, {
      customerId: ticket.customer_id,
      conversationText: speechResult,
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
      return twimlResponse(twimlSayAndHangup(HANDOFF_MESSAGE));
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
        decision_confidence: confidence,
        decision_path: "auto",
        decision_reason: "Live voice reply — grounded in knowledge base and order data where available.",
      })
      .eq("id", ticketId);

    if (turn >= MAX_TURNS) {
      await supabase
        .from("tickets")
        .update({ status: "resolved", resolved_at: new Date().toISOString(), ai_resolved: true })
        .eq("id", ticketId);
      return twimlResponse(
        twimlSayAndHangup(`${reply} ${WRAP_UP_MESSAGE}`)
      );
    }

    return twimlResponse(twimlGather(reply, actionUrl(url, ticketId, turn + 1)));
  } catch (e) {
    console.error("[voice] turn failed:", e instanceof Error ? e.message : e);
    return twimlResponse(twimlSayAndHangup(TROUBLE_MESSAGE));
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
      decision_reason: `Rule "${ruleName}" (${reason}) — handed off to a human during the call.`,
    })
    .eq("id", ticketId);

  await supabase.from("messages").insert({
    organization_id: orgId,
    ticket_id: ticketId,
    sender: "system",
    body: `Handed off to a human during the call: rule "${ruleName}" (${reason}).`,
    is_internal: true,
  });
}
