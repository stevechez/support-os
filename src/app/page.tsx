import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Sparkles className="size-6" />
      </div>
      <div className="space-y-4">
        <h1 className="font-serif text-5xl tracking-tight sm:text-6xl">
          SupportOS
        </h1>
        <p className="mx-auto max-w-md text-lg text-muted-foreground">
          The operating system for AI-powered customer support. Humans
          supervise. AI resolves.
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/login">
          Get started <ArrowRight className="size-4" />
        </Link>
      </Button>
    </main>
  );
}
