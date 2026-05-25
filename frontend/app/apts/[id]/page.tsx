"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useActorDetail, useActorCampaigns, useActorIOCs } from "@/lib/hooks/useQuery";
import type { IOC } from "@/types";
import { Globe2, Target, ArrowLeft, Crosshair, Shield, Users } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

const SECTOR_COLORS = [
  "#00d4ff", "#a855f7", "#f59e0b", "#ef4444",
  "#22c55e", "#3b82f6", "#ec4899", "#06b6d4",
];

export default function ActorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: actor, isLoading: actorLoading } = useActorDetail(id);
  const { data: campaigns } = useActorCampaigns(id);
  const { data: iocs } = useActorIOCs(id);

  const sectorCounts = (campaigns?.items ?? [])
    .flatMap((c) => c.target_sectors)
    .reduce<Record<string, number>>((acc, s) => {
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
  const sectorData = Object.entries(sectorCounts).map(([name, value]) => ({ name, value }));

  const victims = [...new Set((campaigns?.items ?? []).flatMap((c) => c.affected_organizations))];
  const regions = [...new Set((campaigns?.items ?? []).flatMap((c) => c.target_regions))];

  const iocsByType = (iocs?.items ?? []).reduce<Record<string, IOC[]>>((acc, ioc) => {
    (acc[ioc.type] = acc[ioc.type] || []).push(ioc);
    return acc;
  }, {});

  if (actorLoading) {
    return (
      <div className="p-6 space-y-6">
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
      <div className="p-6">
        <p className="text-slate-500">Actor not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Link href="/apts" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Threat Actors
      </Link>

      {/* Compact header */}
      <div className="cyber-card p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-cyan-400">{actor.name.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-100">{actor.name}</h1>
              {actor.motivation && (
                <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", MOTIVATION_STYLE[actor.motivation] ?? "bg-slate-700 text-slate-300 border-slate-600")}>
                  {actor.motivation}
                </span>
              )}
              {actor.origin_country && (
                <span className="flex items-center gap-1 text-xs font-mono text-slate-400 border border-slate-700 bg-slate-800/60 px-2 py-0.5 rounded">
                  <Globe2 className="w-3 h-3" />
                  {actor.origin_country}
                </span>
              )}
              {actor.mitre_group_id && (
                <a
                  href={`https://attack.mitre.org/groups/${actor.mitre_group_id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 rounded transition-colors"
                >
                  <Target className="w-3 h-3" />
                  {actor.mitre_group_id}
                </a>
              )}
            </div>
          </div>
          {/* Inline stats */}
          <div className="flex items-center gap-6 shrink-0 border-l border-[#1e293b] pl-6">
            <div className="text-center">
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-0.5">Campaigns</p>
              <p className="text-xl font-bold text-cyan-400">{campaigns?.total ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-0.5">IOCs</p>
              <p className="text-xl font-bold text-cyan-400">{iocs?.total ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-0.5">First Seen</p>
              <p className="text-sm text-slate-300">{actor.first_seen ? relativeTime(actor.first_seen) : "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-0.5">Last Active</p>
              <p className="text-sm text-slate-300">{actor.last_seen ? relativeTime(actor.last_seen) : "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left column: Profile + Campaigns + IOCs */}
        <div className="space-y-4">
          <div className="cyber-card p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Profile</h2>
            {actor.description && (
              <p className="text-sm text-slate-300 leading-relaxed mb-3">{actor.description}</p>
            )}
            {actor.aliases.length > 0 && (
              <div>
                <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">Also known as</p>
                <div className="flex gap-2 flex-wrap">
                  {actor.aliases.map((a) => (
                    <span key={a} className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">{a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {(campaigns?.items?.length ?? 0) > 0 && (
            <div className="cyber-card p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                Known Campaigns
              </h2>
              <div className="space-y-2">
                {campaigns!.items.map((c) => (
                  <Link key={c.id} href={`/campaigns/${c.id}`}
                    className="flex items-center justify-between gap-2 p-2.5 rounded bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-cyan-500/20 transition-all duration-150">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{c.name}</p>
                      {c.campaign_type && (
                        <p className="text-xs text-slate-500 font-mono">{c.campaign_type}</p>
                      )}
                    </div>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0 capitalize", STATUS_STYLE[c.status] ?? STATUS_STYLE.dormant)}>
                      {c.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(iocs?.items?.length ?? 0) > 0 && (
            <div className="cyber-card p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Indicators of Compromise
              </h2>
              {Object.entries(iocsByType).map(([type, items]) => (
                <div key={type} className="mb-3 last:mb-0">
                  <p className="text-xs text-slate-600 uppercase tracking-wide mb-1.5 font-mono">{type}</p>
                  <div className="space-y-1">
                    {items.slice(0, 5).map((ioc) => (
                      <div key={ioc.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-slate-800/50 border border-slate-700/50">
                        <span className="text-xs font-mono text-slate-300 break-all">{ioc.value}</span>
                        <span className={cn("text-xs font-mono shrink-0 px-1.5 py-0.5 rounded",
                          ioc.confidence >= 90 ? "bg-red-500/10 text-red-400" :
                          ioc.confidence >= 70 ? "bg-amber-500/10 text-amber-400" :
                          "bg-slate-700 text-slate-400"
                        )}>{ioc.confidence}%</span>
                      </div>
                    ))}
                    {items.length > 5 && (
                      <p className="text-xs text-slate-600 text-center pt-1">+{items.length - 5} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center column: Industry Targets + Regions */}
        <div className="space-y-4">
          <div className="cyber-card p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">Industry Targets</h2>
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sectorData.map((_, i) => (
                      <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1e293b", borderRadius: "6px", fontSize: "12px" }}
                    labelStyle={{ color: "#94a3b8" }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "#94a3b8", fontSize: "11px", textTransform: "capitalize" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-600 text-sm text-center py-12">No sector data available</p>
            )}
          </div>

          {regions.length > 0 && (
            <div className="cyber-card p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Target Regions</h2>
              <div className="flex flex-wrap gap-2">
                {regions.map((r) => (
                  <span key={r} className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Victims + Related Intel */}
        <div className="space-y-4">
          {victims.length > 0 && (
            <div className="cyber-card p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                <Users className="w-3.5 h-3.5 text-red-400" />
                Victims
              </h2>
              <div className="flex flex-wrap gap-2">
                {victims.map((org) => (
                  <span key={org} className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 font-mono">
                    {org}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(campaigns?.items?.length ?? 0) > 0 && (
            <div className="cyber-card p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Related Intelligence</h2>
              <div className="space-y-2">
                {campaigns!.items.map((c) => (
                  <Link key={c.id} href={`/campaigns/${c.id}`}
                    className="block p-3 rounded bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-purple-500/20 transition-all duration-150">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-100">{c.name}</p>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0 capitalize", STATUS_STYLE[c.status] ?? STATUS_STYLE.dormant)}>
                        {c.status}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {c.target_sectors.slice(0, 3).map((s) => (
                        <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{s}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
