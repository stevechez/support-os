"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { adminNav, automationNav, primaryNav } from "./nav-items";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const [automationOpen, setAutomationOpen] = useState(() =>
    automationNav.items.some((item) => isActive(item.href))
  );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"
      >
        <Menu className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60 animate-in fade-in-0"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r bg-background animate-in slide-in-from-left">
            <div className="flex h-14 items-center justify-between px-4">
              <span className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="size-3.5" />
                </span>
                <span className="font-serif text-lg">SupportOS</span>
              </span>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
              {primaryNav.map(({ href, label, icon }) => (
                <NavLink
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  active={isActive(href)}
                  onClick={() => setOpen(false)}
                />
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
                      <NavLink
                        key={href}
                        href={href}
                        label={label}
                        icon={icon}
                        active={isActive(href)}
                        onClick={() => setOpen(false)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                {adminNav.map(({ href, label, icon }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    icon={icon}
                    active={isActive(href)}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
