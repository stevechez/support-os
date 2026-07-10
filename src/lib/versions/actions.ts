"use server";

import { revalidatePath } from "next/cache";

import type { EntityVersion, VersionedEntityType } from "@/lib/database.types";
import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { listVersions, restoreVersion } from "./engine";

export type FetchVersionsResult = { versions: EntityVersion[] } | { error: string };

export async function fetchVersions(
  entityType: VersionedEntityType,
  entityId: string
): Promise<FetchVersionsResult> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const supabase = await createClient();
  const versions = await listVersions(
    supabase,
    current.member.organization_id,
    entityType,
    entityId
  );
  return { versions };
}

export async function restoreEntityVersion(versionId: string, revalidate: string) {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const supabase = await createClient();
  const result = await restoreVersion(
    supabase,
    current.member.organization_id,
    versionId,
    current.member.id
  );
  if (!result.error) revalidatePath(revalidate);
  return result;
}
