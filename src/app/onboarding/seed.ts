import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

const hoursAgo = (h: number) =>
  new Date(Date.now() - h * 3600_000).toISOString();

export async function seedDemoData(
  supabase: Client,
  orgId: string,
  memberId: string
) {
  const { data: customers, error } = await supabase
    .from("customers")
    .insert([
      {
        organization_id: orgId,
        name: "Maya Rodriguez",
        email: "maya@acmecorp.com",
        company: "Acme Corp",
        lifetime_value: 4890,
        tags: ["pro-plan"],
      },
      {
        organization_id: orgId,
        name: "James Chen",
        email: "james.chen@brightlabs.io",
        company: "Bright Labs",
        lifetime_value: 1250,
        tags: ["trial"],
      },
      {
        organization_id: orgId,
        name: "Sofia Almeida",
        email: "sofia@nortewear.com",
        company: "Norte Wear",
        lifetime_value: 12400,
        tags: ["enterprise", "priority"],
      },
      {
        organization_id: orgId,
        name: "Tom Becker",
        email: "tom.becker@gmail.com",
        lifetime_value: 89,
        tags: [],
      },
    ])
    .select();

  if (error || !customers) return;

  const [maya, james, sofia, tom] = customers;

  const tickets: Database["public"]["Tables"]["tickets"]["Insert"][] = [
    {
      organization_id: orgId,
      customer_id: maya.id,
      assignee_id: memberId,
      subject: "Refund request for duplicate charge",
      status: "open",
      priority: "high",
      tags: ["billing"],
      sentiment: "negative",
      intent: "refund",
      created_at: hoursAgo(2),
    },
    {
      organization_id: orgId,
      customer_id: james.id,
      subject: "How do I invite team members?",
      status: "open",
      priority: "low",
      tags: ["product"],
      sentiment: "neutral",
      intent: "question",
      created_at: hoursAgo(5),
    },
    {
      organization_id: orgId,
      customer_id: sofia.id,
      assignee_id: memberId,
      subject: "API rate limits blocking production traffic",
      status: "waiting",
      priority: "urgent",
      tags: ["technical"],
      sentiment: "negative",
      intent: "incident",
      created_at: hoursAgo(26),
    },
    {
      organization_id: orgId,
      customer_id: tom.id,
      subject: "Password reset link expired",
      status: "resolved",
      priority: "medium",
      tags: ["technical"],
      sentiment: "neutral",
      intent: "account",
      ai_resolved: true,
      created_at: hoursAgo(30),
      resolved_at: hoursAgo(29),
    },
    {
      organization_id: orgId,
      customer_id: maya.id,
      subject: "Feature request: dark mode for dashboard",
      status: "closed",
      priority: "low",
      tags: ["product"],
      sentiment: "positive",
      intent: "feedback",
      created_at: hoursAgo(80),
      resolved_at: hoursAgo(50),
    },
  ];

  const { data: insertedTickets } = await supabase
    .from("tickets")
    .insert(tickets)
    .select();

  if (!insertedTickets) return;

  const bySubject = (s: string) =>
    insertedTickets.find((t) => t.subject.startsWith(s))!;

  const refund = bySubject("Refund request");
  const invite = bySubject("How do I invite");
  const rateLimit = bySubject("API rate limits");
  const password = bySubject("Password reset");
  const darkMode = bySubject("Feature request");

  const messages: Database["public"]["Tables"]["messages"]["Insert"][] = [
    {
      organization_id: orgId,
      ticket_id: refund.id,
      sender: "customer",
      body: "Hi, I was charged twice for my Pro subscription this month — invoice #8841 and #8852 are identical. Can you refund one of them? This is frustrating.",
      sentiment: "negative",
      created_at: hoursAgo(2),
    },
    {
      organization_id: orgId,
      ticket_id: refund.id,
      sender: "agent",
      member_id: memberId,
      body: "Hi Maya, sorry about that — I can see the duplicate charge. Looking into it now and will get the refund processed today.",
      created_at: hoursAgo(1.5),
    },
    {
      organization_id: orgId,
      ticket_id: invite.id,
      sender: "customer",
      body: "Loving the product so far! Quick question — where do I go to invite the rest of my team?",
      sentiment: "positive",
      created_at: hoursAgo(5),
    },
    {
      organization_id: orgId,
      ticket_id: rateLimit.id,
      sender: "customer",
      body: "We're hitting 429s in production since this morning. Our plan says 10k requests/min but we're being throttled at what looks like 1k. This is impacting our customers — please escalate.",
      sentiment: "negative",
      created_at: hoursAgo(26),
    },
    {
      organization_id: orgId,
      ticket_id: rateLimit.id,
      sender: "agent",
      member_id: memberId,
      body: "Sofia, escalating this to our infrastructure team right now. I'll update you within the hour.",
      created_at: hoursAgo(25),
    },
    {
      organization_id: orgId,
      ticket_id: rateLimit.id,
      sender: "agent",
      member_id: memberId,
      body: "Internal note: plan limits were misconfigured after the enterprise migration. Infra ticket INF-2291.",
      is_internal: true,
      created_at: hoursAgo(25),
    },
    {
      organization_id: orgId,
      ticket_id: password.id,
      sender: "customer",
      body: "The password reset link you sent me says it's expired. Can you send a new one?",
      created_at: hoursAgo(30),
    },
    {
      organization_id: orgId,
      ticket_id: password.id,
      sender: "ai",
      body: "Hi Tom! I've sent a fresh password reset link to tom.becker@gmail.com — it's valid for 60 minutes. If it doesn't arrive within a couple of minutes, check your spam folder. Anything else I can help with?",
      created_at: hoursAgo(29.9),
    },
    {
      organization_id: orgId,
      ticket_id: password.id,
      sender: "customer",
      body: "Got it, worked perfectly. Thanks!",
      sentiment: "positive",
      created_at: hoursAgo(29),
    },
    {
      organization_id: orgId,
      ticket_id: darkMode.id,
      sender: "customer",
      body: "Any chance you'll add a dark mode to the analytics dashboard? My eyes would thank you.",
      sentiment: "positive",
      created_at: hoursAgo(80),
    },
    {
      organization_id: orgId,
      ticket_id: darkMode.id,
      sender: "agent",
      member_id: memberId,
      body: "Great suggestion — it's on the roadmap for next quarter! Closing this for now, but we'll announce it in the changelog.",
      created_at: hoursAgo(50),
    },
  ];

  await supabase.from("messages").insert(messages);

  await supabase.from("activity_log").insert([
    {
      organization_id: orgId,
      actor_type: "system",
      action: "workspace.created",
      metadata: { demo: true },
    },
  ]);
}
