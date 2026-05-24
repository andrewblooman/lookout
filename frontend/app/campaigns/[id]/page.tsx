"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCampaignDetail, useCampaignIOCs, useCampaignMalware } from "@/lib/hooks/useQuery";
import type { IOC } from "@/types";
import { Crosshair, ArrowLeft, Shield, Users, Bug, Building2 } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  dormant: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  concluded: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

const CATEGORY_STYLE: Record<string, string> = {
  worm: "bg-red-500/10 text-red-400 border-red-500/20",
  stealer: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  loader: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rat: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  backdoor: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaign, isLoading } = useCampaignDetail(id);
  const { data: iocs } = useCampaignIOCs(id);
  const { data: malware } = useCampaignMalware(id);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
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

  const iocsByType = (iocs?.items ?? []).reduce<Record<string, IOC[]>>((acc, ioc) => {
    (acc[ioc.type] = acc[ioc.type] || []).push(ioc);
    return acc;
  }, {});

  const c2Domains = (iocs?.items ?? []).filter((i) => i.type === "domain" && i.tags.includes("c2"));
  const hashes = (iocs?.items ?? []).filter((i) => i.type.startsWith("hash"));
  const ips = (iocs?.items ?? []).filter((i) => i.type === "ip");
  const urls = (iocs?.items ?? []).filter((i) => i.type === "url");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/campaigns" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Campaigns
      </Link>

      {/* Hero */}
      <div className="cyber-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Crosshair className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold text-slate-100">{campaign.name}</h1>
              <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", STATUS_STYLE[campaign.status] ?? STATUS_STYLE.dormant)}>
                {campaign.status}
              </span>
              {campaign.campaign_type && (
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  {campaign.campaign_type}
                </span>
              )}
            </div>
            {campaign.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{campaign.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1e293b]">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Started</p>
            <p className="text-sm text-slate-300">{campaign.start_date ? relativeTime(campaign.start_date) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Ended</p>
            <p className="text-sm text-slate-300">{campaign.end_date ? relativeTime(campaign.end_date) : "Ongoing"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">IOCs</p>
            <p className="text-xl font-bold text-cyan-400">{iocs?.total ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Malware</p>
            <p className="text-xl font-bold text-cyan-400">{malware?.total ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Actor attribution */}
        {campaign.actor_id && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              <Users className="w-4 h-4 text-cyan-400" />
              Attribution
            </h2>
            <Link href={`/apts/${campaign.actor_id}`}
              className="cyber-card p-4 flex items-center gap-3 hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all duration-150">
              <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">View Threat Actor</p>
                <p className="text-xs text-slate-500">Full actor profile & related campaigns</p>
              </div>
            </Link>
          </section>
        )}

        {/* Malware */}
        {(malware?.items?.length ?? 0) > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
              <Bug className="w-4 h-4 text-cyan-400" />
              Malware Used
            </h2>
            <div className="space-y-2">
              {malware!.items.map((m) => (
                <Link key={m.id} href={`/malware/${m.id}`}
                  className="cyber-card p-4 flex items-center gap-3 hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all duration-150">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-100">{m.name}</p>
                      {m.category && (
                        <span className={cn("text-xs px-1.5 py-0.5 rounded border", CATEGORY_STYLE[m.category] ?? "bg-slate-700 text-slate-400 border-slate-600")}>
                          {m.category}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {m.aliases.slice(0, 3).map((a) => (
                        <span key={a} className="text-xs font-mono text-slate-500">{a}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Affected Organizations */}
      {(campaign.affected_organizations?.length ?? 0) > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            <Building2 className="w-4 h-4 text-cyan-400" />
            Affected Organizations
          </h2>
          <div className="cyber-card p-4">
            <div className="flex flex-wrap gap-2">
              {campaign.affected_organizations.map((org) => (
                <span key={org} className="text-sm px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 font-mono">
                  {org}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Target sectors & regions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {campaign.target_sectors.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Target Sectors</h2>
            <div className="flex flex-wrap gap-2">
              {campaign.target_sectors.map((s) => (
                <span key={s} className="text-xs px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 capitalize">{s}</span>
              ))}
            </div>
          </section>
        )}
        {campaign.target_regions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Target Regions</h2>
            <div className="flex flex-wrap gap-2">
              {campaign.target_regions.map((r) => (
                <span key={r} className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">{r}</span>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* IOC sections */}
      {(iocs?.items?.length ?? 0) > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
            <Shield className="w-4 h-4 text-cyan-400" />
            Indicators of Compromise
          </h2>
          <div className="space-y-4">
            {[
              { label: "C2 Domains", items: c2Domains },
              { label: "IP Addresses", items: ips },
              { label: "File Hashes", items: hashes },
              { label: "Malicious URLs", items: urls },
            ].filter((g) => g.items.length > 0).map(({ label, items }) => (
              <div key={label}>
                <p className="text-xs text-slate-600 uppercase tracking-wide mb-2 font-mono">{label}</p>
                <div className="cyber-card overflow-hidden">
                  <table className="w-full text-xs">
                    <tbody>
                      {items.map((ioc) => (
                        <tr key={ioc.id} className="border-b border-[#1e293b] last:border-0">
                          <td className="px-4 py-2.5 font-mono text-slate-200 break-all">{ioc.value}</td>
                          <td className="px-4 py-2.5 text-right shrink-0">
                            <span className={cn("px-1.5 py-0.5 rounded text-xs font-mono",
                              ioc.confidence >= 90 ? "bg-red-500/10 text-red-400" :
                              ioc.confidence >= 70 ? "bg-amber-500/10 text-amber-400" :
                              "bg-slate-700 text-slate-400"
                            )}>{ioc.confidence}%</span>
                          </td>
                          <td className="px-4 py-2.5">
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
          </div>
        </section>
      )}
    </div>
  );
}
