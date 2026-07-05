"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Step, Trigger } from "@/lib/automations/types";
import type { Json } from "@/lib/database.types";
import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "./templates";

export type SaveResult = { error?: string; id?: string };

export async function saveAutomation(input: {
  id?: string;
  name: string;
  trigger: Trigger;
  steps: Step[];
  enabled: boolean;
}): Promise<SaveResult> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const name = input.name.trim();
  if (!name) return { error: "Give the automation a name." };
  if (input.steps.length === 0) return { error: "Add at least one step." };

  const supabase = await createClient();
  const row = {
    organization_id: current.member.organization_id,
    name,
    trigger: input.trigger as unknown as Json,
    steps: input.steps as unknown as Json,
    enabled: input.enabled,
  };

  if (input.id) {
    const { error } = await supabase
      .from("automations")
      .update(row)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/automations");
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("automations")
    .insert(row)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/automations");
  return { id: data.id };
}

export async function toggleAutomation(id: string, enabled: boolean) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("automations").update({ enabled }).eq("id", id);
  revalidatePath("/automations");
}

export async function deleteAutomation(id: string) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("automations").delete().eq("id", id);
  revalidatePath("/automations");
}

export async function createFromTemplate(templateId: string) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;
  const { current } = gate;

  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("automations")
    .insert({
      organization_id: current.member.organization_id,
      name: template.name,
      trigger: template.trigger as unknown as Json,
      steps: template.steps as unknown as Json,
      enabled: true,
    })
    .select("id")
    .single();

  revalidatePath("/automations");
  if (data) redirect(`/automations/${data.id}`);
}
