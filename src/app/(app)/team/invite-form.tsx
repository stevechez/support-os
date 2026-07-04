"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

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
import { inviteMember, type TeamActionState } from "./actions";

const initial: TeamActionState = {};

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="size-4" /> Invite a teammate
        </CardTitle>
        <CardDescription>
          They join automatically when they sign up with this email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="teammate@company.com"
            />
          </div>
          <div className="w-32 space-y-2">
            <Label htmlFor="role">Role</Label>
            <NativeSelect id="role" name="role" defaultValue="agent">
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
              <option value="viewer">Viewer</option>
            </NativeSelect>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Inviting…" : "Invite"}
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
