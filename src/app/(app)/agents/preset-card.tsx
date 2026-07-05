"use client";

import { useTransition } from "react";
import { Check, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createFromPreset } from "./actions";
import type { AgentPreset } from "./presets";

export function PresetCard({
  preset,
  alreadyCreated,
}: {
  preset: AgentPreset;
  alreadyCreated: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{preset.name}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {preset.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={pending || alreadyCreated}
          onClick={() => startTransition(() => createFromPreset(preset.id))}
        >
          {alreadyCreated ? (
            <>
              <Check className="size-3.5 text-emerald-400" /> Added
            </>
          ) : pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <>
              <Plus className="size-3.5" /> Use preset
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
