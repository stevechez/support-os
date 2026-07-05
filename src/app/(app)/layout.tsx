import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { AppHeader } from "@/components/app-header";
import { CommandPalette } from "@/components/command-palette";
import { getCurrentMember } from "@/lib/org";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const current = await getCurrentMember();

  if (!current) redirect("/onboarding");
  const { user } = current;

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
