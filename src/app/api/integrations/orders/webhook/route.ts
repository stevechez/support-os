import { NextResponse, type NextRequest } from "next/server";

import { findOrCreateCustomer, orgForToken } from "@/lib/channels/inbound";
import { clientIp, rateLimit } from "@/lib/channels/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STATUSES = ["processing", "shipped", "delivered", "cancelled", "refunded"];

/**
 * Inbound order sync webhook (platform-agnostic).
 *
 * POST /api/integrations/orders/webhook?token=…
 * Body: {
 *   customerEmail: string,
 *   customerName?: string,
 *   orderNumber: string,
 *   status?: "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
 *   description?: string,
 *   total?: number,
 *   trackingNumber?: string,
 *   trackingUrl?: string,
 *   orderedAt?: string (ISO),
 *   expectedDelivery?: string (ISO)
 * }
 *
 * Point your e-commerce platform's order-created/order-updated webhook
 * here (Shopify, WooCommerce, a custom backend, etc), mapping its payload
 * to these fields. Upserts on (organization, order number), so sending
 * the same order again just updates it — safe for status-change webhooks.
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Order sync not configured: set SUPABASE_SERVICE_ROLE_KEY on the server.",
      },
      { status: 503 }
    );
  }

  const allowed = await rateLimit(supabase, `orders:${clientIp(request)}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const token = request.nextUrl.searchParams.get("token") ?? "";
  const orgId = await orgForToken(supabase, "order_sync", token);
  if (!orgId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let payload: {
    customerEmail?: string;
    customerName?: string;
    orderNumber?: string;
    status?: string;
    description?: string;
    total?: number;
    trackingNumber?: string;
    trackingUrl?: string;
    orderedAt?: string;
    expectedDelivery?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = payload.customerEmail?.trim();
  const orderNumber = payload.orderNumber?.trim();
  if (!email || !orderNumber) {
    return NextResponse.json(
      { error: "'customerEmail' and 'orderNumber' are required" },
      { status: 400 }
    );
  }

  const status = VALID_STATUSES.includes(payload.status ?? "")
    ? payload.status
    : "processing";

  try {
    const customerId = await findOrCreateCustomer(
      supabase,
      orgId,
      email,
      payload.customerName
    );

    const { error } = await supabase.from("orders").upsert(
      {
        organization_id: orgId,
        customer_id: customerId,
        order_number: orderNumber,
        status,
        description: payload.description?.trim() || null,
        total: payload.total ?? null,
        tracking_number: payload.trackingNumber?.trim() || null,
        tracking_url: payload.trackingUrl?.trim() || null,
        ordered_at: payload.orderedAt || undefined,
        expected_delivery: payload.expectedDelivery || null,
      },
      { onConflict: "organization_id,order_number" }
    );

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, orderNumber });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
