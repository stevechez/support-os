import { LogOut } from "lucide-react";

import { signOut } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HeaderSearch } from "@/components/header-search";
import { MobileNav } from "@/components/mobile-nav";

export function AppHeader({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-4 sm:px-6">
      <MobileNav />
      <HeaderSearch />

      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <form action={signOut}>
          <Button variant="ghost" size="icon" type="submit" title="Sign out">
            <LogOut className="size-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
