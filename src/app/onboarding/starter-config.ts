import type { SupabaseClient } from "@supabase/supabase-js";

import { TEMPLATES } from "@/app/(app)/automations/templates";
import { STARTER_RULES } from "@/lib/rules/types";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

/**
 * Seed every new workspace with the standard guardrails and automations —
 * this is real product configuration, not demo fluff, so it always runs
 * regardless of whether the user also wants sample tickets. The goal: a
 * brand-new signup already has AI resolving routine requests and escalating
 * risky ones within minutes, instead of landing in an inert, empty inbox.
 */
export async function seedStarterConfig(
  supabase: Client,
  orgId: string
): Promise<void> {
  await supabase.from("business_rules").insert(
    STARTER_RULES.map((rule) => ({
      organization_id: orgId,
      ...rule,
    }))
  );

  await supabase.from("automations").insert(
    TEMPLATES.map((template) => ({
      organization_id: orgId,
      name: template.name,
      enabled: true,
      trigger: template.trigger,
      steps: template.steps,
    }))
  );
}
