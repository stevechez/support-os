import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { CommandPalette } from "@/components/command-palette";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const current = await getCurrentMember();

  if (!current) redirect("/onboarding");
  const { user } = current;

  // Safety net: a session can reach aal1 without passing through the
  // login form's redirect (e.g. a stale tab). Never let it into the app.
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect("/login/mfa");
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <CommandPalette />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader email={user.email ?? ""} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
