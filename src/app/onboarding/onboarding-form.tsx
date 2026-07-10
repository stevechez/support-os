"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";

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
import { createWorkspace, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

export function OnboardingForm() {
  const [state, action, pending] = useActionState(
    createWorkspace,
    initialState
  );

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <h1 className="font-serif text-3xl">Create your workspace</h1>
          <p className="text-sm text-muted-foreground">
            One home for your team, customers, and AI agents.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>
              Usually your company or team name. We&apos;ll pre-load standard
              guardrail rules and starter automations so AI can start
              resolving and escalating real conversations right away.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Acme Inc."
                  required
                  autoFocus
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="demo"
                  defaultChecked
                  className="size-4 accent-primary"
                />
                Include sample customers and tickets, and let AI resolve
                them live so you can see it work
              </label>

              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating…" : "Create workspace"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
