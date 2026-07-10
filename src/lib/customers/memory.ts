import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";

import { withModelFailover } from "@/lib/ai/models";
import { getOrgModelId } from "@/lib/ai/org-model";
import { checkAiBudget } from "@/lib/billing/usage";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

const MEMORY_SYSTEM =
  "You maintain a short rolling profile of a support customer for future agents to read before their next conversation. Given the customer's existing profile (if any) and the conversation that was just resolved, write an updated profile: 2-4 plain-prose sentences, no headers or bullets. Cover what's actually useful for the next agent — what they use the product for if known, recurring issues, communication preferences, and anything to be careful about (e.g. previously frustrated, technical level, VIP). Synthesize, don't transcribe. Keep it current — drop stale details the new conversation supersedes.";

/**
 * Roll a resolved ticket into the customer's cross-ticket memory
 * (customers.ai_summary), so the next conversation isn't a blank slate.
 * Best-effort: never throws, never blocks ticket resolution — a customer
 * without a summary is no worse off than today.
 */
export async function updateCustomerMemory(
  supabase: Client,
  orgId: string,
  ticketId: string
): Promise<void> {
  try {
    const { data: ticket } = await supabase
      .from("tickets")
      .select(
        "subject, customer_id, customer:customers(ai_summary), messages(sender, body, is_internal, created_at)"
      )
      .eq("id", ticketId)
      .maybeSingle();

    if (!ticket?.customer_id || !ticket.customer) return;

    const preferredId = await getOrgModelId(orgId);

    const budget = await checkAiBudget(supabase, orgId);
    if (!budget.ok) return;

    const transcript = [...ticket.messages]
      .filter((m) => !m.is_internal)
      .sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((m) => `${m.sender}: ${m.body}`)
      .join("\n");

    if (!transcript) return;

    const prompt = [
      ticket.customer.ai_summary
        ? `Existing profile:\n${ticket.customer.ai_summary}`
        : "No existing profile yet.",
      `\nJust resolved — "${ticket.subject}":\n${transcript}`,
    ].join("\n");

    const { text } = await withModelFailover(preferredId, (model) =>
      generateText({ model, system: MEMORY_SYSTEM, prompt })
    );

    await supabase
      .from("customers")
      .update({ ai_summary: text.trim().slice(0, 2000) })
      .eq("id", ticket.customer_id);
  } catch (e) {
    console.error(
      "[customer-memory] update failed:",
      e instanceof Error ? e.message : e
    );
  }
}
