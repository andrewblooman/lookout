"use client";

import { useState } from "react";
import { useNews } from "@/lib/hooks/useQuery";
import { Newspaper, Search, ExternalLink } from "lucide-react";
import { cn, relativeTime, truncate } from "@/lib/utils";

export default function NewsPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useNews({
    limit,
    skip: page * limit,
    ...(q ? { q } : {}),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Newspaper className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-100">Intelligence Feed</h1>
        <span className="ml-2 text-sm text-slate-500">{data?.total ?? "…"} articles</span>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search articles…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }}
          className="w-full bg-[#111827] border border-[#1e293b] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
          aria-label="Search news articles"
        />
      </div>

      <div className="space-y-3">
        {isLoading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="cyber-card p-4 space-y-2 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-slate-800 rounded w-full" />
            <div className="h-3 bg-slate-800 rounded w-2/3" />
          </div>
        ))}
        {(data?.items ?? []).map((article) => (
          <article key={article.id} className="cyber-card p-4 hover:border-cyan-500/20 transition-all duration-150">
            <div className="flex items-start gap-3 justify-between mb-2">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-slate-100 hover:text-cyan-300 transition-colors cursor-pointer leading-snug flex-1"
              >
                {article.title}
              </a>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-white/10 rounded cursor-pointer transition-colors shrink-0"
                aria-label={`Open article: ${article.title}`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 transition-colors" aria-hidden="true" />
              </a>
            </div>

            {article.summary && (
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {truncate(article.summary, 300)}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {article.source_name && (
                <span className="text-xs text-cyan-600 font-medium">{article.source_name}</span>
              )}
              <span className="text-slate-700">·</span>
              <span className="text-xs text-slate-600">{relativeTime(article.published_at)}</span>

              {article.extracted_actors.map((a) => (
                <span key={a} className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                  {a}
                </span>
              ))}
              {article.extracted_cves.map((c) => (
                <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  {c}
                </span>
              ))}
              {article.extracted_malware.map((m) => (
                <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                  {m}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      {data && data.total > limit && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-slate-500">
            {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded border border-[#1e293b] text-slate-400 disabled:opacity-30 hover:border-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed">
              Previous
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * limit >= data.total}
              className="px-3 py-1.5 text-xs rounded border border-[#1e293b] text-slate-400 disabled:opacity-30 hover:border-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
