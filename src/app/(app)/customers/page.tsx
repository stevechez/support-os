import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getCurrentMember } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { initials, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const current = await getCurrentMember();
  if (!current) redirect("/onboarding");

  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*, tickets(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="font-serif text-3xl">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone you support, with full context.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-card/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-4 py-2.5 font-medium">Tickets</th>
              <th className="px-4 py-2.5 font-medium">Lifetime value</th>
              <th className="px-4 py-2.5 font-medium">Tags</th>
              <th className="px-4 py-2.5 font-medium">Since</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((customer) => {
              const who = customer.name ?? customer.email ?? "—";
              const ticketCount =
                (customer.tickets as unknown as { count: number }[])[0]
                  ?.count ?? 0;
              return (
                <tr
                  key={customer.id}
                  className="border-b last:border-0 transition-colors hover:bg-accent/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${customer.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <Avatar className="size-8">
                        <AvatarFallback>{initials(who)}</AvatarFallback>
                      </Avatar>
                      <span>
                        <span className="block font-medium">{who}</span>
                        <span className="block text-xs text-muted-foreground">
                          {customer.email}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.company ?? "—"}
                  </td>
                  <td className="px-4 py-3">{ticketCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.lifetime_value
                      ? `$${Number(customer.lifetime_value).toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {timeAgo(customer.created_at)}
                  </td>
                </tr>
              );
            })}
            {(customers ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
