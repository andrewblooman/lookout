"use client";

import { useState } from "react";
import { useCVEs } from "@/lib/hooks/useQuery";
import { Bug, Search } from "lucide-react";
import { cn, severityBg, severityColor } from "@/lib/utils";

const SEVERITIES = ["critical", "high", "medium", "low"];

export default function CVEsPage() {
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("");
  const [kevOnly, setKevOnly] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 25;

  const params: Record<string, string | number> = { limit, skip: page * limit };
  if (q) params.q = q;
  if (severity) params.severity = severity;
  if (kevOnly) params.kev = "true";

  const { data, isLoading } = useCVEs(params);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bug className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-100">CVE Intelligence</h1>
        <span className="ml-2 text-sm text-slate-500">{data?.total ?? "…"} entries</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search CVE ID or description…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            className="w-full bg-[#111827] border border-[#1e293b] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            aria-label="Search CVEs"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setSeverity(""); setPage(0); }}
            className={cn("px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer", !severity ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" : "border-[#1e293b] text-slate-500 hover:border-slate-600")}
          >All</button>
          {SEVERITIES.map((s) => (
            <button key={s} onClick={() => { setSeverity(s); setPage(0); }}
              className={cn("px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer capitalize", severity === s ? severityBg(s) : "border-[#1e293b] text-slate-500 hover:border-slate-600")}>
              {s}
            </button>
          ))}
          <button
            onClick={() => { setKevOnly((k) => !k); setPage(0); }}
            className={cn("px-3 py-2 text-xs rounded-lg border transition-all cursor-pointer font-mono", kevOnly ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "border-[#1e293b] text-slate-500 hover:border-slate-600")}
          >KEV Only</button>
        </div>
      </div>

      {/* Table */}
      <div className="cyber-card overflow-hidden">
        <table className="w-full text-sm" aria-label="CVE vulnerability table">
          <thead>
            <tr className="border-b border-[#1e293b] bg-[#0a0f1e]">
              {["", "CVE ID", "CVSS", "Severity", "KEV", "Due Date", "Description"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-slate-600 font-semibold first:w-1">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            {isLoading && Array.from({ length: 10 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-3 bg-slate-800 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {(data?.items ?? []).map((cve) => (
              <tr key={cve.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-0 py-0 w-0.5">
                  <div className={cn("h-full w-0.5 min-h-[52px]", {
                    "bg-red-500": cve.severity === "critical",
                    "bg-orange-500": cve.severity === "high",
                    "bg-amber-500": cve.severity === "medium",
                    "bg-green-500": cve.severity === "low",
                    "bg-slate-700": !cve.severity,
                  })} />
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-200 whitespace-nowrap group-hover:text-cyan-300 transition-colors">
                  {cve.cve_id}
                </td>
                <td className="px-4 py-3 font-mono text-xs font-semibold whitespace-nowrap">
                  <span className={severityColor(cve.severity)}>{cve.cvss_score?.toFixed(1) ?? "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", severityBg(cve.severity))}>
                    {cve.severity ?? "unknown"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {cve.kev_status ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-mono font-bold">KEV</span>
                  ) : <span className="text-slate-700 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">{cve.kev_due_date ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{cve.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !data?.items.length && (
          <div className="py-12 text-center text-slate-600">No CVEs found</div>
        )}
      </div>

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
