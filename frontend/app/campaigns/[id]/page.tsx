"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCampaignDetail, useCampaignIOCs, useCampaignMalware } from "@/lib/hooks/useQuery";
import { Crosshair, ArrowLeft, Shield, Users, Bug, Building2, Calendar, MapPin } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { Campaign } from "@/types";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  dormant: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  concluded: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const STATUS_BAR: Record<string, string> = {
  active: "bg-cyan-500",
  dormant: "bg-amber-500",
  concluded: "bg-slate-500",
};

const CATEGORY_STYLE: Record<string, string> = {
  worm: "bg-red-500/10 text-red-400 border-red-500/20",
  stealer: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  loader: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rat: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  backdoor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

function CampaignTimeline({ campaign, malwareCount, orgCount }: {
  campaign: Campaign;
  malwareCount: number;
  orgCount: number;
}) {
  const start = campaign.start_date ? parseISO(campaign.start_date) : null;
  const end = campaign.end_date ? parseISO(campaign.end_date) : null;
  if (!start) return null;

  const ongoing = !end && campaign.status !== "concluded";

  return (
    <div className="cyber-card p-5">
      <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
        Campaign Timeline
      </h2>
      <div className="space-y-2">
        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", STATUS_BAR[campaign.status] ?? "bg-slate-500")} style={{ width: "100%" }} />
        </div>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">{format(start, "MMM d, yyyy")}</span>
          <span className={ongoing ? "text-cyan-400" : "text-slate-400"}>
            {end ? format(end, "MMM d, yyyy") : "Present"}
          </span>
        </div>
        {(malwareCount > 0 || orgCount > 0) && (
          <div className="flex gap-2 pt-1 flex-wrap">
            {malwareCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-mono">
                {malwareCount} malware tools
              </span>
            )}
            {orgCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono">
                {orgCount} orgs affected
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useCampaignDetail(id);
  const { data: iocs } = useCampaignIOCs(id);
  const { data: malware } = useCampaignMalware(id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-slate-800 rounded w-1/3 animate-pulse" />
        <div className="cyber-card p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return <div className="p-6"><p className="text-slate-500">Campaign not found.</p></div>;
  }

  const c2Domains = (iocs?.items ?? []).filter((i) => i.type === "domain" && i.tags.includes("c2"));
  const allDomains = (iocs?.items ?? []).filter((i) => i.type === "domain");
  const domainIOCs = c2Domains.length > 0 ? c2Domains : allDomains;
  const ips = (iocs?.items ?? []).filter((i) => i.type === "ip");
  const hashes = (iocs?.items ?? []).filter((i) => i.type.startsWith("hash"));
  const urls = (iocs?.items ?? []).filter((i) => i.type === "url");

  const iocGroups = [
    { label: "C2 Domains", items: domainIOCs },
    { label: "IP Addresses", items: ips },
    { label: "File Hashes", items: hashes },
    { label: "Malicious URLs", items: urls },
  ].filter((g) => g.items.length > 0);

  const hasIocs = iocGroups.length > 0;

  return (
    <div className="p-6 space-y-6">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Campaigns
      </Link>

      {/* Compact metadata bar */}
      <div className="cyber-card p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Crosshair className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-100 mb-2">{campaign.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", STATUS_STYLE[campaign.status] ?? STATUS_STYLE.dormant)}>
                {campaign.status}
              </span>
              {campaign.campaign_type && (
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  {campaign.campaign_type}
                </span>
              )}
              {campaign.target_sectors.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 capitalize">{s}</span>
              ))}
              {campaign.target_regions.slice(0, 3).map((r) => (
                <span key={r} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
                  <MapPin className="w-3 h-3" />
                  {r}
                </span>
              ))}
            </div>
            {campaign.description && (
              <p className="text-sm text-slate-400 leading-relaxed mt-2">{campaign.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Phase timeline */}
      <CampaignTimeline
        campaign={campaign}
        malwareCount={malware?.total ?? 0}
        orgCount={campaign.affected_organizations?.length ?? 0}
      />

      {/* 3-column grid */}
      <div className={cn(
        "grid gap-6 items-start",
        hasIocs ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"
      )}>

        {/* Left column: IOCs */}
        {hasIocs && (
          <div className="cyber-card p-4">
            <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Indicators of Compromise
            </h2>
            <div className="space-y-4">
              {iocGroups.map(({ label, items }) => (
                <div key={label}>
                  <p className="text-xs text-slate-600 uppercase tracking-wide mb-2 font-mono">{label}</p>
                  <div className="space-y-1">
                    {items.slice(0, 8).map((ioc) => (
                      <div key={ioc.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-slate-800/50 border border-slate-700/50">
                        <span className="text-xs font-mono text-slate-300 break-all">{ioc.value}</span>
                        <span className={cn("text-xs font-mono shrink-0 px-1.5 py-0.5 rounded",
                          ioc.confidence >= 90 ? "bg-red-500/10 text-red-400" :
                          ioc.confidence >= 70 ? "bg-amber-500/10 text-amber-400" :
                          "bg-slate-700 text-slate-400"
                        )}>{ioc.confidence}%</span>
                      </div>
                    ))}
                    {items.length > 8 && (
                      <p className="text-xs text-slate-600 text-center pt-1">+{items.length - 8} more</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Center column: Malware + Affected Orgs */}
        <div className="space-y-4">
          {(malware?.items?.length ?? 0) > 0 && (
            <div className="cyber-card p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                <Bug className="w-3.5 h-3.5 text-red-400" />
                Malware Used
              </h2>
              <div className="space-y-2">
                {malware!.items.map((m) => (
                  <Link key={m.id} href={`/malware/${m.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-red-500/20 transition-all duration-150">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{m.name}</p>
                      {m.aliases.length > 0 && (
                        <p className="text-xs text-slate-500 font-mono truncate">{m.aliases.slice(0, 2).join(", ")}</p>
                      )}
                    </div>
                    {m.category && (
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0", CATEGORY_STYLE[m.category] ?? "bg-slate-700 text-slate-400 border-slate-600")}>
                        {m.category}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(campaign.affected_organizations?.length ?? 0) > 0 && (
            <div className="cyber-card p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                <Building2 className="w-3.5 h-3.5 text-orange-400" />
                Affected Organizations
              </h2>
              <div className="flex flex-wrap gap-2">
                {campaign.affected_organizations.map((org) => (
                  <span key={org} className="text-xs px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 font-mono">
                    {org}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Attribution + Stats + Targets */}
        <div className="space-y-4">
          <div className="cyber-card p-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Overview</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-slate-800/50 border border-slate-700/50 text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Started</p>
                <p className="text-sm text-slate-300">{campaign.start_date ? relativeTime(campaign.start_date) : "—"}</p>
              </div>
              <div className="p-3 rounded bg-slate-800/50 border border-slate-700/50 text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Ended</p>
                <p className="text-sm text-slate-300">{campaign.end_date ? relativeTime(campaign.end_date) : "Ongoing"}</p>
              </div>
              <div className="p-3 rounded bg-slate-800/50 border border-slate-700/50 text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">IOCs</p>
                <p className="text-xl font-bold text-cyan-400">{iocs?.total ?? "—"}</p>
              </div>
              <div className="p-3 rounded bg-slate-800/50 border border-slate-700/50 text-center">
                <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Malware</p>
                <p className="text-xl font-bold text-red-400">{malware?.total ?? "—"}</p>
              </div>
            </div>
          </div>

          {campaign.actor_id && (
            <div className="cyber-card p-4">
              <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Attribution
              </h2>
              <Link href={`/apts/${campaign.actor_id}`}
                className="flex items-center gap-3 p-3 rounded bg-slate-800/50 hover:bg-slate-800 border border-transparent hover:border-cyan-500/20 transition-all duration-150">
                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">View Threat Actor</p>
                  <p className="text-xs text-slate-500">Full actor profile & related campaigns</p>
                </div>
              </Link>
            </div>
          )}

          {campaign.target_sectors.length > 0 && (
            <div className="cyber-card p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Target Sectors</h2>
              <div className="flex flex-wrap gap-2">
                {campaign.target_sectors.map((s) => (
                  <span key={s} className="text-xs px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 capitalize">{s}</span>
                ))}
              </div>
            </div>
          )}

          {campaign.target_regions.length > 0 && (
            <div className="cyber-card p-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Target Regions</h2>
              <div className="flex flex-wrap gap-2">
                {campaign.target_regions.map((r) => (
                  <span key={r} className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
