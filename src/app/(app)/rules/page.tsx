import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { NewRuleForm } from "./new-rule-form";
import { RuleRow } from "./rule-row";
import { SeedButton } from "./seed-button";

export const metadata: Metadata = { title: "Business Rules" };

export default async function RulesPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("business_rules")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Business Rules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guardrails the AI can never override — not knowledge, policy.
          </p>
        </div>
        <SeedButton />
      </div>

      <NewRuleForm />

      {(rules ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ShieldCheck className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No rules yet. Add the starter set or create your own — pricing,
            refunds, availability, legal, and discounts are common ones.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(rules ?? []).map((rule) => (
            <RuleRow key={rule.id} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}
