"use client";

import { useCampaigns } from "@/lib/hooks/useQuery";
import { Crosshair } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-red-500/15 text-red-400 border-red-500/25",
  dormant: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  concluded: "bg-slate-500/15 text-slate-400 border-slate-500/25",
};

export function CampaignsCard() {
  const { data, isLoading } = useCampaigns({ status: "active", limit: 8 });

  return (
    <div className="cyber-card flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2 border-b border-[#1e293b] shrink-0">
        <Crosshair className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Active Campaigns
        </h2>
        <span className="ml-auto flex items-center gap-1.5">
          {data && data.total > 0 && (
            <>
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-red-500" />
              </span>
              <span className="text-xs text-slate-500">{data.total} active</span>
            </>
          )}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]">
        {isLoading && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-2/3" />
                <div className="h-2.5 bg-slate-800 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}
        {(data?.items ?? []).map((campaign) => (
          <div key={campaign.id} className="px-5 py-3.5 hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer">
            <div className="flex items-start gap-3 justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{campaign.name}</p>
                {campaign.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {campaign.description}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded border font-medium shrink-0",
                  STATUS_STYLE[campaign.status] ?? STATUS_STYLE.dormant
                )}
              >
                {campaign.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {campaign.campaign_type && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  {campaign.campaign_type}
                </span>
              )}
              {campaign.target_sectors.slice(0, 2).map((s) => (
                <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {s}
                </span>
              ))}
              {campaign.target_regions.slice(0, 3).map((r) => (
                <span key={r} className="text-xs text-slate-600 font-mono">{r}</span>
              ))}
              <span className="ml-auto text-xs text-slate-600">
                {relativeTime(campaign.start_date)}
              </span>
            </div>
          </div>
        ))}
        {!isLoading && !data?.items.length && (
          <div className="p-8 text-center text-slate-600 text-sm">No active campaigns</div>
        )}
      </div>
    </div>
  );
}
