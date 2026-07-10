import "server-only";

import { createHmac } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

type ActionWebhookSetting = { enabled?: boolean; url?: string; secret?: string };

/**
 * Dispatch an approved action request to the org's configured fulfillment
 * system. SupportOS doesn't own the customer's payment processor or order
 * platform, so "executing" an action means notifying the system that does —
 * a signed webhook the org points at their own backend (Shopify, Stripe,
 * an internal tool, whatever actually issues the refund). Mirrors the
 * inbound order-sync webhook, just in the other direction.
 */
export async function dispatchActionRequest(
  supabase: Client,
  orgId: string,
  actionRequestId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: request } = await supabase
    .from("action_requests")
    .select(
      "*, order:orders(order_number, total, status), ticket:tickets(customer:customers(name, email, phone))"
    )
    .eq("id", actionRequestId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!request) return { ok: false, error: "Action request not found" };

  const { data: settingRow } = await supabase
    .from("settings")
    .select("value")
    .eq("organization_id", orgId)
    .eq("key", "action_webhook")
    .maybeSingle();

  const setting = (settingRow?.value as ActionWebhookSetting | null) ?? {};
  if (!setting.enabled || !setting.url) {
    await supabase
      .from("action_requests")
      .update({
        status: "failed",
        delivery_response: "No fulfillment webhook configured in Settings.",
      })
      .eq("id", actionRequestId);
    return { ok: false, error: "No fulfillment webhook configured" };
  }

  const payload = {
    action_request_id: request.id,
    action_type: request.action_type,
    order_number: request.order?.order_number ?? null,
    ticket_id: request.ticket_id,
    customer: request.ticket?.customer ?? null,
    params: request.params,
    reasoning: request.reasoning,
  };
  const body = JSON.stringify(payload);
  const signature = setting.secret
    ? createHmac("sha256", setting.secret).update(body).digest("hex")
    : undefined;

  try {
    const res = await fetch(setting.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(signature ? { "X-SupportOS-Signature": signature } : {}),
      },
      body,
    });

    const responseText = await res.text().catch(() => "");
    const ok = res.ok;

    await supabase
      .from("action_requests")
      .update({
        status: ok ? "sent" : "failed",
        delivery_response: `${res.status}: ${responseText.slice(0, 500)}`,
      })
      .eq("id", actionRequestId);

    // Keep the local order cache consistent for anything we can infer
    // locally — the org's own system remains the source of truth.
    if (ok && request.order_id) {
      if (request.action_type === "cancel_order") {
        await supabase
          .from("orders")
          .update({ status: "cancelled" })
          .eq("id", request.order_id);
      } else if (
        request.action_type === "refund" &&
        request.order?.total != null &&
        (request.params as { amount?: number })?.amount != null &&
        Number((request.params as { amount?: number }).amount) >=
          Number(request.order.total)
      ) {
        await supabase
          .from("orders")
          .update({ status: "refunded" })
          .eq("id", request.order_id);
      }
    }

    return ok
      ? { ok: true }
      : { ok: false, error: `Fulfillment webhook returned ${res.status}` };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Delivery failed";
    await supabase
      .from("action_requests")
      .update({ status: "failed", delivery_response: message })
      .eq("id", actionRequestId);
    return { ok: false, error: message };
  }
}
