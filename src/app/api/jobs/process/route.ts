import { NextResponse, type NextRequest } from "next/server";

import { runStaleSweep } from "@/lib/automations/sla";
import { runDueJobs } from "@/lib/jobs";
import { runProactiveSweep } from "@/lib/proactive/sweep";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Job processor. Invoked by pg_cron every minute (retry sweep) and
 * immediately after enqueue. Authenticated with JOBS_SECRET.
 *
 * Also piggybacks the SLA sweep and the proactive-outreach sweep on this
 * same cadence — neither has a single triggering event, so both need to
 * be polled rather than fired inline like ticket.created/message.created.
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

  const [jobs, sla, proactive] = await Promise.all([
    runDueJobs(admin, 5),
    runStaleSweep(admin).catch((e) => {
      console.error("[sla] sweep failed:", e instanceof Error ? e.message : e);
      return { checked: 0, fired: 0 };
    }),
    runProactiveSweep(admin).catch((e) => {
      console.error(
        "[proactive] sweep failed:",
        e instanceof Error ? e.message : e
      );
      return { checked: 0, sent: 0 };
    }),
  ]);

  return NextResponse.json({ jobs, sla, proactive });
}
