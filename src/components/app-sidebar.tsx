"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";

import { adminNav, automationNav, primaryNav } from "@/components/nav-items";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // Default the "Automation" section open if the user is already inside it,
  // so a direct link to e.g. /rules doesn't land on a collapsed section.
  const [automationOpen, setAutomationOpen] = useState(() =>
    automationNav.items.some((item) => isActive(item.href))
  );

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card/50 lg:flex">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-3.5" />
        </div>
        <span className="font-serif text-lg">SupportOS</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {primaryNav.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} active={isActive(href)} />
        ))}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setAutomationOpen((v) => !v)}
            className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "size-3 transition-transform",
                automationOpen && "rotate-90"
              )}
            />
            {automationNav.label}
          </button>
          {automationOpen && (
            <div className="mt-0.5 space-y-0.5">
              {automationNav.items.map(({ href, label, icon }) => (
                <NavLink key={href} href={href} label={label} icon={icon} active={isActive(href)} />
              ))}
            </div>
          )}
        </div>

        <div className="pt-2">
          {adminNav.map(({ href, label, icon }) => (
            <NavLink key={href} href={href} label={label} icon={icon} active={isActive(href)} />
          ))}
        </div>
      </nav>
    </aside>
  );
}
