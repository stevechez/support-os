import Link from "next/link";
import { Globe, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Shared header + footer for public, non-app pages (security, terms, privacy). */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <span className="font-serif text-3xl tracking-tight">SupportOS</span>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <Link href="/security" className="transition-colors hover:text-foreground">
              Security
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login?mode=signup">Start Free</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" />
            <span className="font-serif text-base text-foreground">SupportOS</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/security" className="transition-colors hover:text-foreground">
              Security
            </Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="size-3.5" />
            <span>© 2026 SupportOS. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
