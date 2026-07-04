import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { embedTexts } from "@/lib/ai/embeddings";
import type { Database } from "@/lib/database.types";
import { chunkText } from "./chunk";

type Client = SupabaseClient<Database>;

/**
 * Creates a knowledge_documents row, chunks + embeds the text,
 * and stores the chunks. Marks the document ready or error.
 */
export async function indexDocument(
  supabase: Client,
  orgId: string,
  input: {
    title: string;
    text: string;
    sourceType: "upload" | "url" | "markdown" | "faq";
    sourceUrl?: string;
    storagePath?: string;
  }
): Promise<{ documentId?: string; error?: string }> {
  const { data: doc, error: docError } = await supabase
    .from("knowledge_documents")
    .insert({
      organization_id: orgId,
      title: input.title,
      source_type: input.sourceType,
      source_url: input.sourceUrl ?? null,
      storage_path: input.storagePath ?? null,
      status: "indexing",
    })
    .select("id")
    .single();

  if (docError) return { error: docError.message };

  try {
    const chunks = chunkText(input.text);
    if (chunks.length === 0) {
      throw new Error("No readable text found in this document.");
    }

    // Embed in batches to stay under provider request limits.
    const BATCH = 64;
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = await embedTexts(chunks.slice(i, i + BATCH));
      embeddings.push(...batch);
    }

    const { error: chunkError } = await supabase
      .from("knowledge_chunks")
      .insert(
        chunks.map((content, i) => ({
          organization_id: orgId,
          document_id: doc.id,
          content,
          chunk_index: i,
          embedding: JSON.stringify(embeddings[i]),
        }))
      );

    if (chunkError) throw new Error(chunkError.message);

    await supabase
      .from("knowledge_documents")
      .update({ status: "ready" })
      .eq("id", doc.id);

    return { documentId: doc.id };
  } catch (e) {
    await supabase
      .from("knowledge_documents")
      .update({ status: "error" })
      .eq("id", doc.id);
    return { error: e instanceof Error ? e.message : "Indexing failed" };
  }
}
