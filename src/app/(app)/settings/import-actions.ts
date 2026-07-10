"use server";

import { revalidatePath } from "next/cache";

import type { Database } from "@/lib/database.types";
import { parseCsvRecords } from "@/lib/import/csv";
import {
  normalizeImportRows,
  type ImportSource,
} from "@/lib/import/normalize";
import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type ImportState = {
  error?: string;
  success?: string;
  skipped?: number;
};

const MAX_ROWS = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Bulk-import tickets from a Zendesk or Intercom CSV export. Historical
 * backfill only — imported tickets don't trigger automations or consume
 * AI budget, since the point is populating history, not re-running live
 * automation against conversations that already happened.
 */
export async function importTickets(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const gate = await requireMember("admin");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;
  const orgId = current.member.organization_id;

  const file = formData.get("file") as File | null;
  const source = (formData.get("source") as ImportSource) || "generic";
  if (!file || file.size === 0) return { error: "Choose a CSV file to import." };
  if (file.size > 5 * 1024 * 1024) return { error: "Max file size is 5 MB." };

  const text = await file.text();
  const records = parseCsvRecords(text);
  if (records.length === 0) {
    return { error: "No rows found — check that the file is a CSV with a header row." };
  }

  const capped = records.slice(0, MAX_ROWS);
  const { tickets, errors } = normalizeImportRows(capped, source);
  if (tickets.length === 0) {
    return {
      error: `No valid rows to import. First issue: row ${errors[0]?.row} — ${errors[0]?.reason}.`,
    };
  }

  const supabase = await createClient();

  // Find-or-create customers for every unique email in the file.
  const uniqueEmails = [...new Set(tickets.map((t) => t.customerEmail))];
  const { data: existingCustomers } = await supabase
    .from("customers")
    .select("id, email")
    .eq("organization_id", orgId)
    .in("email", uniqueEmails);

  const emailToId = new Map(
    (existingCustomers ?? [])
      .filter((c): c is typeof c & { email: string } => !!c.email)
      .map((c) => [c.email.toLowerCase(), c.id])
  );

  const missingEmails = uniqueEmails.filter((e) => !emailToId.has(e));
  const nameByEmail = new Map(
    tickets
      .filter((t) => t.customerName)
      .map((t) => [t.customerEmail, t.customerName])
  );

  for (const batch of chunk(missingEmails, 200)) {
    const { data: created } = await supabase
      .from("customers")
      .insert(
        batch.map((email) => ({
          organization_id: orgId,
          email,
          name: nameByEmail.get(email) ?? email.split("@")[0],
        }))
      )
      .select("id, email");
    for (const c of created ?? []) {
      if (c.email) emailToId.set(c.email.toLowerCase(), c.id);
    }
  }

  // Insert tickets + their first message, chunked for reasonable concurrency.
  let imported = 0;
  const importErrors: string[] = [];

  for (const batch of chunk(tickets, 25)) {
    const results = await Promise.all(
      batch.map(async (t) => {
        const customerId = emailToId.get(t.customerEmail);
        if (!customerId) return false;

        const ticketInsert: Database["public"]["Tables"]["tickets"]["Insert"] = {
          organization_id: orgId,
          customer_id: customerId,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          tags: ["imported"],
          channel: "email",
          ...(t.createdAt ? { created_at: t.createdAt } : {}),
          ...(t.status === "resolved" || t.status === "closed"
            ? { resolved_at: t.createdAt ?? new Date().toISOString() }
            : {}),
        };

        const { data: ticket, error: ticketError } = await supabase
          .from("tickets")
          .insert(ticketInsert)
          .select("id")
          .single();

        if (ticketError || !ticket) {
          importErrors.push(ticketError?.message ?? "Could not create ticket");
          return false;
        }

        const { error: messageError } = await supabase.from("messages").insert({
          organization_id: orgId,
          ticket_id: ticket.id,
          sender: "customer",
          body: t.body,
          ...(t.createdAt ? { created_at: t.createdAt } : {}),
        });
        if (messageError) importErrors.push(messageError.message);

        return true;
      })
    );
    imported += results.filter(Boolean).length;
  }

  revalidatePath("/tickets");
  revalidatePath("/inbox");
  revalidatePath("/dashboard");

  const skipped = records.length - imported + errors.length;
  if (importErrors.length) {
    return {
      success: `Imported ${imported} tickets.`,
      skipped,
      error: `${importErrors.length} rows failed during insert.`,
    };
  }

  return {
    success: `Imported ${imported} ticket${imported === 1 ? "" : "s"}${
      skipped > 0 ? ` (${skipped} row${skipped === 1 ? "" : "s"} skipped — missing email or subject)` : ""
    }.`,
  };
}
