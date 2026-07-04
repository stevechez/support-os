"use client";

import { useTransition } from "react";
import { ArrowDown, Loader2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { describeStep } from "@/lib/automations/types";
import { createFromTemplate } from "./actions";
import type { Template } from "./templates";

export function TemplateCard({ template }: { template: Template }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm">{template.name}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {template.steps.map((step, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <ArrowDown className="size-3 -rotate-90 text-muted-foreground/50" />
              )}
              <Badge variant="secondary" className="text-[10px] font-normal">
                {describeStep(step)}
              </Badge>
            </span>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(() => createFromTemplate(template.id))}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          Use template
        </Button>
      </CardContent>
    </Card>
  );
}
