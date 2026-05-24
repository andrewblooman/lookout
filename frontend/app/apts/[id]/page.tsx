"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useActorDetail, useActorCampaigns, useActorIOCs } from "@/lib/hooks/useQuery";
import type { IOC } from "@/types";
import { Users, Globe2, Target, ArrowLeft, Crosshair, Shield } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";

const MOTIVATION_STYLE: Record<string, string> = {
  espionage: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  financial: "bg-green-500/10 text-green-400 border-green-500/20",
  sabotage: "bg-red-500/10 text-red-400 border-red-500/20",
  hacktivist: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  dormant: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  concluded: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function ActorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: actor, isLoading: actorLoading } = useActorDetail(id);
  const { data: campaigns } = useActorCampaigns(id);
  const { data: iocs } = useActorIOCs(id);

  if (actorLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/3 animate-pulse" />
        <div className="cyber-card p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-full" />
          <div className="h-4 bg-slate-800 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!actor) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-slate-500">Actor not found.</p>
      </div>
    );
  }

  const iocsByType = (iocs?.items ?? []).reduce<Record<string, IOC[]>>((acc, ioc) => {
    (acc[ioc.type] = acc[ioc.type] || []).push(ioc);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back nav */}
      <Link href="/apts" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Threat Actors
      </Link>

      {/* Hero */}
      <div className="cyber-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-cyan-400">{actor.name.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-slate-100">{actor.name}</h1>
              {actor.motivation && (
                <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", MOTIVATION_STYLE[actor.motivation] ?? "bg-slate-700 text-slate-300 border-slate-600")}>
                  {actor.motivation}
                </span>
              )}
              {actor.origin_country && (
                <span className="flex items-center gap-1 text-xs font-mono text-slate-400">
                  <Globe2 className="w-3.5 h-3.5" />
                  {actor.origin_country}
                </span>
              )}
            </div>
            {actor.aliases.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {actor.aliases.map((a) => (
                  <span key={a} className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">{a}</span>
                ))}
              </div>
            )}
            {actor.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{actor.description}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1e293b]">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Campaigns</p>
            <p className="text-xl font-bold text-cyan-400">{campaigns?.total ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">IOCs</p>
            <p className="text-xl font-bold text-cyan-400">{iocs?.total ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">First Seen</p>
            <p className="text-sm text-slate-300">{actor.first_seen ? relativeTime(actor.first_seen) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Last Active</p>
            <p className="text-sm text-slate-300">{actor.last_seen ? relativeTime(actor.last_seen) : "—"}</p>
          </div>
        </div>

        {actor.mitre_group_id && (
          <div className="mt-4 pt-4 border-t border-[#1e293b]">
            <a href={`https://attack.mitre.org/groups/${actor.mitre_group_id}/`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              <Target className="w-4 h-4" />
              View on MITRE ATT&CK — {actor.mitre_group_id}
            </a>
          </div>
        )}
      </div>

      {/* Campaigns */}
      {(campaigns?.items?.length ?? 0) > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            <Crosshair className="w-4 h-4 text-cyan-400" />
            Known Campaigns
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {campaigns!.items.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`}
                className="cyber-card p-4 hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all duration-150">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-100">{c.name}</p>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0 capitalize", STATUS_STYLE[c.status] ?? STATUS_STYLE.dormant)}>
                    {c.status}
                  </span>
                </div>
                {c.description && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">{c.description}</p>}
                <div className="flex gap-2 flex-wrap">
                  {c.campaign_type && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">{c.campaign_type}</span>
                  )}
                  {c.target_sectors.slice(0, 2).map((s) => (
                    <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{s}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* IOCs */}
      {(iocs?.items?.length ?? 0) > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            Indicators of Compromise
          </h2>
          {Object.entries(iocsByType).map(([type, items]) => (
            <div key={type} className="mb-4">
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-2 font-mono">{type}</p>
              <div className="cyber-card overflow-hidden">
                <table className="w-full text-xs">
                  <tbody>
                    {items.map((ioc) => (
                      <tr key={ioc.id} className="border-b border-[#1e293b] last:border-0">
                        <td className="px-4 py-2 font-mono text-slate-200 break-all">{ioc.value}</td>
                        <td className="px-4 py-2 text-right shrink-0">
                          <span className={cn("px-1.5 py-0.5 rounded text-xs font-mono",
                            ioc.confidence >= 90 ? "bg-red-500/10 text-red-400" :
                            ioc.confidence >= 70 ? "bg-amber-500/10 text-amber-400" :
                            "bg-slate-700 text-slate-400"
                          )}>{ioc.confidence}%</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 flex-wrap justify-end">
                            {ioc.tags.slice(0, 3).map((t) => (
                              <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">{t}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
