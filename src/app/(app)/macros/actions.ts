"use server";

import { revalidatePath } from "next/cache";

import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { error?: string; id?: string };

export async function createMacro(
  title: string,
  body: string
): Promise<SaveResult> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle) return { error: "Give the macro a title." };
  if (!trimmedBody) return { error: "The macro body can't be empty." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("macros")
    .insert({
      organization_id: current.member.organization_id,
      title: trimmedTitle,
      body: trimmedBody,
      created_by: current.member.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/macros");
  return { id: data.id };
}

export async function updateMacro(
  id: string,
  title: string,
  body: string
): Promise<SaveResult> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle) return { error: "Give the macro a title." };
  if (!trimmedBody) return { error: "The macro body can't be empty." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("macros")
    .update({
      title: trimmedTitle,
      body: trimmedBody,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/macros");
  return { id };
}

export async function deleteMacro(id: string) {
  const gate = await requireMember("agent");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("macros").delete().eq("id", id);
  revalidatePath("/macros");
}

export type MacroOption = { id: string; title: string; body: string };

/** Lightweight list for the reply-composer picker — any member can read. */
export async function listMacros(): Promise<MacroOption[]> {
  const gate = await requireMember("viewer");
  if (!gate.ok) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("macros")
    .select("id, title, body")
    .order("title", { ascending: true });

  return data ?? [];
}
