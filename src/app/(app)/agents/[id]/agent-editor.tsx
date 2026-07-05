"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Bot, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ModelInfo } from "@/lib/ai/models";
import { saveAgent } from "../actions";

type Draft = {
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  enabled: boolean;
};

export function AgentEditor({
  initial,
  agentId,
  models,
}: {
  initial: Draft;
  agentId?: string;
  models: ModelInfo[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveAgent({ id: agentId, ...draft });
      if (res.error) setError(res.error);
      else router.push("/agents");
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> AI Agents
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Bot className="size-5" />
        </div>
        <h1 className="font-serif text-2xl">
          {agentId ? "Edit agent" : "New agent"}
        </h1>
      </div>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Billing Agent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={draft.description}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                placeholder="Precise and careful with money matters"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system_prompt">System prompt</Label>
            <Textarea
              id="system_prompt"
              value={draft.system_prompt}
              onChange={(e) =>
                setDraft((d) => ({ ...d, system_prompt: e.target.value }))
              }
              placeholder="You are a billing support specialist. Be precise about charges…"
              className="min-h-40 font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">
              Defines the persona. Ticket context and knowledge-base
              grounding are added automatically at runtime.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <NativeSelect
                id="model"
                value={draft.model}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, model: e.target.value }))
                }
              >
                <option value="">Workspace default</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.provider})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="temperature">
                Temperature · {draft.temperature.toFixed(1)}
                <span className="ml-1 font-normal text-muted-foreground">
                  {draft.temperature <= 0.3
                    ? "precise"
                    : draft.temperature <= 0.7
                      ? "balanced"
                      : "creative"}
                </span>
              </Label>
              <input
                id="temperature"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={draft.temperature}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    temperature: Number(e.target.value),
                  }))
                }
                className="h-9 w-full accent-primary"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) =>
                setDraft((d) => ({ ...d, enabled: e.target.checked }))
              }
              className="size-4 accent-primary"
            />
            Enabled — selectable in automation steps
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" asChild>
          <Link href="/agents">Cancel</Link>
        </Button>
        <Button onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Saving…" : "Save agent"}
        </Button>
      </div>
    </div>
  );
}
