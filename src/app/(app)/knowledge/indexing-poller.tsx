"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes the page while any document is still pending/indexing. */
export function IndexingPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(interval);
  }, [active, router]);

  return null;
}
