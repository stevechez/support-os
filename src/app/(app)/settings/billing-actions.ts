"use server";

import { redirect } from "next/navigation";

import { getBilling } from "@/lib/billing/usage";
import { getStripe } from "@/lib/billing/stripe";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type BillingActionState = { error?: string };

export async function startCheckout(
  origin: string
): Promise<BillingActionState> {
  const current = await getCurrentMember();
  if (!current) redirect("/login");
  if (current.member.role !== "owner" && current.member.role !== "admin") {
    return { error: "Only owners and admins can manage billing." };
  }

  const stripe = getStripe();
  const price = process.env.STRIPE_PRICE_PRO;
  if (!stripe || !price) {
    return {
      error:
        "Stripe isn't configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO in .env.local.",
    };
  }

  const orgId = current.member.organization_id;
  const supabase = await createClient();
  const billing = await getBilling(supabase, orgId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: billing?.stripe_customer_id,
    customer_email: billing?.stripe_customer_id
      ? undefined
      : (current.user.email ?? undefined),
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=cancelled`,
    metadata: { orgId },
    subscription_data: { metadata: { orgId } },
  });

  if (!session.url) return { error: "Could not create a checkout session." };
  redirect(session.url);
}

export async function openBillingPortal(
  origin: string
): Promise<BillingActionState> {
  const current = await getCurrentMember();
  if (!current) redirect("/login");
  if (current.member.role !== "owner" && current.member.role !== "admin") {
    return { error: "Only owners and admins can manage billing." };
  }

  const stripe = getStripe();
  if (!stripe) return { error: "Stripe isn't configured." };

  const supabase = await createClient();
  const billing = await getBilling(
    supabase,
    current.member.organization_id
  );
  if (!billing?.stripe_customer_id) {
    return { error: "No billing account yet — upgrade first." };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: billing.stripe_customer_id,
    return_url: `${origin}/settings`,
  });
  redirect(session.url);
}
