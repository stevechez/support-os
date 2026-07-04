"use client";

import { useActionState } from "react";

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
import { updateWorkspaceName } from "./actions";

export function WorkspaceSettings({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateWorkspaceName, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workspace</CardTitle>
        <CardDescription>
          Shown across your team&apos;s SupportOS.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={name} required />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
        {state.error && (
          <p className="mt-2 text-sm text-destructive">{state.error}</p>
        )}
        {state.success && (
          <p className="mt-2 text-sm text-emerald-400">{state.success}</p>
        )}
      </CardContent>
    </Card>
  );
}
