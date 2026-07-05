import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json, Tables } from "@/lib/database.types";
import { processDocument } from "@/lib/knowledge/index-document";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;
type Job = Tables<"jobs">;

export type IndexJobPayload = {
  documentId: string;
  source:
    | { kind: "storage"; path: string; fileName: string }
    | { kind: "url"; url: string }
    | { kind: "text"; text: string };
};

/**
 * Enqueue an indexing job. Returns null when the service-role key
 * isn't configured (callers fall back to inline processing).
 */
export async function enqueueIndexJob(
  orgId: string,
  payload: IndexJobPayload
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("jobs")
    .insert({
      organization_id: orgId,
      type: "index_document",
      payload: payload as unknown as Json,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[jobs] enqueue failed:", error.message);
    return null;
  }
  return data.id;
}

async function executeJob(admin: Admin, job: Job): Promise<boolean> {
  if (job.type === "index_document") {
    const payload = job.payload as unknown as IndexJobPayload;
    const { documentId, source } = payload;

    if (source.kind === "storage") {
      const { data: blob, error } = await admin.storage
        .from("knowledge")
        .download(source.path);
      if (error || !blob) {
        throw new Error(error?.message ?? "File download failed");
      }
      return processDocument(admin, job.organization_id, documentId, {
        kind: "buffer",
        fileName: source.fileName,
        buffer: await blob.arrayBuffer(),
      });
    }
    return processDocument(admin, job.organization_id, documentId, source);
  }

  throw new Error(`Unknown job type: ${job.type}`);
}

/**
 * Claim and run due jobs. Called immediately after enqueue (fast path)
 * and every minute by pg_cron via /api/jobs/process (retry sweep).
 */
export async function runDueJobs(
  admin: Admin,
  limit = 5
): Promise<{ processed: number; failed: number }> {
  const { data: jobs, error } = await admin.rpc("claim_jobs", {
    p_limit: limit,
  });
  if (error || !jobs?.length) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    let ok = false;
    let lastError: string | null = null;
    try {
      ok = await executeJob(admin, job);
      if (!ok) lastError = "Processing reported failure";
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error";
    }

    if (ok) {
      processed++;
      await admin
        .from("jobs")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", job.id);
    } else {
      failed++;
      const exhausted = job.attempts >= job.max_attempts;
      await admin
        .from("jobs")
        .update({
          status: exhausted ? "error" : "pending",
          last_error: lastError,
          // Exponential-ish backoff: 30s, 2m, 4.5m…
          run_after: new Date(
            Date.now() + job.attempts * job.attempts * 30_000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
  }

  return { processed, failed };
}

/**
 * Fire-and-forget nudge so a freshly enqueued job runs within seconds
 * instead of waiting for the next pg_cron sweep (up to 60s later).
 * Safe to ignore failures — the cron sweep is the durability guarantee.
 */
export function kickJobProcessor(): void {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.JOBS_SECRET;
  if (!site || !secret) return;

  fetch(`${site}/api/jobs/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  }).catch(() => {
    // Ignored — pg_cron retries every minute regardless.
  });
}

/** Inline fallback when no service-role key is configured (local dev). */
export async function processInline(
  supabase: SupabaseClient<Database>,
  orgId: string,
  payload: IndexJobPayload
): Promise<void> {
  const { documentId, source } = payload;
  if (source.kind === "storage") {
    const { data: blob } = await supabase.storage
      .from("knowledge")
      .download(source.path);
    if (!blob) return;
    await processDocument(supabase, orgId, documentId, {
      kind: "buffer",
      fileName: source.fileName,
      buffer: await blob.arrayBuffer(),
    });
    return;
  }
  await processDocument(supabase, orgId, documentId, source);
}
