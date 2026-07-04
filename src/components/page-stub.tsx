import type { LucideIcon } from "lucide-react";

export function PageStub({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="font-serif text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-12 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
        <Icon className="size-8 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Coming soon.</p>
      </div>
    </div>
  );
}
