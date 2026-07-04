import { LogOut, Search } from "lucide-react";

import { signOut } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function AppHeader({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6">
      <button
        type="button"
        className="flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border bg-card/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
      >
        <Search className="size-3.5" />
        Search…
        <kbd className="ml-auto rounded border bg-muted px-1.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <form action={signOut}>
          <Button
            variant="ghost"
            size="icon"
            type="submit"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
