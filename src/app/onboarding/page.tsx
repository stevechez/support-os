import { redirect } from "next/navigation";

import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const current = await getCurrentMember();
  if (current) redirect("/dashboard");

  // If this email was invited to an existing workspace, join it instead
  // of creating a new one.
  const supabase = await createClient();
  const { data: joinedOrgId } = await supabase.rpc("redeem_invitation");
  if (joinedOrgId) redirect("/dashboard");

  return <OnboardingForm />;
}
