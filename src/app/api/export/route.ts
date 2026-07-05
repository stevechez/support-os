import { NextResponse } from "next/server";

import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

/**
 * Full workspace data export (JSON). RLS scopes every query to the
 * caller's organization, so no explicit org filter is strictly
 * required — but we filter explicitly for clarity and defense in depth.
 */
export async function GET() {
  const current = await getCurrentMember();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const canManage =
    current.member.role === "owner" || current.member.role === "admin";
  if (!canManage) {
    return NextResponse.json(
      { error: "Only admins and owners can export workspace data." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const [
    customers,
    tickets,
    messages,
    knowledgeDocuments,
    members,
  ] = await Promise.all([
    supabase.from("customers").select("*").eq("organization_id", orgId),
    supabase.from("tickets").select("*").eq("organization_id", orgId),
    supabase.from("messages").select("*").eq("organization_id", orgId),
    supabase
      .from("knowledge_documents")
      .select("*")
      .eq("organization_id", orgId),
    supabase
      .from("members")
      .select("id, role, created_at, user_id")
      .eq("organization_id", orgId),
  ]);

  const org = current.member.organization as unknown as {
    name: string;
    slug: string;
  };

  const payload = {
    exported_at: new Date().toISOString(),
    organization: { id: orgId, name: org?.name, slug: org?.slug },
    customers: customers.data ?? [],
    tickets: tickets.data ?? [],
    messages: messages.data ?? [],
    knowledge_documents: knowledgeDocuments.data ?? [],
    members: members.data ?? [],
  };

  const filename = `support-os-export-${org?.slug ?? orgId}-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
