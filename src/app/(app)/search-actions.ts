"use server";

import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceSearchResults = {
  customers: { id: string; name: string | null; email: string | null }[];
  tickets: { id: string; subject: string; status: string }[];
  documents: { id: string; title: string }[];
};

export async function searchWorkspace(
  query: string
): Promise<WorkspaceSearchResults> {
  const empty: WorkspaceSearchResults = {
    customers: [],
    tickets: [],
    documents: [],
  };

  const current = await getCurrentMember();
  const q = query.trim();
  if (!current || q.length < 2) return empty;

  const supabase = await createClient();
  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;

  const [{ data: customers }, { data: tickets }, { data: documents }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, name, email")
        .or(`name.ilike.${pattern},email.ilike.${pattern}`)
        .limit(5),
      supabase
        .from("tickets")
        .select("id, subject, status")
        .ilike("subject", pattern)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("knowledge_documents")
        .select("id, title")
        .ilike("title", pattern)
        .limit(5),
    ]);

  return {
    customers: customers ?? [],
    tickets: tickets ?? [],
    documents: documents ?? [],
  };
}
