import { cn } from "@/lib/utils";

/** Vertical bar chart rendered as pure SVG (server-safe, no deps). */
export function VolumeChart({
  days,
}: {
  days: { label: string; total: number; aiResolved: number }[];
}) {
  const width = 720;
  const height = 180;
  const gap = 6;
  const barWidth = (width - gap * (days.length - 1)) / days.length;
  const max = Math.max(1, ...days.map((d) => d.total));

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 22}`}
      className="w-full"
      role="img"
      aria-label="Tickets per day"
    >
      {days.map((day, i) => {
        const x = i * (barWidth + gap);
        const totalH = Math.max(2, (day.total / max) * height);
        const aiH = day.total > 0 ? (day.aiResolved / day.total) * totalH : 0;
        const showLabel =
          days.length <= 14 || i % Math.ceil(days.length / 12) === 0;
        return (
          <g key={day.label}>
            <title>{`${day.label}: ${day.total} tickets${day.aiResolved ? ` (${day.aiResolved} AI-resolved)` : ""}`}</title>
            <rect
              x={x}
              y={height - totalH}
              width={barWidth}
              height={totalH}
              rx={3}
              className="fill-primary/25"
            />
            {aiH > 0 && (
              <rect
                x={x}
                y={height - aiH}
                width={barWidth}
                height={aiH}
                rx={3}
                className="fill-emerald-500/70"
              />
            )}
            {showLabel && (
              <text
                x={x + barWidth / 2}
                y={height + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {day.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal distribution bars. */
export function Distribution({
  items,
  colors,
}: {
  items: { label: string; count: number }[];
  colors?: Record<string, string>;
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">No data yet.</p>
    );
  }

  return (
    <div className="space-y-3">
      {items
        .filter((item) => item.count > 0)
        .map((item) => {
          const pct = (item.count / total) * 100;
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="capitalize">{item.label}</span>
                <span className="text-muted-foreground">
                  {item.count} · {pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full",
                    colors?.[item.label] ?? "bg-primary/60"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold">{value}</p>
      {hint && (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
