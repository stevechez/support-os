import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { NotificationDropdown, type NotificationItem } from "./notification-dropdown";

/**
 * A single, lightweight place to see what actually needs attention across
 * the app — deliberately not a new subsystem: no table, no settings, just
 * cheap counts over data that already exists. As the app has grown (rules,
 * automations, actions, experiments...) this is what keeps "check every
 * page" from being the only way to know something needs you.
 */
export async function NotificationBell() {
  const current = await getCurrentMember();
  if (!current) return null;

  const supabase = await createClient();
  const orgId = current.member.organization_id;

  const [
    { count: pendingActions },
    { count: failedActions },
    { count: urgentOpen },
    { count: negativeOpen },
  ] = await Promise.all([
    supabase
      .from("action_requests")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "pending"),
    supabase
      .from("action_requests")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("status", "failed"),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("priority", "urgent")
      .in("status", ["open", "waiting"]),
    supabase
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("sentiment", "negative")
      .in("status", ["open", "waiting"]),
  ]);

  const items: NotificationItem[] = [
    {
      label: "Actions awaiting your approval",
      count: pendingActions ?? 0,
      href: "/actions",
    },
    {
      label: "Actions that failed delivery",
      count: failedActions ?? 0,
      href: "/actions",
    },
    {
      label: "Urgent tickets open",
      count: urgentOpen ?? 0,
      href: "/tickets?priority=urgent",
    },
    {
      label: "Unhappy customers waiting",
      count: negativeOpen ?? 0,
      href: "/tickets?sentiment=negative",
    },
  ].filter((item) => item.count > 0);

  return <NotificationDropdown items={items} />;
}
