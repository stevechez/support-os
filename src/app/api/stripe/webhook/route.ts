import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import type { BillingState } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

async function setBilling(orgId: string, billing: BillingState) {
  const supabase = createAdminClient();
  if (!supabase) return;

  await supabase.from("settings").upsert({
    organization_id: orgId,
    key: "billing",
    value: billing,
    updated_at: new Date().toISOString(),
  });

  await supabase.from("activity_log").insert({
    organization_id: orgId,
    actor_type: "system",
    action: "billing.updated",
    metadata: { plan: billing.plan, status: billing.status ?? "none" },
  });
}

function billingFromSubscription(
  subscription: Stripe.Subscription
): BillingState {
  const active =
    subscription.status === "active" || subscription.status === "trialing";
  const periodEnd = subscription.items.data[0]?.current_period_end;
  return {
    plan: active ? "pro" : "free",
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : undefined,
  };
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orgId = session.metadata?.orgId;
      if (orgId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await setBilling(orgId, billingFromSubscription(subscription));
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const orgId = subscription.metadata?.orgId;
      if (orgId) {
        await setBilling(orgId, billingFromSubscription(subscription));
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
