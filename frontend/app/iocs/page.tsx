"use client";

import { useState } from "react";
import { useIOCs, useIOCSummary } from "@/lib/hooks/useQuery";
import { Shield, Search } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";

const TYPE_STYLE: Record<string, string> = {
  ip: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  domain: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "hash-sha256": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "hash-md5": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "hash-sha1": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  url: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

const TYPES = ["ip", "domain", "hash-sha256", "hash-md5", "hash-sha1", "url"];

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-red-500" : value >= 60 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden" aria-label={`Confidence: ${value}%`}>
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-400 w-8 text-right">{value}%</span>
    </div>
  );
}

const TYPE_ICON: Record<string, string> = {
  ip: "IP",
  domain: "DOM",
  "hash-sha256": "SHA256",
  "hash-md5": "MD5",
  "hash-sha1": "SHA1",
  url: "URL",
};

export default function IOCsPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;
  const { data, isLoading } = useIOCs({
    limit,
    skip: page * limit,
    ...(q ? { q } : {}),
    ...(type ? { type } : {}),
  });
  const { data: summary } = useIOCSummary();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-100">Indicators of Compromise</h1>
        <span className="ml-2 text-sm text-slate-500">{data?.total ?? "…"} IOCs</span>
      </div>

      {/* Type summary widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {TYPES.map((t) => {
          const count = summary?.by_type[t] ?? null;
          const isActive = type === t;
          return (
            <button
              key={t}
              onClick={() => { setType(isActive ? "" : t); setPage(0); }}
              aria-pressed={isActive}
              className={cn(
                "cyber-card p-3 text-left transition-all cursor-pointer hover:border-cyan-500/40",
                isActive && "border-cyan-500/50 bg-cyan-500/5"
              )}
            >
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-mono", TYPE_STYLE[t] ?? "bg-slate-700 text-slate-400 border-slate-600")}>
                {TYPE_ICON[t] ?? t}
              </span>
              <div className="mt-2 text-xl font-bold text-slate-100 font-mono tabular-nums">
                {count === null ? <span className="h-5 w-12 bg-slate-800 rounded animate-pulse inline-block" /> : count.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t}</div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by value…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            className="w-full bg-[#111827] border border-[#1e293b] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            aria-label="Search IOCs by value"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setType(""); setPage(0); }}
            className={cn("px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer", !type ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-[#1e293b] text-slate-500 hover:border-slate-600")}
          >All</button>
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(0); }}
              className={cn("px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer font-mono", type === t ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-[#1e293b] text-slate-500 hover:border-slate-600")}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="cyber-card overflow-hidden">
        <table className="w-full text-sm" aria-label="Indicators of compromise table">
          <thead>
            <tr className="border-b border-[#1e293b] bg-[#0a0f1e]">
              {["Type", "Value", "Confidence", "Tags", "Last Seen", "Source"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-slate-600 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            {isLoading && Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-3 bg-slate-800 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {(data?.items ?? []).map((ioc) => (
              <tr key={ioc.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded border font-mono", TYPE_STYLE[ioc.type] ?? "bg-slate-700 text-slate-400 border-slate-600")}>
                    {ioc.type}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-xs">
                  <span className="font-mono text-xs text-slate-200 break-all">{ioc.value}</span>
                </td>
                <td className="px-4 py-3 w-32">
                  <ConfidenceBar value={ioc.confidence} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {ioc.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{relativeTime(ioc.last_seen)}</td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">{ioc.source ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !data?.items.length && (
          <div className="py-12 text-center text-slate-600">No IOCs found</div>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded border border-[#1e293b] text-slate-400 disabled:opacity-30 hover:border-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed">
              Previous
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * limit >= data.total}
              className="px-3 py-1.5 text-xs rounded border border-[#1e293b] text-slate-400 disabled:opacity-30 hover:border-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
