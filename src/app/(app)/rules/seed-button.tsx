"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { seedStarterRules } from "./actions";

export function SeedButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => seedStarterRules())}
    >
      <Sparkles className="size-4" />
      {pending ? "Adding…" : "Add starter rules"}
    </Button>
  );
}
