import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { planFromBilling } from "@/lib/billing/plans";
import { stripeConfigured } from "@/lib/billing/stripe";
import { getAiUsageThisMonth, getBilling } from "@/lib/billing/usage";
import { smsOutboundConfigured } from "@/lib/channels/sms-outbound";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { BillingSettings } from "./billing-settings";
import { DataExportSettings } from "./export-settings";
import { ImportSettings } from "./import-settings";
import { IntegrationsSettings } from "./integrations-settings";
import { SecuritySettings } from "./security-settings";
import { WorkspaceSettings } from "./workspace-settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("key, value")
    .eq("organization_id", current.member.organization_id);

  const byKey = Object.fromEntries(
    (settings ?? []).map((s) => [s.key, s.value])
  ) as Record<string, unknown>;

  const chatWidget = (byKey["chat_widget"] ?? {}) as {
    enabled?: boolean;
    token?: string;
  };
  const helpCenter = (byKey["help_center"] ?? {}) as {
    enabled?: boolean;
    token?: string;
  };
  const inboundEmail = (byKey["inbound_email"] ?? {}) as {
    enabled?: boolean;
    token?: string;
  };
  const orderSync = (byKey["order_sync"] ?? {}) as {
    enabled?: boolean;
    token?: string;
  };
  const proactiveSupport = (byKey["proactive_support"] ?? {}) as {
    enabled?: boolean;
  };
  const voice = (byKey["voice"] ?? {}) as { enabled?: boolean; token?: string };
  const sms = (byKey["sms"] ?? {}) as {
    enabled?: boolean;
    token?: string;
    from_number?: string;
  };
  const actionWebhook = (byKey["action_webhook"] ?? {}) as {
    enabled?: boolean;
    url?: string;
    secret?: string;
  };
  const slack = (byKey["slack"] ?? {}) as { webhook_url?: string };
  const emailOutbound = (byKey["email_outbound"] ?? {}) as {
    from_address?: string;
  };

  const org = current.member.organization as unknown as {
    name: string;
    slug: string;
  };

  const orgId = current.member.organization_id;
  const [billing, aiUsed, { count: docCount }, { count: memberCount }] =
    await Promise.all([
      getBilling(supabase, orgId),
      getAiUsageThisMonth(supabase, orgId),
      supabase
        .from("knowledge_documents")
        .select("*", { count: "exact", head: true }),
      supabase.from("members").select("*", { count: "exact", head: true }),
    ]);
  const plan = planFromBilling(billing);
  const canManageBilling =
    current.member.role === "owner" || current.member.role === "admin";

  const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
  const verifiedFactors = (mfaFactors?.totp ?? []).filter(
    (f) => f.status === "verified"
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      <div>
        <h1 className="font-serif text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace, billing, channels, and integrations.
        </p>
      </div>

      <WorkspaceSettings name={org?.name ?? ""} />

      <BillingSettings
        planLabel={plan.label}
        planPrice={plan.price}
        isPro={plan.id === "pro"}
        status={billing?.status}
        periodEnd={billing?.current_period_end}
        usage={{
          aiActions: { used: aiUsed, limit: plan.maxAiActionsPerMonth },
          knowledgeDocs: {
            used: docCount ?? 0,
            limit: plan.maxKnowledgeDocs,
          },
          members: { used: memberCount ?? 0, limit: plan.maxMembers },
        }}
        stripeConfigured={stripeConfigured()}
        canManage={canManageBilling}
      />

      <IntegrationsSettings
        chatWidget={chatWidget}
        helpCenter={helpCenter}
        inboundEmail={inboundEmail}
        orderSync={orderSync}
        proactiveSupport={proactiveSupport}
        voice={voice}
        sms={sms}
        smsConfigured={smsOutboundConfigured()}
        actionWebhookUrl={actionWebhook.url ?? ""}
        actionWebhookSecret={actionWebhook.secret ?? ""}
        slackWebhookUrl={slack.webhook_url ?? ""}
        emailFromAddress={emailOutbound.from_address ?? ""}
        resendConfigured={!!process.env.RESEND_API_KEY}
        serviceRoleConfigured={!!process.env.SUPABASE_SERVICE_ROLE_KEY}
      />

      <ImportSettings />

      <SecuritySettings factors={verifiedFactors} />

      <DataExportSettings canManage={canManageBilling} />
    </div>
  );
}
