import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { MfaChallengeForm } from "./mfa-form";

export const metadata: Metadata = { title: "Verify it's you" };

export default async function MfaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aal || aal.nextLevel !== "aal2" || aal.currentLevel === "aal2") {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <MfaChallengeForm />
    </main>
  );
}
