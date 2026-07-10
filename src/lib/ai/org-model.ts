import "server-only";

import { resolveModel } from "@/lib/ai/models";
import { createClient } from "@/lib/supabase/server";

/** Resolve the org's selected AI model (or first available). */
export async function getOrgModel(orgId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("organization_id", orgId)
    .eq("key", "ai_model")
    .maybeSingle();

  const modelId = (data?.value as { id?: string } | null)?.id;
  return resolveModel(modelId);
}

/** The org's preferred model id (or undefined), without resolving it to a
 * live LanguageModel — used by callers that want to run with failover via
 * `withModelFailover` rather than a single fixed provider. */
export async function getOrgModelId(orgId: string): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("organization_id", orgId)
    .eq("key", "ai_model")
    .maybeSingle();

  return (data?.value as { id?: string } | null)?.id;
}
