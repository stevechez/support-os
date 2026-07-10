"use server";

import { revalidatePath } from "next/cache";

import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { error?: string; id?: string };

export async function createExperiment(input: {
  name: string;
  agentAId: string;
  agentBId: string;
  splitPercent: number;
}): Promise<SaveResult> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const name = input.name.trim();
  if (!name) return { error: "Give the experiment a name." };
  if (!input.agentAId || !input.agentBId) {
    return { error: "Choose two agent personas to compare." };
  }
  if (input.agentAId === input.agentBId) {
    return { error: "Variant A and B must be different personas." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_experiments")
    .insert({
      organization_id: current.member.organization_id,
      name,
      agent_a_id: input.agentAId,
      agent_b_id: input.agentBId,
      split_percent: Math.min(100, Math.max(0, Math.round(input.splitPercent))),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/experiments");
  return { id: data.id };
}

export async function toggleExperiment(id: string, enabled: boolean) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("agent_experiments").update({ enabled }).eq("id", id);
  revalidatePath("/experiments");
}

export async function deleteExperiment(id: string) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("agent_experiments").delete().eq("id", id);
  revalidatePath("/experiments");
}
