"use client";

import { useState } from "react";
import { useFeeds, useCreateFeed, useUpdateFeed, useDeleteFeed, useTriggerFeed } from "@/lib/hooks/useQuery";
import { Rss, Plus, Trash2, Play, Check, X, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import type { Feed } from "@/types";

const FEED_TYPES = [
  "cisa_kev", "rss",
  "urlhaus_iocs", "urlhaus_api",
  "mitre_attack", "nvd_cve",
  "alienvault_otx", "shodan", "malpedia",
  "ssl_blacklist", "disarm", "apt_campaigns",
  "wiz_stix", "taxii", "generic_api",
];
const FEED_TYPE_LABEL: Record<string, string> = {
  cisa_kev:       "CISA KEV",
  rss:            "RSS",
  urlhaus_iocs:   "URLhaus IOCs",
  urlhaus_api:    "URLhaus Payloads",
  mitre_attack:   "MITRE ATT&CK",
  nvd_cve:        "NVD CVE",
  alienvault_otx: "AlienVault OTX",
  shodan:         "Shodan",
  malpedia:       "Malpedia",
  ssl_blacklist:  "SSL Blacklist",
  disarm:         "DISARM",
  apt_campaigns:  "APT Campaigns",
  wiz_stix:       "Wiz STIX",
  taxii:          "TAXII",
  generic_api:    "Generic API",
};

interface FeedFormData {
  name: string;
  feed_type: string;
  url: string;
  api_token: string;
  poll_interval_hours: number;
  enabled: boolean;
}

const EMPTY_FORM: FeedFormData = {
  name: "",
  feed_type: "rss",
  url: "",
  api_token: "",
  poll_interval_hours: 6,
  enabled: true,
};

function AddFeedModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FeedFormData>(EMPTY_FORM);
  const createFeed = useCreateFeed();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFeed.mutateAsync({
      name: form.name,
      feed_type: form.feed_type,
      url: form.url,
      api_token: form.api_token || undefined,
      poll_interval_hours: form.poll_interval_hours,
      enabled: form.enabled,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" aria-modal="true" role="dialog" aria-label="Add feed">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Add Feed</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/10 cursor-pointer transition-colors" aria-label="Close">
            <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="feed-name" className="block text-xs text-slate-400 mb-1">Name</label>
            <input id="feed-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors" />
          </div>

          <div>
            <label htmlFor="feed-type" className="block text-xs text-slate-400 mb-1">Feed Type</label>
            <select id="feed-type" value={form.feed_type} onChange={(e) => setForm((f) => ({ ...f, feed_type: e.target.value }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors cursor-pointer">
              {FEED_TYPES.map((t) => <option key={t} value={t}>{FEED_TYPE_LABEL[t]}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="feed-url" className="block text-xs text-slate-400 mb-1">URL</label>
            <input id="feed-url" type="url" required value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://…"
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono" />
          </div>

          <div>
            <label htmlFor="feed-token" className="block text-xs text-slate-400 mb-1">
              API Token <span className="text-slate-600">(optional, stored encrypted)</span>
            </label>
            <div className="relative">
              <input id="feed-token" type="password" value={form.api_token} onChange={(e) => setForm((f) => ({ ...f, api_token: e.target.value }))}
                placeholder="Bearer token or API key"
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2.5 pr-9 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors" />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            </div>
          </div>

          <div>
            <label htmlFor="feed-interval" className="block text-xs text-slate-400 mb-1">Poll Interval (hours)</label>
            <input id="feed-interval" type="number" min={1} max={168} value={form.poll_interval_hours}
              onChange={(e) => setForm((f) => ({ ...f, poll_interval_hours: Number(e.target.value) }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 border border-[#1e293b] rounded-lg hover:border-slate-600 transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={createFeed.isPending}
            className="px-4 py-2 text-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {createFeed.isPending ? "Saving…" : "Add Feed"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FeedRow({ feed }: { feed: Feed }) {
  const updateFeed = useUpdateFeed();
  const deleteFeed = useDeleteFeed();
  const triggerFeed = useTriggerFeed();
  const [triggered, setTriggered] = useState(false);

  const handleTrigger = async () => {
    await triggerFeed.mutateAsync(feed.id);
    setTriggered(true);
    setTimeout(() => setTriggered(false), 3000);
  };

  const handleToggle = () => updateFeed.mutate({ id: feed.id, data: { enabled: !feed.enabled } });

  return (
    <tr className="border-b border-[#1e293b] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-200">{feed.name}</p>
          {feed.has_token && (
            <Lock className="w-3 h-3 text-slate-600" aria-label="Has API token" />
          )}
        </div>
        <p className="text-xs text-slate-600 font-mono mt-0.5 truncate max-w-64">{feed.url}</p>
      </td>
      <td className="px-4 py-4">
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">
          {FEED_TYPE_LABEL[feed.feed_type] ?? feed.feed_type}
        </span>
      </td>
      <td className="px-4 py-4 text-xs text-slate-500">{feed.poll_interval_hours}h</td>
      <td className="px-4 py-4 text-xs text-slate-500">
        {feed.last_ingested_at ? relativeTime(feed.last_ingested_at) : "Never"}
      </td>
      <td className="px-4 py-4">
        {feed.last_error ? (
          <div className="flex items-center gap-1" title={feed.last_error}>
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden="true" />
            <span className="text-xs text-red-400 truncate max-w-32">{feed.last_error}</span>
          </div>
        ) : feed.last_ingested_at ? (
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
            <span className="text-xs text-green-500">OK</span>
          </div>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
      <td className="px-4 py-4">
        <button
          onClick={handleToggle}
          className={cn(
            "relative inline-flex h-5 w-9 cursor-pointer rounded-full border-2 transition-colors duration-150 focus:outline-none",
            feed.enabled ? "bg-cyan-500/30 border-cyan-500/50" : "bg-slate-800 border-slate-700"
          )}
          role="switch"
          aria-checked={feed.enabled}
          aria-label={`${feed.enabled ? "Disable" : "Enable"} feed`}
        >
          <span className={cn(
            "pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow transform transition-transform duration-150 mt-0.5",
            feed.enabled ? "translate-x-4 bg-cyan-400" : "translate-x-0.5"
          )} />
        </button>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleTrigger}
            disabled={triggerFeed.isPending && !triggered}
            className="p-1.5 rounded hover:bg-white/10 cursor-pointer transition-colors text-slate-400 hover:text-cyan-400 disabled:opacity-50"
            aria-label={`Run ${feed.name} now`}
            title="Run now"
          >
            {triggered ? <Check className="w-3.5 h-3.5 text-green-400" aria-hidden="true" /> : <Play className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
          <button
            onClick={() => deleteFeed.mutate(feed.id)}
            className="p-1.5 rounded hover:bg-red-500/10 cursor-pointer transition-colors text-slate-600 hover:text-red-400"
            aria-label={`Delete ${feed.name}`}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function FeedsPage() {
  const { data, isLoading } = useFeeds();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Rss className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-100">Intelligence Feeds</h1>
        <span className="ml-2 text-sm text-slate-500">{data?.total ?? "…"} feeds</span>
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/20 transition-colors cursor-pointer"
          aria-label="Add new feed"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Feed
        </button>
      </div>

      <div className="cyber-card overflow-hidden">
        <table className="w-full text-sm" aria-label="Intelligence feeds table">
          <thead>
            <tr className="border-b border-[#1e293b] bg-[#0a0f1e]">
              {["Feed", "Type", "Interval", "Last Run", "Status", "Enabled", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-slate-600 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-[#1e293b]">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-3 bg-slate-800 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {(data?.items ?? []).map((feed) => <FeedRow key={feed.id} feed={feed} />)}
          </tbody>
        </table>
        {!isLoading && !data?.items.length && (
          <div className="py-12 text-center text-slate-600">
            No feeds configured. Add one to start ingesting threat intelligence.
          </div>
        )}
      </div>

      {showModal && <AddFeedModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
