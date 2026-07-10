import { NextResponse, type NextRequest } from "next/server";
import { streamText } from "ai";

import {
  CHECKLIST_SYSTEM,
  FIND_DOCS_SYSTEM,
  SUGGEST_REPLY_SYSTEM,
  SUMMARIZE_SYSTEM,
  loadTicketContext,
  retrieveKnowledge,
  referenceBlock,
} from "@/lib/ai/context";
import { embeddingsAvailable } from "@/lib/ai/embeddings";
import { getOrgModel } from "@/lib/ai/org-model";
import { checkAiBudget } from "@/lib/billing/usage";
import { PERMISSION_ERROR, roleAtLeast } from "@/lib/org";

type Kind = "summarize" | "suggest_reply" | "checklist" | "find_docs";

export async function POST(request: NextRequest) {
  let payload: { ticketId?: string; kind?: Kind };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { ticketId, kind } = payload;
  if (!ticketId || !kind) {
    return NextResponse.json(
      { error: "ticketId and kind required" },
      { status: 400 }
    );
  }

  const ctx = await loadTicketContext(ticketId);
  if (!ctx) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!roleAtLeast(ctx.current.member.role, "agent")) {
    return NextResponse.json({ error: PERMISSION_ERROR }, { status: 403 });
  }

  const orgId = ctx.current.member.organization_id;
  const resolved = await getOrgModel(orgId);
  if (!resolved) {
    return NextResponse.json(
      {
        error:
          "No AI provider configured. Add an API key to .env.local and restart.",
      },
      { status: 503 }
    );
  }

  const budget = await checkAiBudget(ctx.supabase, orgId);
  if (!budget.ok) {
    return NextResponse.json({ error: budget.error }, { status: 429 });
  }

  let system: string;
  let prompt = ctx.context;
  const headers: Record<string, string> = {};

  switch (kind) {
    case "summarize":
      system = SUMMARIZE_SYSTEM;
      break;
    case "checklist":
      system = CHECKLIST_SYSTEM;
      break;
    case "suggest_reply": {
      const chunks = await retrieveKnowledge(orgId, ctx.ticket);
      system =
        SUGGEST_REPLY_SYSTEM +
        (chunks.length > 0
          ? `\n\nYou have access to the company knowledge base excerpts below. Ground factual claims (policies, procedures, timelines) in these excerpts when relevant, and do not contradict them:\n\n${referenceBlock(chunks)}`
          : "");
      break;
    }
    case "find_docs": {
      if (!embeddingsAvailable()) {
        return NextResponse.json(
          {
            error:
              "Knowledge search needs an OpenAI or Google API key for embeddings.",
          },
          { status: 503 }
        );
      }
      const chunks = await retrieveKnowledge(orgId, ctx.ticket, 5);
      if (chunks.length === 0) {
        return new Response(
          "No relevant documentation found in the knowledge base. Try indexing more documents on the Knowledge Base page.",
          { headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      }
      const docTitles = [...new Set(chunks.map((c) => c.document_title))];
      const excerpts = chunks
        .map(
          (c) =>
            `[${docTitles.indexOf(c.document_title) + 1}] ${c.document_title}\n${c.content}`
        )
        .join("\n\n");
      system = FIND_DOCS_SYSTEM;
      prompt = `${ctx.context}\n\n--- Knowledge base excerpts ---\n\n${excerpts}`;
      headers["X-Sources"] = encodeURIComponent(
        docTitles.map((t, i) => `[${i + 1}] ${t}`).join("\n")
      );
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  }

  const result = streamText({ model: resolved.model, system, prompt });
  return result.toTextStreamResponse({ headers });
}
