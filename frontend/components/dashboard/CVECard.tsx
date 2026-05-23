"use client";

import { useCVEs } from "@/lib/hooks/useQuery";
import { Bug } from "lucide-react";
import { cn, severityColor, severityBg } from "@/lib/utils";

export function CVECard() {
  const { data, isLoading } = useCVEs({ kev: "true", limit: 10, min_cvss: "7" });

  return (
    <div className="cyber-card flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2 border-b border-[#1e293b] shrink-0">
        <Bug className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          KEV Vulnerabilities
        </h2>
        <span className="ml-auto text-xs text-slate-500">
          {data ? `${data.total} KEV entries` : ""}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_52px_80px_56px] gap-2 px-5 py-2 border-b border-[#1e293b] bg-[#0a0f1e]">
        {["CVE ID", "CVSS", "Severity", "KEV"].map((h) => (
          <span key={h} className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">{h}</span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]">
        {isLoading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        )}
        {(data?.items ?? []).map((cve) => (
          <div
            key={cve.id}
            className="grid grid-cols-[1fr_52px_80px_56px] gap-2 items-center px-5 py-2.5 hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer group"
          >
            {/* Left severity strip */}
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn("w-0.5 h-8 rounded-full shrink-0", {
                "bg-red-500": cve.severity === "critical",
                "bg-orange-500": cve.severity === "high",
                "bg-amber-500": cve.severity === "medium",
                "bg-green-500": cve.severity === "low",
                "bg-slate-600": !cve.severity,
              })} />
              <div className="min-w-0">
                <p className="text-xs font-mono font-medium text-slate-200 group-hover:text-cyan-300 transition-colors">
                  {cve.cve_id}
                </p>
                {cve.description && (
                  <p className="text-xs text-slate-600 truncate mt-0.5">{cve.description}</p>
                )}
              </div>
            </div>
            <span className={cn("text-xs font-mono font-semibold text-right", severityColor(cve.severity))}>
              {cve.cvss_score?.toFixed(1) ?? "—"}
            </span>
            <span className={cn("text-xs px-1.5 py-0.5 rounded border text-center capitalize font-medium", severityBg(cve.severity))}>
              {cve.severity ?? "unknown"}
            </span>
            <div className="flex justify-center">
              {cve.kev_status ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-mono font-bold">
                  KEV
                </span>
              ) : (
                <span className="text-[10px] text-slate-700">—</span>
              )}
            </div>
          </div>
        ))}
        {!isLoading && !data?.items.length && (
          <div className="p-8 text-center text-slate-600 text-sm">No vulnerabilities</div>
        )}
      </div>
    </div>
  );
}
