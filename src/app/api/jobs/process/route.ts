import { NextResponse, type NextRequest } from "next/server";

import { runDueJobs } from "@/lib/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Job processor. Invoked by pg_cron every minute (retry sweep) and
 * immediately after enqueue. Authenticated with JOBS_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.JOBS_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 503 }
    );
  }

  const result = await runDueJobs(admin, 5);
  return NextResponse.json(result);
}
