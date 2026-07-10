import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Zap } from "lucide-react";

import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { MacroRow } from "./macro-row";
import { NewMacroForm } from "./new-macro-form";

export const metadata: Metadata = { title: "Macros" };

export default async function MacrosPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { data: macros } = await supabase
    .from("macros")
    .select("*")
    .order("title", { ascending: true });

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h1 className="font-serif text-3xl">Macros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved replies your team can insert into any ticket in one click.
          Use{" "}
          <code className="rounded bg-muted px-1 text-xs">
            {"{{customer_name}}"}
          </code>{" "}
          and{" "}
          <code className="rounded bg-muted px-1 text-xs">
            {"{{agent_name}}"}
          </code>{" "}
          — they&apos;re filled in automatically when inserted.
        </p>
      </div>

      <NewMacroForm />

      {(macros ?? []).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Zap className="size-8 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            No macros yet. Add your most common replies — password resets,
            refund policy, shipping delays — so your team stops retyping them.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(macros ?? []).map((macro) => (
            <MacroRow key={macro.id} macro={macro} />
          ))}
        </div>
      )}
    </div>
  );
}
