import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Step, Trigger } from "@/lib/automations/types";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { AutomationRow } from "./automation-row";
import { TemplateCard } from "./template-card";
import { TEMPLATES } from "./templates";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { data: automations } = await supabase
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (automations ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    enabled: a.enabled,
    trigger: a.trigger as unknown as Trigger,
    steps: a.steps as unknown as Step[],
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workflows that run your support on autopilot.
          </p>
        </div>
        <Button asChild>
          <Link href="/automations/new">
            <Plus className="size-4" /> New automation
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Workflow className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No automations yet. Start from a template below, or build your
            own.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((automation) => (
            <AutomationRow key={automation.id} automation={automation} />
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Templates
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      </div>
    </div>
  );
}
