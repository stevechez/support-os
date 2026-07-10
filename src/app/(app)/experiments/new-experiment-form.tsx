"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createExperiment } from "./actions";

export function NewExperimentForm({
  agents,
}: {
  agents: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={agents.length < 2}
        title={agents.length < 2 ? "Create at least two enabled agent personas first" : undefined}
      >
        <Plus className="size-4" /> New experiment
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New experiment</CardTitle>
        <CardDescription>
          Compare two agent personas head-to-head on real traffic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await createExperiment({
                name: String(form.get("name") ?? ""),
                agentAId: String(form.get("agentAId") ?? ""),
                agentBId: String(form.get("agentBId") ?? ""),
                splitPercent: Number(form.get("splitPercent") ?? 50),
              });
              if (result.error) setError(result.error);
              else setOpen(false);
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Friendlier tone test" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="agentAId">Variant A</Label>
              <NativeSelect id="agentAId" name="agentAId" required>
                <option value="">Choose…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentBId">Variant B</Label>
              <NativeSelect id="agentBId" name="agentBId" required>
                <option value="">Choose…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="splitPercent">% of traffic sent to variant B</Label>
            <Input
              id="splitPercent"
              name="splitPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={50}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create experiment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
