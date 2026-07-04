import { createClient } from "@/lib/supabase/server";

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
