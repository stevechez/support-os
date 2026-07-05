import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

/**
 * Fixed-window rate limit backed by Postgres (safe on serverless).
 * Returns true when the request is allowed.
 */
export async function rateLimit(
  supabase: Client,
  bucket: string,
  opts: { limit: number; windowSeconds: number }
): Promise<boolean> {
  const { data: count, error } = await supabase.rpc("rate_limit_hit", {
    p_bucket: bucket,
    p_window_seconds: opts.windowSeconds,
  });

  // Fail open on infrastructure errors — availability over strictness.
  if (error) return true;

  // Opportunistic GC roughly once per ~50 hits.
  if ((count ?? 0) % 50 === 0) {
    void supabase.rpc("rate_limit_gc");
  }

  return (count ?? 0) <= opts.limit;
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
