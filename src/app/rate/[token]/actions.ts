"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type CommentState = { done?: boolean; error?: string };

export async function submitCsatComment(
  _prev: CommentState,
  formData: FormData
): Promise<CommentState> {
  const token = (formData.get("token") as string)?.trim();
  const comment = (formData.get("comment") as string)?.trim().slice(0, 2000);
  if (!token || !comment) return { error: "Write a comment first." };

  const supabase = createAdminClient();
  if (!supabase) return { error: "Not configured." };

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, csat_rated_at")
    .eq("csat_token", token)
    .maybeSingle();

  // Comments only on already-rated tickets — the token proves identity.
  if (!ticket || !ticket.csat_rated_at) return { error: "Invalid link." };

  await supabase
    .from("tickets")
    .update({ csat_comment: comment })
    .eq("id", ticket.id);

  return { done: true };
}
