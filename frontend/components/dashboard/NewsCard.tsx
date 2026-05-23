"use client";

import { useNews } from "@/lib/hooks/useQuery";
import { Newspaper, ExternalLink } from "lucide-react";
import { relativeTime, truncate } from "@/lib/utils";

export function NewsCard() {
  const { data, isLoading } = useNews({ limit: 8 });

  return (
    <div className="cyber-card flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2 border-b border-[#1e293b] shrink-0">
        <Newspaper className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Latest Intelligence
        </h2>
        <span className="ml-auto text-xs text-slate-500">
          {data ? `${data.total} articles` : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#1e293b]">
        {isLoading && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5 animate-pulse">
                <div className="h-3 bg-slate-700 rounded w-3/4" />
                <div className="h-2.5 bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}
        {(data?.items ?? []).map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col gap-1.5 px-5 py-3.5 hover:bg-white/[0.03] transition-colors duration-150 cursor-pointer group"
            aria-label={`Read: ${article.title}`}
          >
            <div className="flex items-start gap-2 justify-between">
              <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-300 transition-colors duration-150 leading-snug line-clamp-2">
                {article.title}
              </p>
              <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 mt-0.5 shrink-0 transition-colors" aria-hidden="true" />
            </div>
            {article.summary && (
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {truncate(article.summary, 160)}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {article.source_name && (
                <span className="text-xs text-cyan-600 font-medium">{article.source_name}</span>
              )}
              <span className="text-xs text-slate-600">{relativeTime(article.published_at)}</span>
              {article.extracted_actors.slice(0, 2).map((a) => (
                <span key={a} className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                  {a}
                </span>
              ))}
              {article.extracted_cves.slice(0, 2).map((c) => (
                <span key={c} className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  {c}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
