import {
  BarChart3,
  BookOpen,
  Bot,
  FlaskConical,
  GitCompareArrows,
  Inbox,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  UsersRound,
  Wand2,
  Workflow,
} from "lucide-react";

/** Primary, everyday workflow items — always visible, never collapsed. */
export const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/agents", label: "AI Agent", icon: Bot },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

/** Automation & configuration tools — grouped under a collapsible section. */
export const automationNav = {
  label: "Automation",
  items: [
    { href: "/automations", label: "Automations", icon: Workflow },
    { href: "/actions", label: "Actions", icon: Wand2 },
    { href: "/rules", label: "Rules", icon: ShieldCheck },
    { href: "/experiments", label: "Experiments", icon: GitCompareArrows },
    { href: "/simulate", label: "Simulate", icon: FlaskConical },
  ],
};

/** Org administration — always visible, at the bottom. */
export const adminNav = [
  { href: "/team", label: "Team", icon: UsersRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Flat list of every nav item, e.g. for search/command palette. */
export const nav = [...primaryNav, ...automationNav.items, ...adminNav];
