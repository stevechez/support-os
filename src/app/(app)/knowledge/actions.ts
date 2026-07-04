"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { embedQuery, embeddingsAvailable, NO_EMBEDDINGS_ERROR } from "@/lib/ai/embeddings";
import { checkKnowledgeBudget } from "@/lib/billing/usage";
import { extractFromFile, extractFromUrl } from "@/lib/knowledge/extract";
import { indexDocument } from "@/lib/knowledge/index-document";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type KnowledgeFormState = { error?: string; success?: string };

export async function uploadKnowledgeFile(
  _prev: KnowledgeFormState,
  formData: FormData
): Promise<KnowledgeFormState> {
  const current = await getCurrentMember();
  if (!current) redirect("/login");
  if (!embeddingsAvailable()) return { error: NO_EMBEDDINGS_ERROR };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > 8 * 1024 * 1024) return { error: "Max file size is 8 MB." };

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const budget = await checkKnowledgeBudget(supabase, orgId);
  if (!budget.ok) return { error: budget.error };

  const buffer = await file.arrayBuffer();

  let extracted;
  try {
    extracted = await extractFromFile(file.name, buffer);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Extraction failed" };
  }

  // Store the original file.
  const storagePath = `${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: storageError } = await supabase.storage
    .from("knowledge")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
    });
  if (storageError) return { error: storageError.message };

  const { error } = await indexDocument(supabase, orgId, {
    title: extracted.title ?? file.name.replace(/\.[^.]+$/, ""),
    text: extracted.text,
    sourceType: "upload",
    storagePath,
  });

  if (error) return { error };
  revalidatePath("/knowledge");
  return { success: `Indexed “${file.name}”.` };
}

export async function addKnowledgeUrl(
  _prev: KnowledgeFormState,
  formData: FormData
): Promise<KnowledgeFormState> {
  const current = await getCurrentMember();
  if (!current) redirect("/login");
  if (!embeddingsAvailable()) return { error: NO_EMBEDDINGS_ERROR };

  const url = (formData.get("url") as string)?.trim();
  if (!url || !/^https?:\/\//.test(url)) {
    return { error: "Enter a valid http(s) URL." };
  }

  const supabase = await createClient();

  const budget = await checkKnowledgeBudget(
    supabase,
    current.member.organization_id
  );
  if (!budget.ok) return { error: budget.error };

  let extracted;
  try {
    extracted = await extractFromUrl(url);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fetch failed" };
  }

  const { error } = await indexDocument(
    supabase,
    current.member.organization_id,
    {
      title: extracted.title ?? url,
      text: extracted.text,
      sourceType: "url",
      sourceUrl: url,
    }
  );

  if (error) return { error };
  revalidatePath("/knowledge");
  return { success: `Indexed ${url}.` };
}

export async function addKnowledgeText(
  _prev: KnowledgeFormState,
  formData: FormData
): Promise<KnowledgeFormState> {
  const current = await getCurrentMember();
  if (!current) redirect("/login");
  if (!embeddingsAvailable()) return { error: NO_EMBEDDINGS_ERROR };

  const title = (formData.get("title") as string)?.trim();
  const text = (formData.get("text") as string)?.trim();
  if (!title || !text) return { error: "Title and content are required." };

  const supabase = await createClient();

  const budget = await checkKnowledgeBudget(
    supabase,
    current.member.organization_id
  );
  if (!budget.ok) return { error: budget.error };

  const { error } = await indexDocument(
    supabase,
    current.member.organization_id,
    { title, text, sourceType: "markdown" }
  );

  if (error) return { error };
  revalidatePath("/knowledge");
  return { success: `Indexed “${title}”.` };
}

export async function deleteKnowledgeDocument(documentId: string) {
  const current = await getCurrentMember();
  if (!current) redirect("/login");

  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("knowledge_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (doc?.storage_path) {
    await supabase.storage.from("knowledge").remove([doc.storage_path]);
  }

  await supabase.from("knowledge_documents").delete().eq("id", documentId);
  revalidatePath("/knowledge");
}

export type SearchHit = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;
  chunk_index: number;
  similarity: number;
};

export async function searchKnowledge(
  query: string
): Promise<{ hits?: SearchHit[]; error?: string }> {
  const current = await getCurrentMember();
  if (!current) return { error: "Not signed in." };
  if (!query.trim()) return { hits: [] };

  try {
    const embedding = await embedQuery(query);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: JSON.stringify(embedding),
      match_count: 6,
    });
    if (error) return { error: error.message };
    return { hits: data ?? [] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Search failed" };
  }
}
