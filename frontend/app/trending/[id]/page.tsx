"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTrendDetail } from "@/lib/hooks/useQuery";
import {
  ArrowLeft, ExternalLink, TrendingUp, Users, Bug, Shield, AlertTriangle
} from "lucide-react";
import { cn, relativeTime, truncate } from "@/lib/utils";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/25",
  high:     "bg-orange-500/15 text-orange-400 border-orange-500/25",
  medium:   "bg-amber-500/15 text-amber-400 border-amber-500/25",
  low:      "bg-green-500/15 text-green-400 border-green-500/25",
};

const TYPE_STYLE: Record<string, string> = {
  actor:   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  cve:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  malware: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const MOTIVATION_STYLE: Record<string, string> = {
  espionage: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  financial: "bg-green-500/10 text-green-400 border-green-500/20",
  sabotage:  "bg-red-500/10 text-red-400 border-red-500/20",
};

const CVE_SEVERITY_STYLE: Record<string, string> = {
  critical: "text-red-400",
  high:     "text-orange-400",
  medium:   "text-amber-400",
  low:      "text-green-400",
};

function SectionHeader({ icon: Icon, title, count }: { icon: React.ComponentType<{ className?: string }>, title: string, count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-cyan-400" aria-hidden="true" />
      <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">{title}</h2>
      <span className="text-xs text-slate-600 ml-1">({count})</span>
    </div>
  );
}

export default function TrendDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: trend, isLoading, isError } = useTrendDetail(id);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="h-4 bg-slate-800 rounded w-1/4 animate-pulse" />
        <div className="h-8 bg-slate-700 rounded w-1/2 animate-pulse" />
        <div className="h-20 bg-slate-800 rounded animate-pulse" />
      </div>
    );
  }

  if (isError || !trend) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-20">
        <AlertTriangle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500">Trend not found or no longer active.</p>
        <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back + badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-400">Trending Attacks</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", SEVERITY_STYLE[trend.severity] ?? SEVERITY_STYLE.low)}>
            {trend.severity}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", TYPE_STYLE[trend.topic_type] ?? TYPE_STYLE.actor)}>
            {trend.topic_type}
          </span>
        </div>
      </div>

      {/* Title */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-6 h-6 text-cyan-400 shrink-0" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-100">{trend.topic}</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>{trend.article_count} source{trend.article_count !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>Last seen {relativeTime(trend.last_seen)}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="cyber-card px-5 py-4">
        <p className="text-sm text-slate-300 leading-relaxed">{trend.summary}</p>
      </div>

      {/* Source Articles */}
      <div>
        <SectionHeader icon={ExternalLink} title="Source Articles" count={trend.articles.length} />
        <div className="space-y-3">
          {trend.articles.map((article) => (
            <div key={article.id} className="cyber-card px-5 py-4">
              <div className="flex items-start gap-3 justify-between">
                <div className="flex-1 min-w-0">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors group"
                  >
                    {article.title}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>
                  {article.summary && (
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                      {article.summary}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {article.source_name && (
                  <span className="text-xs text-slate-600 font-medium">{article.source_name}</span>
                )}
                {article.published_at && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="text-xs text-slate-600">{relativeTime(article.published_at)}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: Actors + CVEs */}
      {(trend.actors.length > 0 || trend.cves.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Actors */}
          {trend.actors.length > 0 && (
            <div>
              <SectionHeader icon={Users} title="Related Threat Actors" count={trend.actors.length} />
              <div className="space-y-2">
                {trend.actors.map((actor) => (
                  <Link
                    key={actor.id}
                    href="/apts"
                    className="cyber-card px-4 py-3 flex items-start gap-3 hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all duration-150 block"
                  >
                    <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-cyan-400">{actor.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200">{actor.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {actor.origin_country && (
                          <span className="text-xs font-mono text-slate-500">{actor.origin_country}</span>
                        )}
                        {actor.motivation && (
                          <span className={cn("text-xs px-1.5 py-0 rounded border capitalize", MOTIVATION_STYLE[actor.motivation] ?? "bg-slate-700 text-slate-400 border-slate-600")}>
                            {actor.motivation}
                          </span>
                        )}
                        {actor.mitre_group_id && (
                          <span className="text-xs font-mono text-slate-600">{actor.mitre_group_id}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CVEs */}
          {trend.cves.length > 0 && (
            <div>
              <SectionHeader icon={Bug} title="Related CVEs" count={trend.cves.length} />
              <div className="space-y-2">
                {trend.cves.map((cve) => (
                  <Link
                    key={cve.id}
                    href="/cves"
                    className="cyber-card px-4 py-3 hover:border-orange-500/20 hover:bg-white/[0.02] transition-all duration-150 block"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-semibold text-slate-200">{cve.cve_id}</span>
                      {cve.severity && (
                        <span className={cn("text-xs capitalize font-medium", CVE_SEVERITY_STYLE[cve.severity] ?? "text-slate-400")}>
                          {cve.severity}
                        </span>
                      )}
                      {cve.cvss_score !== null && (
                        <span className="ml-auto text-xs font-mono text-slate-500">{cve.cvss_score.toFixed(1)}</span>
                      )}
                      {cve.kev_status && (
                        <span className="text-[10px] px-1 py-0 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">KEV</span>
                      )}
                    </div>
                    {cve.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {truncate(cve.description, 120)}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* IOCs */}
      {trend.iocs.length > 0 && (
        <div>
          <SectionHeader icon={Shield} title="Related IOCs" count={trend.iocs.length} />
          <div className="cyber-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left px-4 py-2.5 text-slate-600 uppercase tracking-wide font-medium w-24">Type</th>
                  <th className="text-left px-4 py-2.5 text-slate-600 uppercase tracking-wide font-medium">Value</th>
                  <th className="text-left px-4 py-2.5 text-slate-600 uppercase tracking-wide font-medium w-24">Confidence</th>
                  <th className="text-left px-4 py-2.5 text-slate-600 uppercase tracking-wide font-medium">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]">
                {trend.iocs.map((ioc) => (
                  <tr key={ioc.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                        {ioc.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-300 max-w-xs">
                      <span className="truncate block">{ioc.value}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 rounded-full bg-slate-800 max-w-[40px]">
                          <div
                            className="h-1 rounded-full bg-cyan-500"
                            style={{ width: `${ioc.confidence}%` }}
                          />
                        </div>
                        <span className="text-slate-500">{ioc.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {ioc.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1 py-0 rounded bg-slate-800 border border-slate-700 text-slate-500 font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
