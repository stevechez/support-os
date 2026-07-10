"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import { runAutomations } from "@/lib/automations/engine";
import { createClient } from "@/lib/supabase/server";
import { seedDemoData } from "./seed";
import { seedStarterConfig } from "./starter-config";

export type OnboardingState = { error?: string };

export async function createWorkspace(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = (formData.get("name") as string)?.trim();
  const withDemo = formData.get("demo") === "on";
  if (!name) return { error: "Please name your workspace." };

  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) +
    "-" +
    Math.random().toString(36).slice(2, 6);

  // Atomic org + owner-membership creation (RLS-safe via SQL function).
  const { data: orgId, error: orgError } = await supabase.rpc(
    "create_workspace",
    { p_name: name, p_slug: slug }
  );

  if (orgError || !orgId) {
    return { error: orgError?.message ?? "Could not create workspace." };
  }

  // Real product configuration, not demo fluff — every new workspace gets
  // the standard guardrail rules and starter automations so AI can resolve
  // or correctly escalate real conversations from the first message in,
  // instead of landing in an inert, unconfigured inbox.
  await seedStarterConfig(supabase, orgId);

  if (withDemo) {
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (member) {
      const tickets = await seedDemoData(supabase, orgId, member.id);
      // Run the newly-seeded automations against the sample tickets in the
      // background, so by the time the user lands on the dashboard, AI has
      // already auto-resolved the password reset and started drafting a
      // reply to the refund request — a real result, not just a promise.
      if (tickets?.length) {
        after(async () => {
          for (const ticket of tickets) {
            await runAutomations(supabase, orgId, "ticket.created", ticket.id);
          }
        });
      }
    }
  }

  redirect("/dashboard");
}
