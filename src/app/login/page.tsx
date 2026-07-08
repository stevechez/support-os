"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, MailCheck, Sparkles } from "lucide-react";

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

type Mode = "login" | "signup" | "forgot";

function isMode(value: string | null): value is Mode {
  return value === "login" || value === "signup" || value === "forgot";
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const [mode, setMode] = useState<Mode>(
    isMode(requestedMode) ? requestedMode : "login"
  );
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

  // A successful signup replaces the form with an unmistakable
  // confirmation screen — no more "did anything happen?" ambiguity.
  const signupSucceeded = mode === "signup" && signupState.message;

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
          {signupSucceeded ? (
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <MailCheck className="size-6" />
              </div>
              <div>
                <p className="font-semibold">Check your inbox</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {signupState.message}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                onClick={() => setMode("login")}
              >
                Back to sign in
              </Button>
            </CardContent>
          ) : (
            <>
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
                {state.error && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {typeof state.error === "string" && !/^[{[]/.test(state.error)
                        ? state.error
                        : "Something went wrong on our end. Please try again in a moment."}
                    </span>
                  </div>
                )}
                {state.message && !state.error && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>{state.message}</span>
                  </div>
                )}

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
            </>
          )}
        </Card>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
