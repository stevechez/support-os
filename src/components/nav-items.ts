import {
  BarChart3,
  BookOpen,
  Bot,
  Inbox,
  LayoutDashboard,
  Settings,
  Ticket,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";

export const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/agents", label: "AI Agent", icon: Bot },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings },
];
