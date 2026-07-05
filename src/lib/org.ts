import { createClient } from "@/lib/supabase/server";

import {
  PERMISSION_ERROR,
  roleAtLeast,
  type MemberRole,
} from "@/lib/roles";

export { PERMISSION_ERROR, roleAtLeast, type MemberRole };

/**
 * Load the current member and require a minimum role.
 * Viewers are read-only; agents work tickets; admins configure.
 */
export async function requireMember(min: MemberRole): Promise<
  | { ok: true; current: NonNullable<Awaited<ReturnType<typeof getCurrentMember>>> }
  | { ok: false; error: string }
> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Not signed in." };
  if (!roleAtLeast(current.member.role, min)) {
    return { ok: false, error: PERMISSION_ERROR };
  }
  return { ok: true, current };
}

/**
 * Returns the current user's membership + organization,
 * or null if the user has no workspace yet.
 */
export async function getCurrentMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: member } = await supabase
    .from("members")
    .select("*, organization:organizations(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) return null;
  return { user, member };
}
