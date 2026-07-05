import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { AgentCard } from "./agent-card";
import { PresetCard } from "./preset-card";
import { AGENT_PRESETS } from "./presets";

export const metadata: Metadata = { title: "AI Agents" };

export default async function AgentsPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { data: agents } = await supabase
    .from("agent_configs")
    .select("*")
    .order("created_at", { ascending: true });

  const existingNames = new Set((agents ?? []).map((a) => a.name));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">AI Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personas with their own prompt, model, and temperament —
            used by automations when drafting and sending replies.
          </p>
        </div>
        <Button asChild>
          <Link href="/agents/new">
            <Plus className="size-4" /> New agent
          </Link>
        </Button>
      </div>

      {(agents ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Bot className="size-8 text-muted-foreground/60" />
          <p className="max-w-sm text-sm text-muted-foreground">
            No agents yet. Start from a preset below — each one is tuned
            for a different kind of conversation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(agents ?? []).map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Presets
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENT_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              alreadyCreated={existingNames.has(preset.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
