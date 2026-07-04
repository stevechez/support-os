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
