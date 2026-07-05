"use client";

import { useActionState, useState } from "react";
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
import { forgotPassword, login, signup, type AuthState } from "./actions";

const initialState: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState
  );
  const [forgotState, forgotAction, forgotPending] = useActionState(
    forgotPassword,
    initialState
  );

  const state =
    mode === "login"
      ? loginState
      : mode === "signup"
        ? signupState
        : forgotState;
  const pending =
    mode === "login"
      ? loginPending
      : mode === "signup"
        ? signupPending
        : forgotPending;

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="size-5" />
          </div>
          <h1 className="font-serif text-3xl">SupportOS</h1>
          <p className="text-sm text-muted-foreground">
            The operating system for AI-powered customer support.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {mode === "login"
                ? "Welcome back"
                : mode === "signup"
                  ? "Create your account"
                  : "Reset your password"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to your workspace."
                : mode === "signup"
                  ? "Start resolving tickets in minutes."
                  : "We'll email you a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={
                mode === "login"
                  ? loginAction
                  : mode === "signup"
                    ? signupAction
                    : forgotAction
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        onClick={() => setMode("forgot")}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={8}
                  />
                </div>
              )}

              {state.error && (
                <p className="text-sm text-destructive">{state.error}</p>
              )}
              {state.message && (
                <p className="text-sm text-muted-foreground">
                  {state.message}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={pending}>
                {pending
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Sign up"
                      : "Send reset link"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  No account?{" "}
                  <button
                    type="button"
                    className="text-foreground underline-offset-4 hover:underline"
                    onClick={() => setMode("signup")}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  {mode === "forgot"
                    ? "Remembered it? "
                    : "Already have an account? "}
                  <button
                    type="button"
                    className="text-foreground underline-offset-4 hover:underline"
                    onClick={() => setMode("login")}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
