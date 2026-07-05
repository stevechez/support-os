import { NextResponse, type NextRequest } from "next/server";

import {
  appendInboundMessage,
  createInboundTicket,
  orgForToken,
} from "@/lib/channels/inbound";
import { clientIp, rateLimit } from "@/lib/channels/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const NO_ADMIN =
  "Chat channel not configured: set SUPABASE_SERVICE_ROLE_KEY on the server.";

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

/**
 * POST { token, action: "start", email, name?, message }
 *   → { ticketId }
 * POST { token, action: "reply", ticketId, message }
 *   → { ok }
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return cors(NextResponse.json({ error: NO_ADMIN }, { status: 503 }));
  }

  let payload: {
    token?: string;
    action?: string;
    email?: string;
    name?: string;
    message?: string;
    ticketId?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return cors(
      NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    );
  }

  const allowed = await rateLimit(
    supabase,
    `chat:post:${clientIp(request)}`,
    { limit: 20, windowSeconds: 60 }
  );
  if (!allowed) {
    return cors(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
  }

  const orgId = await orgForToken(supabase, "chat_widget", payload.token ?? "");
  if (!orgId) {
    return cors(
      NextResponse.json({ error: "Invalid token" }, { status: 401 })
    );
  }

  const message = payload.message?.trim();
  if (!message || message.length > 4000) {
    return cors(
      NextResponse.json({ error: "Message required" }, { status: 400 })
    );
  }

  try {
    if (payload.action === "start") {
      const email = payload.email?.trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return cors(
          NextResponse.json({ error: "Valid email required" }, { status: 400 })
        );
      }
      const { ticketId } = await createInboundTicket(supabase, orgId, {
        channel: "chat",
        email,
        name: payload.name,
        subject: `Chat: ${message.slice(0, 80)}`,
        body: message,
      });
      return cors(NextResponse.json({ ticketId }));
    }

    if (payload.action === "reply" && payload.ticketId) {
      const ok = await appendInboundMessage(
        supabase,
        orgId,
        payload.ticketId,
        message
      );
      if (!ok) {
        return cors(
          NextResponse.json({ error: "Ticket not found" }, { status: 404 })
        );
      }
      return cors(NextResponse.json({ ok: true }));
    }

    return cors(
      NextResponse.json({ error: "Unknown action" }, { status: 400 })
    );
  } catch (e) {
    return cors(
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Server error" },
        { status: 500 }
      )
    );
  }
}

/**
 * GET ?token=…&ticketId=… → { messages: [{ id, sender, body, created_at }] }
 * Visitor-facing: internal notes are never returned.
 */
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  if (!supabase) {
    return cors(NextResponse.json({ error: NO_ADMIN }, { status: 503 }));
  }

  const token = request.nextUrl.searchParams.get("token") ?? "";
  const ticketId = request.nextUrl.searchParams.get("ticketId") ?? "";

  const allowed = await rateLimit(
    supabase,
    `chat:get:${clientIp(request)}`,
    { limit: 60, windowSeconds: 60 }
  );
  if (!allowed) {
    return cors(
      NextResponse.json({ error: "Too many requests" }, { status: 429 })
    );
  }

  const orgId = await orgForToken(supabase, "chat_widget", token);
  if (!orgId) {
    return cors(
      NextResponse.json({ error: "Invalid token" }, { status: 401 })
    );
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, status")
    .eq("id", ticketId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!ticket) {
    return cors(
      NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    );
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender, body, created_at")
    .eq("ticket_id", ticketId)
    .eq("is_internal", false)
    .neq("sender", "system")
    .order("created_at", { ascending: true });

  return cors(
    NextResponse.json({ status: ticket.status, messages: messages ?? [] })
  );
}
