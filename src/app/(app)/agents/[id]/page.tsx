import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { availableModels } from "@/lib/ai/models";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { AgentEditor } from "./agent-editor";

export const metadata: Metadata = { title: "Agent" };

export default async function AgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const { id } = await params;
  const models = availableModels();

  if (id === "new") {
    return (
      <AgentEditor
        models={models}
        initial={{
          name: "",
          description: "",
          system_prompt: "",
          model: "",
          temperature: 0.7,
          enabled: true,
        }}
      />
    );
  }

  const supabase = await createClient();
  const { data: agent } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!agent) notFound();

  return (
    <AgentEditor
      agentId={agent.id}
      models={models}
      initial={{
        name: agent.name,
        description: agent.description ?? "",
        system_prompt: agent.system_prompt,
        model: models.some((m) => m.id === agent.model) ? agent.model : "",
        temperature: Number(agent.temperature),
        enabled: agent.enabled,
      }}
    />
  );
}
