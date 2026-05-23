"use client";

import { useState } from "react";
import { useActors } from "@/lib/hooks/useQuery";
import { Users, Search, X, Globe2, Target } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import type { Actor } from "@/types";

const MOTIVATION_STYLE: Record<string, string> = {
  espionage: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  financial: "bg-green-500/10 text-green-400 border-green-500/20",
  sabotage: "bg-red-500/10 text-red-400 border-red-500/20",
  hacktivist: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function ActorDrawer({ actor, onClose }: { actor: Actor; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog" aria-label={`${actor.name} details`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-[#0f172a] border-l border-[#1e293b] flex flex-col overflow-auto">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1e293b]">
          <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-100">{actor.name}</h2>
            <p className="text-xs text-slate-500">{actor.mitre_group_id ?? "No MITRE ID"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 cursor-pointer transition-colors" aria-label="Close details">
            <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {actor.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{actor.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Origin</p>
              <p className="text-sm font-mono text-slate-200">{actor.origin_country ?? "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Motivation</p>
              <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", MOTIVATION_STYLE[actor.motivation ?? ""] ?? "bg-slate-700 text-slate-300 border-slate-600")}>
                {actor.motivation ?? "Unknown"}
              </span>
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

          {actor.aliases.length > 0 && (
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">Known Aliases</p>
              <div className="flex flex-wrap gap-2">
                {actor.aliases.map((a) => (
                  <span key={a} className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">{a}</span>
                ))}
              </div>
            </div>
          )}

          {actor.mitre_group_id && (
            <a
              href={`https://attack.mitre.org/groups/${actor.mitre_group_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <Target className="w-4 h-4" aria-hidden="true" />
              View on MITRE ATT&CK
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function APTsPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Actor | null>(null);
  const { data, isLoading } = useActors(q ? { q, limit: 50 } : { limit: 50 });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-100">Threat Actors</h1>
        <span className="ml-2 text-sm text-slate-500">{data?.total ?? "…"} actors</span>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search actors…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-[#111827] border border-[#1e293b] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          aria-label="Search threat actors"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="cyber-card p-4 space-y-3 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/2" />
            <div className="h-3 bg-slate-800 rounded w-3/4" />
          </div>
        ))}
        {(data?.items ?? []).map((actor) => (
          <button
            key={actor.id}
            onClick={() => setSelected(actor)}
            className="cyber-card p-4 text-left cursor-pointer hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-cyan-500/40"
            aria-label={`View details for ${actor.name}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-cyan-400">{actor.name.slice(0, 2).toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100 truncate">{actor.name}</p>
                <p className="text-xs text-slate-500 font-mono">{actor.mitre_group_id ?? "—"}</p>
              </div>
              <div className="flex items-center gap-1">
                <Globe2 className="w-3 h-3 text-slate-600" aria-hidden="true" />
                <span className="text-xs font-mono text-slate-500">{actor.origin_country ?? "??"}</span>
              </div>
            </div>

            {actor.description && (
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{actor.description}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {actor.motivation && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded border capitalize", MOTIVATION_STYLE[actor.motivation] ?? "bg-slate-700 text-slate-400 border-slate-600")}>
                  {actor.motivation}
                </span>
              )}
              {actor.last_seen && (
                <span className="ml-auto text-xs text-slate-600">
                  {relativeTime(actor.last_seen)}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && <ActorDrawer actor={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
