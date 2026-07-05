import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Star } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";
import { CommentForm } from "./comment-form";

export const metadata: Metadata = {
  title: "Rate your experience",
  robots: { index: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function RatePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { token } = await params;
  const { s } = await searchParams;

  const supabase = createAdminClient();
  if (!supabase) {
    return (
      <Shell>
        <p className="text-muted-foreground">
          Rating isn&apos;t configured on this server.
        </p>
      </Shell>
    );
  }

  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, subject, csat_rating, csat_rated_at, csat_comment")
    .eq("csat_token", token)
    .maybeSingle();

  if (!ticket) {
    return (
      <Shell>
        <h1 className="font-serif text-2xl">Link not found</h1>
        <p className="text-sm text-muted-foreground">
          This rating link is invalid or has expired.
        </p>
      </Shell>
    );
  }

  // Record a new rating from ?s= — first submission wins.
  const score = Number(s);
  let rating = ticket.csat_rating;
  if (!ticket.csat_rated_at && Number.isInteger(score) && score >= 1 && score <= 5) {
    await supabase
      .from("tickets")
      .update({
        csat_rating: score,
        csat_rated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);
    rating = score;
  }

  if (!rating) {
    // No score chosen yet — show the picker.
    return (
      <Shell>
        <h1 className="font-serif text-2xl">How did we do?</h1>
        <p className="text-sm text-muted-foreground">
          Regarding “{ticket.subject}”
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Link
              key={n}
              href={`?s=${n}`}
              className="flex size-12 items-center justify-center rounded-xl border text-lg font-semibold transition-colors hover:bg-accent"
            >
              {n}
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          1 = very unsatisfied · 5 = very satisfied
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-serif text-2xl">Thank you!</h1>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(
              "size-6",
              n <= rating
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40"
            )}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Your {rating}/5 rating for “{ticket.subject}” was recorded.
      </p>
      <CommentForm token={token} existingComment={ticket.csat_comment} />
    </Shell>
  );
}
