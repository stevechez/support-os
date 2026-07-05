"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { embedQuery, embeddingsAvailable, NO_EMBEDDINGS_ERROR } from "@/lib/ai/embeddings";
import { checkKnowledgeBudget } from "@/lib/billing/usage";
import { createPendingDocument } from "@/lib/knowledge/index-document";
import { enqueueIndexJob, kickJobProcessor, processInline } from "@/lib/jobs";
import { requireMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export type KnowledgeFormState = { error?: string; success?: string };

export async function uploadKnowledgeFile(
  _prev: KnowledgeFormState,
  formData: FormData
): Promise<KnowledgeFormState> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;
  if (!embeddingsAvailable()) return { error: NO_EMBEDDINGS_ERROR };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a file to upload." };
  if (file.size > 8 * 1024 * 1024) return { error: "Max file size is 8 MB." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "docx", "md", "markdown", "txt"].includes(ext)) {
    return { error: `Unsupported file type ".${ext}". Use pdf, docx, md, or txt.` };
  }

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const budget = await checkKnowledgeBudget(supabase, orgId);
  if (!budget.ok) return { error: budget.error };

  const buffer = await file.arrayBuffer();

  // Store the original file.
  const storagePath = `${orgId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: storageError } = await supabase.storage
    .from("knowledge")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
    });
  if (storageError) return { error: storageError.message };

  const { documentId, error } = await createPendingDocument(supabase, orgId, {
    title: file.name.replace(/\.[^.]+$/, ""),
    sourceType: "upload",
    storagePath,
  });
  if (error || !documentId) return { error: error ?? "Could not create document" };

  // Durable job survives serverless timeouts and retries on failure;
  // falls back to best-effort inline processing when no service role is configured.
  const source = { kind: "storage" as const, path: storagePath, fileName: file.name };
  const jobId = await enqueueIndexJob(orgId, { documentId, source });
  if (jobId) {
    kickJobProcessor();
  } else {
    after(() => processInline(supabase, orgId, { documentId, source }));
  }

  revalidatePath("/knowledge");
  return { success: `Indexing “${file.name}” — it'll be ready shortly.` };
}

export async function addKnowledgeUrl(
  _prev: KnowledgeFormState,
  formData: FormData
): Promise<KnowledgeFormState> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;
  if (!embeddingsAvailable()) return { error: NO_EMBEDDINGS_ERROR };

  const url = (formData.get("url") as string)?.trim();
  if (!url || !/^https?:\/\//.test(url)) {
    return { error: "Enter a valid http(s) URL." };
  }

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const budget = await checkKnowledgeBudget(supabase, orgId);
  if (!budget.ok) return { error: budget.error };

  const { documentId, error } = await createPendingDocument(supabase, orgId, {
    title: url.replace(/^https?:\/\//, "").slice(0, 80),
    sourceType: "url",
    sourceUrl: url,
  });
  if (error || !documentId) return { error: error ?? "Could not create document" };

  const source = { kind: "url" as const, url };
  const jobId = await enqueueIndexJob(orgId, { documentId, source });
  if (jobId) {
    kickJobProcessor();
  } else {
    after(() => processInline(supabase, orgId, { documentId, source }));
  }

  revalidatePath("/knowledge");
  return { success: `Indexing ${url} — it'll be ready shortly.` };
}

export async function addKnowledgeText(
  _prev: KnowledgeFormState,
  formData: FormData
): Promise<KnowledgeFormState> {
  const gate = await requireMember("agent");
  if (!gate.ok) return { error: gate.error };
  const { current } = gate;
  if (!embeddingsAvailable()) return { error: NO_EMBEDDINGS_ERROR };

  const title = (formData.get("title") as string)?.trim();
  const text = (formData.get("text") as string)?.trim();
  if (!title || !text) return { error: "Title and content are required." };

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const budget = await checkKnowledgeBudget(supabase, orgId);
  if (!budget.ok) return { error: budget.error };

  const { documentId, error } = await createPendingDocument(supabase, orgId, {
    title,
    sourceType: "markdown",
  });
  if (error || !documentId) return { error: error ?? "Could not create document" };

  const source = { kind: "text" as const, text };
  const jobId = await enqueueIndexJob(orgId, { documentId, source });
  if (jobId) {
    kickJobProcessor();
  } else {
    after(() => processInline(supabase, orgId, { documentId, source }));
  }

  revalidatePath("/knowledge");
  return { success: `Indexing “${title}” — it'll be ready shortly.` };
}

export async function deleteKnowledgeDocument(documentId: string) {
  const gate = await requireMember("agent");
  if (!gate.ok) return;

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
  const gate = await requireMember("viewer");
  if (!gate.ok) return { error: gate.error };
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
