"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";

export type NotificationItem = {
  label: string;
  count: number;
  href: string;
};

export function NotificationDropdown({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const total = items.reduce((sum, i) => sum + i.count, 0);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        className="relative"
      >
        <Bell className="size-4" />
        {total > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border bg-popover p-1.5 shadow-lg">
          {items.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              Nothing needs your attention right now.
            </p>
          ) : (
            items.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {item.count}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
