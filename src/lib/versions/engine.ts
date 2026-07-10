import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  EntityVersion,
  Json,
  VersionedEntityType,
} from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export async function recordVersion(
  supabase: Client,
  input: {
    orgId: string;
    entityType: VersionedEntityType;
    entityId: string;
    snapshot: Record<string, unknown>;
    createdBy?: string | null;
    note: string;
  }
): Promise<void> {
  await supabase.from("entity_versions").insert({
    organization_id: input.orgId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    snapshot: input.snapshot as unknown as Json,
    change_note: input.note,
    created_by: input.createdBy ?? null,
  });
}

export async function listVersions(
  supabase: Client,
  orgId: string,
  entityType: VersionedEntityType,
  entityId: string
): Promise<EntityVersion[]> {
  const { data } = await supabase
    .from("entity_versions")
    .select("*")
    .eq("organization_id", orgId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

async function applySnapshot(
  supabase: Client,
  entityType: VersionedEntityType,
  entityId: string,
  snapshot: Record<string, unknown>
): Promise<{ error: string | null }> {
  switch (entityType) {
    case "business_rule": {
      const { error } = await supabase
        .from("business_rules")
        .update(snapshot as Database["public"]["Tables"]["business_rules"]["Update"])
        .eq("id", entityId);
      return { error: error?.message ?? null };
    }
    case "automation": {
      const { error } = await supabase
        .from("automations")
        .update(snapshot as Database["public"]["Tables"]["automations"]["Update"])
        .eq("id", entityId);
      return { error: error?.message ?? null };
    }
    case "agent_config": {
      const { error } = await supabase
        .from("agent_configs")
        .update(snapshot as Database["public"]["Tables"]["agent_configs"]["Update"])
        .eq("id", entityId);
      return { error: error?.message ?? null };
    }
  }
}

/** Restore an entity to a prior snapshot, then log the restore as a new version (undoable too). */
export async function restoreVersion(
  supabase: Client,
  orgId: string,
  versionId: string,
  createdBy?: string | null
): Promise<{ error?: string; entityType?: VersionedEntityType; entityId?: string }> {
  const { data: version } = await supabase
    .from("entity_versions")
    .select("*")
    .eq("id", versionId)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!version) return { error: "Version not found." };

  const entityType = version.entity_type as VersionedEntityType;
  const snapshot = version.snapshot as Record<string, unknown>;

  const { error } = await applySnapshot(supabase, entityType, version.entity_id, snapshot);
  if (error) return { error };

  await recordVersion(supabase, {
    orgId,
    entityType,
    entityId: version.entity_id,
    snapshot,
    createdBy,
    note: `Restored from ${new Date(version.created_at).toLocaleString()}`,
  });

  return { entityType, entityId: version.entity_id };
}
