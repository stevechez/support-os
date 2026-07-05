"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { AGENT_PRESETS } from "./presets";

export type AgentFormState = { error?: string; id?: string };

export async function saveAgent(input: {
  id?: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  enabled: boolean;
}): Promise<AgentFormState> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;

  const name = input.name.trim();
  if (!name) return { error: "Give the agent a name." };
  if (!input.system_prompt.trim()) {
    return { error: "The agent needs a system prompt." };
  }

  const temperature = Math.min(1, Math.max(0, input.temperature));
  const supabase = await createClient();
  const row = {
    organization_id: current.member.organization_id,
    name,
    description: input.description.trim() || null,
    system_prompt: input.system_prompt.trim(),
    model: input.model,
    temperature,
    enabled: input.enabled,
  };

  if (input.id) {
    const { error } = await supabase
      .from("agent_configs")
      .update(row)
      .eq("id", input.id);
    if (error) return { error: error.message };
    revalidatePath("/agents");
    return { id: input.id };
  }

  const { data, error } = await supabase
    .from("agent_configs")
    .insert(row)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/agents");
  return { id: data.id };
}

export async function toggleAgent(id: string, enabled: boolean) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("agent_configs").update({ enabled }).eq("id", id);
  revalidatePath("/agents");
}

export async function deleteAgent(id: string) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;

  const supabase = await createClient();
  await supabase.from("agent_configs").delete().eq("id", id);
  revalidatePath("/agents");
}

export async function createFromPreset(presetId: string) {
  const gate = await requireMember("admin");
  if (!gate.ok) return;
  const { current } = gate;

  const preset = AGENT_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("agent_configs")
    .insert({
      organization_id: current.member.organization_id,
      name: preset.name,
      description: preset.description,
      system_prompt: preset.system_prompt,
      temperature: preset.temperature,
      enabled: true,
    })
    .select("id")
    .single();

  revalidatePath("/agents");
  if (data) redirect(`/agents/${data.id}`);
}
