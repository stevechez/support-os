import { NextResponse, type NextRequest } from "next/server";
import { generateText } from "ai";

import { embedQuery, embeddingsAvailable } from "@/lib/ai/embeddings";
import { withModelFailover } from "@/lib/ai/models";
import { getOrgModelId } from "@/lib/ai/org-model";
import { checkAiBudget } from "@/lib/billing/usage";
import { orgForToken } from "@/lib/channels/inbound";
import { createClient } from "@/lib/supabase/server";

const HELP_SYSTEM =
  "You are a public help center assistant. Answer the customer's question using ONLY the numbered knowledge base excerpts provided — never invent policies, prices, timelines, or commitments not present in the excerpts. Cite the excerpt number inline like [1] after any claim drawn from it. If the excerpts don't answer the question, say so plainly and suggest starting a chat with the team instead. Keep it under 120 words. Output only the answer — no preamble.";

/** Bootstrap data for the public help center: org name, visible docs, and
 * whether the chat widget is available as a fallback. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const supabase = await createClient();

  const orgId = await orgForToken(supabase, "help_center", token);
  if (!orgId) {
    return NextResponse.json({ error: "Help center not found." }, { status: 404 });
  }

  const [{ data: org }, { data: docs }, { data: chatSetting }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase.rpc("list_customer_visible_documents", { p_org_id: orgId }),
    supabase
      .from("settings")
      .select("value")
      .eq("organization_id", orgId)
      .eq("key", "chat_widget")
      .maybeSingle(),
  ]);

  const chatWidget = chatSetting?.value as { enabled?: boolean; token?: string } | null;

  return NextResponse.json({
    orgName: org?.name ?? "Support",
    documents: docs ?? [],
    chatWidgetToken:
      chatWidget?.enabled && chatWidget.token ? chatWidget.token : null,
    searchAvailable: embeddingsAvailable(),
  });
}

/** Answer a customer's question, grounded only in customer_visible docs. */
export async function POST(request: NextRequest) {
  let payload: { token?: string; query?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, query } = payload;
  if (!token || !query?.trim()) {
    return NextResponse.json({ error: "token and query required" }, { status: 400 });
  }

  const supabase = await createClient();
  const orgId = await orgForToken(supabase, "help_center", token);
  if (!orgId) {
    return NextResponse.json({ error: "Help center not found." }, { status: 404 });
  }

  if (!embeddingsAvailable()) {
    return NextResponse.json(
      { error: "Search isn't configured for this help center yet." },
      { status: 503 }
    );
  }

  const budget = await checkAiBudget(supabase, orgId);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.error }, { status: 429 });
  }

  const embedding = await embedQuery(query.trim().slice(0, 500));
  const { data: chunks } = await supabase.rpc("match_knowledge_chunks_public", {
    p_org_id: orgId,
    query_embedding: JSON.stringify(embedding),
    match_count: 4,
    min_similarity: 0.25,
  });

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({
      answer:
        "I couldn't find anything about that in our help articles. Try starting a chat with the team for help.",
      sources: [],
    });
  }

  const docTitles = [...new Set(chunks.map((c) => c.document_title))];
  const excerpts = chunks
    .map(
      (c) =>
        `[${docTitles.indexOf(c.document_title) + 1}] ${c.document_title}\n${c.content}`
    )
    .join("\n\n");

  try {
    const preferredId = await getOrgModelId(orgId);
    const { text } = await withModelFailover(preferredId, (model) =>
      generateText({
        model,
        system: HELP_SYSTEM,
        prompt: `Question: ${query.trim()}\n\n--- Help articles ---\n\n${excerpts}`,
      })
    );

    return NextResponse.json({
      answer: text,
      sources: docTitles.map((t, i) => ({ index: i + 1, title: t })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI error" },
      { status: 503 }
    );
  }
}
