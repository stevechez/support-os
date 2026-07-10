import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import type { Step, Trigger } from "@/lib/automations/types";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "Automation" };

export default async function AutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const { id } = await params;
  const supabase = await createClient();

  const [{ data: members }, { data: agents }, { data: experiments }] =
    await Promise.all([
      supabase.from("members").select("id, display_name"),
      supabase
        .from("agent_configs")
        .select("id, name")
        .eq("enabled", true)
        .order("name"),
      supabase
        .from("agent_experiments")
        .select("id, name")
        .eq("enabled", true)
        .order("name"),
    ]);

  if (id === "new") {
    return (
      <Builder
        members={members ?? []}
        agents={agents ?? []}
        experiments={experiments ?? []}
        initial={{
          name: "",
          enabled: true,
          trigger: { event: "ticket.created", conditions: [] },
          steps: [],
        }}
      />
    );
  }

  const { data: automation } = await supabase
    .from("automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!automation) notFound();

  return (
    <Builder
      members={members ?? []}
      agents={agents ?? []}
      experiments={experiments ?? []}
      automationId={automation.id}
      initial={{
        name: automation.name,
        enabled: automation.enabled,
        trigger: automation.trigger as unknown as Trigger,
        steps: automation.steps as unknown as Step[],
      }}
    />
  );
}
