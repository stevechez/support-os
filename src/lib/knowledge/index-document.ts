import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { embedTexts } from "@/lib/ai/embeddings";
import type { Database } from "@/lib/database.types";
import { chunkText } from "./chunk";
import { extractFromFile, extractFromUrl } from "./extract";

type Client = SupabaseClient<Database>;

export type DocumentSource =
  | { kind: "buffer"; fileName: string; buffer: ArrayBuffer }
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

/** Create the document row immediately (status: pending). */
export async function createPendingDocument(
  supabase: Client,
  orgId: string,
  input: {
    title: string;
    sourceType: "upload" | "url" | "markdown" | "faq";
    sourceUrl?: string;
    storagePath?: string;
  }
): Promise<{ documentId?: string; error?: string }> {
  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert({
      organization_id: orgId,
      title: input.title,
      source_type: input.sourceType,
      source_url: input.sourceUrl ?? null,
      storage_path: input.storagePath ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { documentId: data.id };
}

/**
 * Background phase: extract → chunk → embed → store.
 * Run inside `after()` so it never blocks the request.
 */
export async function processDocument(
  supabase: Client,
  orgId: string,
  documentId: string,
  source: DocumentSource
): Promise<void> {
  await supabase
    .from("knowledge_documents")
    .update({ status: "indexing" })
    .eq("id", documentId);

  try {
    const text =
      source.kind === "buffer"
        ? (await extractFromFile(source.fileName, source.buffer)).text
        : source.kind === "url"
          ? (await extractFromUrl(source.url)).text
          : source.text;

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      throw new Error("No readable text found in this document.");
    }

    // Embed in batches to stay under provider request limits.
    const BATCH = 64;
    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH) {
      embeddings.push(...(await embedTexts(chunks.slice(i, i + BATCH))));
    }

    const { error: chunkError } = await supabase
      .from("knowledge_chunks")
      .insert(
        chunks.map((content, i) => ({
          organization_id: orgId,
          document_id: documentId,
          content,
          chunk_index: i,
          embedding: JSON.stringify(embeddings[i]),
        }))
      );
    if (chunkError) throw new Error(chunkError.message);

    await supabase
      .from("knowledge_documents")
      .update({ status: "ready" })
      .eq("id", documentId);
  } catch (e) {
    console.error(`[knowledge] indexing failed for ${documentId}:`, e);
    await supabase
      .from("knowledge_documents")
      .update({ status: "error" })
      .eq("id", documentId);
  }
}
