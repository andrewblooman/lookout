"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCVEDetail } from "@/lib/hooks/useQuery";
import { cn, severityBg, severityColor, relativeTime } from "@/lib/utils";
import {
  ArrowLeft, Bug, Shield, AlertTriangle, Calendar, Package,
  Zap, Lock, Globe, Cpu,
} from "lucide-react";

function parseCVSSVector(vector: string | null) {
  if (!vector) return null;
  const parts = Object.fromEntries(
    vector.split("/").slice(1).map((p) => p.split(":") as [string, string])
  );
  const AV_MAP: Record<string, string> = { N: "Network", A: "Adjacent", L: "Local", P: "Physical" };
  const LEVEL_MAP: Record<string, string> = { N: "None", L: "Low", H: "High", R: "Required", U: "Unchanged", C: "Changed" };
  return {
    version: vector.startsWith("CVSS:") ? vector.split("/")[0].replace("CVSS:", "CVSS ") : null,
    attackVector: AV_MAP[parts.AV] ?? parts.AV ?? null,
    complexity: LEVEL_MAP[parts.AC] ?? parts.AC ?? null,
    privilegesRequired: LEVEL_MAP[parts.PR] ?? parts.PR ?? null,
    userInteraction: LEVEL_MAP[parts.UI] ?? parts.UI ?? null,
    confidentiality: LEVEL_MAP[parts.C] ?? parts.C ?? null,
    integrity: LEVEL_MAP[parts.I] ?? parts.I ?? null,
    availability: LEVEL_MAP[parts.A] ?? parts.A ?? null,
  };
}

const EXPLOIT_MATURITY_STYLE: Record<string, string> = {
  none: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  poc: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  functional: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

const METRIC_ICON: Record<string, React.ReactNode> = {
  "Network": <Globe className="w-3.5 h-3.5" />,
  "Local": <Cpu className="w-3.5 h-3.5" />,
  "Adjacent": <Cpu className="w-3.5 h-3.5" />,
  "Physical": <Lock className="w-3.5 h-3.5" />,
};

export default function CVEDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: cve, isLoading } = useCVEDetail(id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="h-8 bg-slate-800 rounded w-1/3 animate-pulse" />
        <div className="cyber-card p-6 space-y-4 animate-pulse">
          <div className="h-16 bg-slate-700 rounded w-1/4" />
          <div className="h-4 bg-slate-800 rounded w-full" />
          <div className="h-4 bg-slate-800 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!cve) {
    return (
      <div className="p-6">
        <p className="text-slate-500">CVE not found.</p>
      </div>
    );
  }

  const cvss = parseCVSSVector(cve.cvss_vector);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <Link
        href="/cves"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        CVE Intelligence
      </Link>

      {/* Hero header */}
      <div className="cyber-card p-6">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Score block */}
          <div className="flex flex-col items-center justify-center min-w-[120px] gap-2">
            <span className={cn("text-6xl font-mono font-bold leading-none", severityColor(cve.severity))}>
              {cve.cvss_score?.toFixed(1) ?? "N/A"}
            </span>
            <span className={cn("text-xs px-2.5 py-0.5 rounded border capitalize font-semibold", severityBg(cve.severity))}>
              {cve.severity ?? "unknown"}
            </span>
            {cvss?.version && (
              <span className="text-[10px] text-slate-600 font-mono">{cvss.version}</span>
            )}
          </div>

          {/* Title + badges + vector chips */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Bug className="w-4 h-4 text-cyan-400 shrink-0" />
              <h1 className="text-lg font-mono font-bold text-slate-100">{cve.cve_id}</h1>
              {cve.kev_status && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-mono font-bold">
                  KEV
                </span>
              )}
            </div>

            {cvss && (
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Attack Vector", value: cvss.attackVector },
                  { label: "Complexity", value: cvss.complexity },
                  { label: "Privileges", value: cvss.privilegesRequired },
                  { label: "User Interaction", value: cvss.userInteraction },
                ].filter((m) => m.value).map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0a0f1e] border border-[#1e293b] text-xs"
                  >
                    {metric.label === "Attack Vector" && METRIC_ICON[metric.value!] ? (
                      <span className="text-cyan-500">{METRIC_ICON[metric.value!]}</span>
                    ) : (
                      <Zap className="w-3 h-3 text-slate-500" />
                    )}
                    <span className="text-slate-500">{metric.label}:</span>
                    <span className="text-slate-200 font-medium">{metric.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="cyber-card p-5 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Vulnerability Summary
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {cve.description ?? "No description available."}
            </p>
          </div>

          {/* Affected products */}
          {cve.affected_products.length > 0 && (
            <div className="cyber-card p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                Affected Products
              </h2>
              <div className="flex flex-wrap gap-2">
                {cve.affected_products.map((product) => (
                  <span
                    key={product}
                    className="text-xs px-2.5 py-1 rounded bg-[#0a0f1e] border border-[#1e293b] text-slate-300 font-mono"
                  >
                    {product}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CVSS impact breakdown */}
          {cvss && (cvss.confidentiality || cvss.integrity || cvss.availability) && (
            <div className="cyber-card p-5 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" />
                Impact Breakdown
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Confidentiality", value: cvss.confidentiality },
                  { label: "Integrity", value: cvss.integrity },
                  { label: "Availability", value: cvss.availability },
                ].filter((m) => m.value).map((metric) => (
                  <div key={metric.label} className="p-3 rounded bg-[#0a0f1e] border border-[#1e293b] text-center">
                    <div className={cn(
                      "text-sm font-bold",
                      metric.value === "High" ? "text-red-400" :
                      metric.value === "Low" ? "text-amber-400" : "text-slate-500"
                    )}>
                      {metric.value}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{metric.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Exploit & KEV status */}
          <div className="cyber-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              Exploitability
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Exploit Maturity</span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded border capitalize",
                  EXPLOIT_MATURITY_STYLE[cve.exploit_maturity] ?? EXPLOIT_MATURITY_STYLE.none
                )}>
                  {cve.exploit_maturity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">CISA KEV</span>
                {cve.kev_status ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25 font-mono font-bold">
                    Listed
                  </span>
                ) : (
                  <span className="text-xs text-slate-600">Not listed</span>
                )}
              </div>
              {cve.kev_due_date && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">KEV Due Date</span>
                  <span className="text-xs font-mono text-amber-400">{cve.kev_due_date}</span>
                </div>
              )}
              {cve.source && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Source</span>
                  <span className="text-xs text-slate-400 font-mono">{cve.source}</span>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="cyber-card p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Timeline
            </h2>
            <div className="space-y-2.5">
              {cve.published_at && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-slate-500 shrink-0">Published</span>
                  <span className="text-xs text-slate-400 font-mono text-right">
                    {new Date(cve.published_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {cve.updated_at && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs text-slate-500 shrink-0">Updated</span>
                  <span className="text-xs text-slate-400 font-mono text-right">
                    {new Date(cve.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-slate-500 shrink-0">Added</span>
                <span className="text-xs text-slate-400 font-mono text-right">
                  {relativeTime(cve.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Raw vector */}
          {cve.cvss_vector && (
            <div className="cyber-card p-4 space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                CVSS Vector
              </h2>
              <p className="text-[10px] font-mono text-slate-500 break-all leading-relaxed">
                {cve.cvss_vector}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
