"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

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
import { updatePassword, type AuthState } from "@/app/login/actions";

const initialState: AuthState = {};

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(
    updatePassword,
    initialState
  );

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <KeyRound className="size-5" />
          </div>
          <h1 className="font-serif text-3xl">Choose a new password</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New password</CardTitle>
            <CardDescription>
              At least 8 characters. You&apos;ll be signed in right after.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Saving…" : "Set new password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
