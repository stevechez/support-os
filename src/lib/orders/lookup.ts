import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Order } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

/** Order numbers customers typically type: #4471, ORD-4471, order 4471. */
const ORDER_NUMBER_PATTERN = /\b(?:order\s*#?|#)\s*([A-Z0-9][A-Z0-9-]{2,})\b/gi;

export function extractOrderNumbers(text: string): string[] {
  const matches = [...text.matchAll(ORDER_NUMBER_PATTERN)].map((m) =>
    m[1].toUpperCase()
  );
  return [...new Set(matches)];
}

/** Rough signal that the conversation is asking about an order at all. */
const ORDER_INTENT_WORDS =
  /\b(order|shipment|shipping|tracking|delivery|delivered|package|refund|return)\b/i;

export function looksOrderRelated(text: string): boolean {
  return ORDER_INTENT_WORDS.test(text);
}

export type OrderContext = {
  /** True if the conversation appears to be asking about an order. */
  relevant: boolean;
  /** The specific order the customer seems to be asking about, if found. */
  matchedOrder: Order | null;
  /** Recent orders for this customer, for general context. */
  recentOrders: Order[];
  /** Formatted block to append to the AI's grounding context. */
  block: string | null;
};

function formatOrder(order: Order): string {
  const parts = [
    `#${order.order_number}`,
    `status: ${order.status}`,
    order.description ? `items: ${order.description}` : null,
    order.total != null ? `total: $${Number(order.total).toFixed(2)}` : null,
    order.tracking_number ? `tracking: ${order.tracking_number}` : null,
    order.expected_delivery
      ? `expected delivery: ${new Date(order.expected_delivery).toLocaleDateString()}`
      : null,
    `ordered: ${new Date(order.ordered_at).toLocaleDateString()}`,
  ].filter(Boolean);
  return `- ${parts.join(" · ")}`;
}

/**
 * Grounds a reply in the customer's real order history — the AI should
 * never guess at order status. Looks for an explicit order number in the
 * conversation first; falls back to the customer's recent orders.
 */
export async function retrieveOrderContext(
  supabase: Client,
  orgId: string,
  input: {
    customerId: string | null;
    conversationText: string;
  }
): Promise<OrderContext> {
  const relevant = looksOrderRelated(input.conversationText);

  if (!input.customerId) {
    return { relevant, matchedOrder: null, recentOrders: [], block: null };
  }

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("organization_id", orgId)
    .eq("customer_id", input.customerId)
    .order("ordered_at", { ascending: false })
    .limit(10);

  const recentOrders = orders ?? [];
  if (recentOrders.length === 0) {
    return { relevant, matchedOrder: null, recentOrders: [], block: null };
  }

  const mentioned = extractOrderNumbers(input.conversationText);
  const matchedOrder =
    recentOrders.find((o) =>
      mentioned.some((m) => m === o.order_number.toUpperCase())
    ) ?? null;

  const shown = matchedOrder
    ? [matchedOrder]
    : recentOrders.slice(0, 5);

  const block = `Customer Orders (source of truth — do not guess beyond this):\n${shown
    .map(formatOrder)
    .join("\n")}`;

  return { relevant, matchedOrder, recentOrders, block };
}
