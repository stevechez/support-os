import { NextResponse, type NextRequest } from "next/server";

import { createInboundTicket, orgForToken } from "@/lib/channels/inbound";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Inbound email webhook (provider-agnostic).
 *
 * POST /api/channels/email?token=…
 * Body: { from, name?, subject, text }
 *
 * Point your email provider's inbound parse webhook here, mapping
 * its payload to these fields (e.g. Resend/Postmark/SendGrid all
 * provide from/subject/text).
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Email channel not configured: set SUPABASE_SERVICE_ROLE_KEY on the server.",
      },
      { status: 503 }
    );
  }

  const token = request.nextUrl.searchParams.get("token") ?? "";
  const orgId = await orgForToken(supabase, "inbound_email", token);
  if (!orgId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  let payload: {
    from?: string;
    name?: string;
    subject?: string;
    text?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const from = payload.from?.trim();
  const text = payload.text?.trim();
  if (!from || !text) {
    return NextResponse.json(
      { error: "'from' and 'text' are required" },
      { status: 400 }
    );
  }

  try {
    const { ticketId } = await createInboundTicket(supabase, orgId, {
      channel: "email",
      email: from,
      name: payload.name,
      subject: payload.subject?.trim() || "(no subject)",
      body: text,
    });
    return NextResponse.json({ ticketId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
