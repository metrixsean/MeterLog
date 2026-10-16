import { useState } from "react";

import type { Usage } from "@/lib/api";
import { formatAmount, formatDay, formatMoney } from "@/lib/format";

export function UsageChart({ days, unit }: { days: Usage["days"]; unit: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...days.map((d) => d.usage ?? 0));

  if (days.every((d) => d.usage === null)) {
    return (
      <p className="text-muted-foreground flex h-40 items-center justify-center text-sm">
        Not enough readings in this range.
      </p>
    );
  }

  const hovered = active === null ? null : days[active];
  const ticks = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];

  return (
    <div>
      <div className="text-muted-foreground mb-1 text-xs tabular-nums">
        {formatAmount(max)} {unit}
      </div>
      <div className="relative">
        <div className="border-border pointer-events-none absolute inset-x-0 top-0 border-t border-dashed" />
        <div
          className="border-border flex h-40 items-end gap-[2px] border-b"
          onMouseLeave={() => setActive(null)}
        >
          {days.map((d, i) => (
            <div
              key={d.date}
              className="flex h-full flex-1 items-end"
              onMouseEnter={() => setActive(i)}
            >
              {d.usage !== null && (
                <div
                  className={`w-full rounded-t-[4px] ${active === i ? "bg-chart-3" : "bg-chart-2"}`}
                  style={{ height: max > 0 ? `${(d.usage / max) * 100}%` : "1px", minHeight: 1 }}
                />
              )}
            </div>
          ))}
        </div>
        {hovered && active !== null && (
          <div
            className="bg-popover text-popover-foreground pointer-events-none absolute top-2 z-10 rounded-md border px-3 py-2 text-xs shadow-md"
            style={
              active < days.length / 2
                ? { left: `${((active + 1) / days.length) * 100}%` }
                : { right: `${((days.length - active) / days.length) * 100}%` }
            }
          >
            <p className="font-medium">{formatDay(hovered.date)}</p>
            <p className="tabular-nums">
              {hovered.usage === null ? "No data" : `${formatAmount(hovered.usage)} ${unit}`}
            </p>
            {hovered.cost !== null && (
              <p className="text-muted-foreground tabular-nums">est. {formatMoney(hovered.cost)}</p>
            )}
          </div>
        )}
      </div>
      <div className="text-muted-foreground relative mt-1 h-4 text-xs">
        {ticks.map((i) => (
          <span
            key={i}
            className="absolute"
            style={
              i === 0
                ? { left: 0 }
                : i === days.length - 1
                  ? { right: 0 }
                  : { left: `${((i + 0.5) / days.length) * 100}%`, transform: "translateX(-50%)" }
            }
          >
            {formatDay(days[i].date)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Daily usage</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Usage ({unit})</th>
            <th>Estimated cost</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.usage ?? ""}</td>
              <td>{d.cost ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
