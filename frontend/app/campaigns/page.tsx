"use client";

import { useState } from "react";
import Link from "next/link";
import { useCampaigns } from "@/lib/hooks/useQuery";
import { Crosshair, LayoutList, GanttChartSquare, Search, X } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { TimelineView } from "@/components/campaigns/TimelineView";
import type { Campaign } from "@/types";

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  dormant:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  concluded: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function CampaignDrawer({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog" aria-label={`${campaign.name} details`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-[#0f172a] border-l border-[#1e293b] flex flex-col overflow-auto">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1e293b]">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-purple-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-100">{campaign.name}</h2>
            <p className="text-xs text-slate-500">{campaign.campaign_type ?? "Unknown type"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 cursor-pointer transition-colors" aria-label="Close details">
            <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {campaign.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{campaign.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Status</p>
              <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", STATUS_STYLE[campaign.status] ?? STATUS_STYLE.dormant)}>
                {campaign.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Started</p>
              <p className="text-sm text-slate-300">{campaign.start_date ? relativeTime(campaign.start_date) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Ended</p>
              <p className="text-sm text-slate-300">{campaign.end_date ? relativeTime(campaign.end_date) : "Ongoing"}</p>
            </div>
          </div>

          {campaign.target_sectors.length > 0 && (
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">Target Sectors</p>
              <div className="flex flex-wrap gap-2">
                {campaign.target_sectors.map((s) => (
                  <span key={s} className="text-xs px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 capitalize">{s}</span>
                ))}
              </div>
            </div>
          )}

          {campaign.target_regions.length > 0 && (
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">Target Regions</p>
              <div className="flex flex-wrap gap-2">
                {campaign.target_regions.map((r) => (
                  <span key={r} className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">{r}</span>
                ))}
              </div>
            </div>
          )}

          <Link
            href={`/campaigns/${campaign.id}`}
            className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors"
          >
            <Crosshair className="w-4 h-4" />
            Full Campaign Profile
          </Link>
        </div>
      </div>
    </div>
  );
}

type View = "list" | "timeline";

export default function CampaignsPage() {
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>("list");
  const [selected, setSelected] = useState<Campaign | null>(null);
  const { data, isLoading } = useCampaigns(q ? { q, limit: 100 } : { limit: 100 });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Crosshair className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-100">Campaigns</h1>
        <span className="ml-2 text-sm text-slate-500">{data?.total ?? "…"} campaigns</span>

        <div className="ml-auto flex items-center rounded-lg border border-[#1e293b] overflow-hidden">
          {([ ["list", LayoutList, "List"], ["timeline", GanttChartSquare, "Timeline"] ] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs cursor-pointer transition-colors",
                view === id
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
              aria-pressed={view === id}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "list" && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search campaigns…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-[#111827] border border-[#1e293b] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          />
        </div>
      )}

      {view === "list" ? (
        <div className="space-y-3">
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="cyber-card p-4 animate-pulse space-y-2">
              <div className="h-4 bg-slate-700 rounded w-1/2" />
              <div className="h-3 bg-slate-800 rounded w-3/4" />
            </div>
          ))}

          {(data?.items ?? []).map((campaign) => (
            <button
              key={campaign.id}
              onClick={() => setSelected(campaign)}
              className="cyber-card p-4 text-left w-full cursor-pointer hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all duration-150 focus:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-100">{campaign.name}</p>
                  {campaign.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{campaign.description}</p>
                  )}
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded border font-medium shrink-0 capitalize", STATUS_STYLE[campaign.status] ?? STATUS_STYLE.dormant)}>
                  {campaign.status}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {campaign.campaign_type && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                    {campaign.campaign_type}
                  </span>
                )}
                {campaign.target_sectors.slice(0, 2).map((s) => (
                  <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{s}</span>
                ))}
                {campaign.target_regions.slice(0, 3).map((r) => (
                  <span key={r} className="text-xs text-slate-600 font-mono">{r}</span>
                ))}
                <span className="ml-auto text-xs text-slate-600">{relativeTime(campaign.start_date)}</span>
              </div>
            </button>
          ))}

          {!isLoading && !data?.items.length && (
            <div className="text-center py-16 text-slate-600 text-sm">No campaigns found.</div>
          )}
        </div>
      ) : (
        <div className="cyber-card p-6">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 bg-slate-800 rounded" />
              ))}
            </div>
          ) : (
            <TimelineView campaigns={data?.items ?? []} />
          )}
        </div>
      )}

      {selected && <CampaignDrawer campaign={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
