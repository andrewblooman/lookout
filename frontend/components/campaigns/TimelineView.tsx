"use client";

import { cn } from "@/lib/utils";
import type { Campaign } from "@/types";
import { format, parseISO } from "date-fns";

const STATUS_COLOR: Record<string, { bar: string; badge: string }> = {
  active:    { bar: "bg-cyan-500",   badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  dormant:   { bar: "bg-amber-500",  badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  concluded: { bar: "bg-slate-500",  badge: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
};

function toMs(dateStr: string | null, fallback: number): number {
  if (!dateStr) return fallback;
  try { return parseISO(dateStr).getTime(); } catch { return fallback; }
}

export function TimelineView({ campaigns }: { campaigns: Campaign[] }) {
  const now = Date.now();
  const sorted = [...campaigns].filter((c) => c.start_date).sort(
    (a, b) => toMs(a.start_date, 0) - toMs(b.start_date, 0)
  );

  if (!sorted.length) {
    return <p className="text-slate-600 text-sm text-center py-16">No dated campaigns to display.</p>;
  }

  const minMs = toMs(sorted[0].start_date, now);
  const maxMs = Math.max(...sorted.map((c) => toMs(c.end_date, now)));
  const span = Math.max(maxMs - minMs, 1);

  // Year tick marks
  const minYear = new Date(minMs).getFullYear();
  const maxYear = new Date(maxMs).getFullYear();
  const years: number[] = [];
  for (let y = minYear; y <= maxYear + 1; y++) years.push(y);

  return (
    <div className="overflow-x-auto">
      {/* Year axis */}
      <div className="relative ml-44 mb-3 h-5">
        {years.map((year) => {
          const pct = (new Date(year, 0, 1).getTime() - minMs) / span * 100;
          if (pct < 0 || pct > 105) return null;
          return (
            <span
              key={year}
              className="absolute text-xs text-slate-600 font-mono -translate-x-1/2"
              style={{ left: `${Math.min(pct, 100)}%` }}
            >
              {year}
            </span>
          );
        })}
      </div>

      {/* Gridlines */}
      <div className="relative ml-44">
        {years.map((year) => {
          const pct = (new Date(year, 0, 1).getTime() - minMs) / span * 100;
          if (pct < 0 || pct > 100) return null;
          return (
            <div
              key={year}
              className="absolute top-0 bottom-0 w-px bg-[#1e293b] pointer-events-none"
              style={{ left: `${pct}%` }}
            />
          );
        })}

        <div className="space-y-2">
          {sorted.map((campaign) => {
            const startMs = toMs(campaign.start_date, minMs);
            const endMs = toMs(campaign.end_date, now);
            const leftPct  = ((startMs - minMs) / span) * 100;
            const widthPct = Math.max(((endMs - startMs) / span) * 100, 0.5);
            const style = STATUS_COLOR[campaign.status] ?? STATUS_COLOR.dormant;

            return (
              <div key={campaign.id} className="relative h-9 flex items-center">
                {/* Name label — fixed width to the left */}
                <div className="absolute right-full pr-3 w-44 text-right pointer-events-none">
                  <span className="text-xs text-slate-300 font-medium truncate block">{campaign.name}</span>
                  <span className={cn("text-[10px] px-1.5 py-0 rounded border", style.badge)}>
                    {campaign.status}
                  </span>
                </div>

                {/* Bar */}
                <div
                  className={cn("absolute h-5 rounded opacity-80 group cursor-default", style.bar)}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: "4px" }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-0 mb-1 z-10 bg-[#1e293b] border border-[#334155] rounded px-2 py-1 whitespace-nowrap text-xs text-slate-200 pointer-events-none transition-opacity">
                    {campaign.name}<br />
                    {campaign.start_date ? format(parseISO(campaign.start_date), "MMM d, yyyy") : "—"}
                    {" → "}
                    {campaign.end_date ? format(parseISO(campaign.end_date), "MMM d, yyyy") : "present"}
                  </div>
                </div>

                {/* Today marker */}
                {!campaign.end_date && campaign.status !== "concluded" && (
                  <div
                    className="absolute h-5 w-px bg-cyan-400/60"
                    style={{ left: `${((now - minMs) / span) * 100}%` }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-6 ml-44">
        {Object.entries(STATUS_COLOR).map(([status, s]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn("w-3 h-3 rounded-sm", s.bar)} />
            <span className="text-xs text-slate-500 capitalize">{status}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-px h-3 bg-cyan-400/60 border-l border-dashed border-cyan-400" />
          <span className="text-xs text-slate-500">today</span>
        </div>
      </div>
    </div>
  );
}
