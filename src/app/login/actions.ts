"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

/**
 * Supabase/GoTrue errors are usually a clean sentence, but some failure
 * modes (e.g. the configured SMTP sender domain being unverified) return
 * a malformed response that the client library can't turn into a real
 * message — the fallback ends up being something like the literal
 * string "{}", which is bewildering to show a user. Never surface
 * anything that isn't a real sentence.
 */
function friendlyAuthError(message: string | undefined): string {
  const trimmed = message?.trim();
  if (!trimmed || /^[{[]/.test(trimmed)) {
    return "Something went wrong on our end. Please try again in a moment.";
  }
  return trimmed;
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: friendlyAuthError(error.message) };

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/login/mfa");
  }
  redirect("/dashboard");
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { error: friendlyAuthError(error.message) };

  // Supabase intentionally returns a 200 with no error when the email is
  // already registered, so signup can't be used to enumerate accounts.
  // The tell is an empty `identities` array on the returned (decoy) user —
  // no confirmation email is actually sent in this case. Surface that
  // distinctly instead of showing the same "check your email" message.
  if (data.user && data.user.identities?.length === 0) {
    return {
      error:
        "An account with this email already exists. Try signing in, or use \"Forgot password?\" if you don't remember it.",
    };
  }

  return {
    message: "Account created — check your email to confirm it before signing in.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) return { error: "Enter your email address." };

  const headerList = await headers();
  const origin =
    headerList.get("origin") ??
    `https://${headerList.get("host") ?? "localhost:3000"}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) return { error: friendlyAuthError(error.message) };
  return {
    message:
      "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: friendlyAuthError(error.message) };
  redirect("/dashboard");
}
