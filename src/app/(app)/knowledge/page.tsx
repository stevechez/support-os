import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { embeddingsAvailable } from "@/lib/ai/embeddings";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { AddKnowledge } from "./add-knowledge";
import { DocumentsTable } from "./documents-table";
import { KnowledgeSearch } from "./knowledge-search";

export const metadata: Metadata = { title: "Knowledge Base" };

export default async function KnowledgePage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("knowledge_documents")
    .select("*, knowledge_chunks(count)")
    .order("created_at", { ascending: false });

  const docs = (documents ?? []).map((d) => ({
    ...d,
    chunkCount:
      (d.knowledge_chunks as unknown as { count: number }[])[0]?.count ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-8">
      <div>
        <h1 className="font-serif text-3xl">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload docs. AI learns them instantly and cites them in replies.
        </p>
      </div>

      {!embeddingsAvailable() && (
        <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-400">
          Embeddings need an OpenAI or Google API key. Add{" "}
          <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> or{" "}
          <code className="rounded bg-muted px-1">
            GOOGLE_GENERATIVE_AI_API_KEY
          </code>{" "}
          to .env.local to enable indexing and search.
        </p>
      )}

      <AddKnowledge />

      <KnowledgeSearch />

      <DocumentsTable documents={docs} />
    </div>
  );
}
