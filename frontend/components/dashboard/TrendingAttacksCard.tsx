"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { useTrending } from "@/lib/hooks/useQuery";
import { cn, truncate, relativeTime } from "@/lib/utils";

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/25",
  high:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  medium:   "bg-amber-500/15 text-amber-400 border-amber-500/25",
  low:      "bg-green-500/15 text-green-400 border-green-500/25",
};

const TYPE_BADGE: Record<string, string> = {
  actor:   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  cve:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  malware: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function TrendingAttacksCard() {
  const { data, isLoading } = useTrending();

  return (
    <div className="cyber-card flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2 border-b border-[#1e293b] shrink-0">
        <TrendingUp className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Trending Attacks
        </h2>
        <span className="ml-auto flex items-center gap-1.5">
          {data && data.length > 0 && (
            <>
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
              </span>
              <span className="text-xs text-slate-500">{data.length} trending</span>
            </>
          )}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]">
        {isLoading && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-2/3" />
                <div className="h-2.5 bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {(data ?? []).map((trend) => (
          <Link
            key={trend.id}
            href={`/trending/${trend.id}`}
            className="block px-5 py-3.5 hover:bg-white/[0.03] transition-colors duration-150 group"
          >
            <div className="flex items-start gap-2 justify-between mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors truncate">
                  {trend.topic}
                </span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded border shrink-0 capitalize", TYPE_BADGE[trend.topic_type] ?? TYPE_BADGE.actor)}>
                  {trend.topic_type}
                </span>
              </div>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0 capitalize", SEVERITY_BADGE[trend.severity] ?? SEVERITY_BADGE.low)}>
                {trend.severity}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-1.5">
              {truncate(trend.summary, 120)}
            </p>

            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500">
                {trend.article_count} {trend.article_count === 1 ? "source" : "sources"}
              </span>
              {trend.actors.length > 0 && (
                <span className="text-[10px] text-slate-600">{trend.actors.length} actor{trend.actors.length !== 1 ? "s" : ""}</span>
              )}
              {trend.cves.length > 0 && (
                <span className="text-[10px] text-slate-600">{trend.cves.length} CVE{trend.cves.length !== 1 ? "s" : ""}</span>
              )}
              <span className="ml-auto text-[10px] text-slate-600">{relativeTime(trend.last_seen)}</span>
            </div>
          </Link>
        ))}

        {!isLoading && (!data || data.length === 0) && (
          <div className="p-8 text-center text-slate-600 text-sm">No trending attacks detected</div>
        )}
      </div>
    </div>
  );
}
