"use client";

import { useState } from "react";
import { useReports, useCreateReport, useUpdateReport, useDeleteReport } from "@/lib/hooks/useQuery";
import { FileText, Plus, X, Trash2, Search, Pencil } from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";
import type { Report, ReportCreate } from "@/types";

const TLP_STYLE: Record<string, { badge: string; label: string }> = {
  white: { badge: "bg-white/10 text-white border-white/20",         label: "TLP:WHITE" },
  green: { badge: "bg-green-500/10 text-green-400 border-green-500/20", label: "TLP:GREEN" },
  amber: { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "TLP:AMBER" },
  red:   { badge: "bg-red-500/10 text-red-400 border-red-500/20",   label: "TLP:RED" },
};

const STATUS_STYLE: Record<string, string> = {
  published: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  draft:     "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function entityCount(r: Report) {
  return r.actor_ids.length + r.campaign_ids.length + r.ioc_ids.length + r.cve_ids.length;
}

function ReportDetailDrawer({ report, onClose }: { report: Report; onClose: () => void }) {
  const tlp = TLP_STYLE[report.tlp_level] ?? TLP_STYLE.white;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog" aria-label={`${report.title} details`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg bg-[#0f172a] border-l border-[#1e293b] flex flex-col overflow-auto">
        <div className="flex items-start gap-3 px-6 py-5 border-b border-[#1e293b]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("text-xs px-2 py-0.5 rounded border font-mono font-bold", tlp.badge)}>
                {tlp.label}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded border capitalize", STATUS_STYLE[report.status] ?? STATUS_STYLE.draft)}>
                {report.status}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-100">{report.title}</h2>
            {report.author && <p className="text-xs text-slate-500 mt-0.5">By {report.author}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 cursor-pointer transition-colors" aria-label="Close details">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-6">
          {report.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{report.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Published</p>
              <p className="text-sm text-slate-300">
                {report.published_at ? relativeTime(report.published_at) : "Unpublished"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Created</p>
              <p className="text-sm text-slate-300">{relativeTime(report.created_at)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: "Actors", ids: report.actor_ids, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
              { label: "Campaigns", ids: report.campaign_ids, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
              { label: "IOCs", ids: report.ioc_ids, color: "bg-red-500/10 text-red-400 border-red-500/20" },
              { label: "CVEs", ids: report.cve_ids, color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
            ].map(({ label, ids, color }) => ids.length > 0 && (
              <div key={label}>
                <p className="text-xs text-slate-600 uppercase tracking-wide mb-1.5">{label} ({ids.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {ids.map((id) => (
                    <span key={id} className={cn("text-xs px-2 py-0.5 rounded border font-mono truncate max-w-[200px]", color)}>
                      {id.slice(0, 8)}…
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateReportModal({ onClose }: { onClose: () => void }) {
  const createReport = useCreateReport();
  const [form, setForm] = useState<ReportCreate>({
    title: "",
    description: "",
    status: "draft",
    tlp_level: "white",
    author: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReport.mutate(form, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
          <h2 className="text-base font-semibold text-slate-100">New Report</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="Report title…"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
              placeholder="Intelligence summary…"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
              <select
                value={form.status ?? "draft"}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">TLP Level</label>
              <select
                value={form.tlp_level ?? "white"}
                onChange={(e) => setForm((f) => ({ ...f, tlp_level: e.target.value }))}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="white">WHITE</option>
                <option value="green">GREEN</option>
                <option value="amber">AMBER</option>
                <option value="red">RED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Author</label>
            <input
              value={form.author ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              placeholder="Analyst name…"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-[#1e293b] text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createReport.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-sm text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              {createReport.isPending ? "Creating…" : "Create Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditReportModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const updateReport = useUpdateReport();
  const [form, setForm] = useState({
    title: report.title,
    description: report.description ?? "",
    status: report.status,
    tlp_level: report.tlp_level,
    author: report.author ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateReport.mutate({ id: report.id, data: form }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]">
          <h2 className="text-base font-semibold text-slate-100">Edit Report</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10 cursor-pointer" aria-label="Close">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">TLP Level</label>
              <select
                value={form.tlp_level}
                onChange={(e) => setForm((f) => ({ ...f, tlp_level: e.target.value }))}
                className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                <option value="white">WHITE</option>
                <option value="green">GREEN</option>
                <option value="amber">AMBER</option>
                <option value="red">RED</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 uppercase tracking-wide mb-1.5">Author</label>
            <input
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              className="w-full bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-[#1e293b] text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateReport.isPending}
              className="flex-1 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-sm text-cyan-300 hover:bg-cyan-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              {updateReport.isPending ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);
  const [editing, setEditing] = useState<Report | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useReports(q ? { q, limit: 50 } : { limit: 50 });
  const deleteReport = useDeleteReport();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-100">Intelligence Reports</h1>
        <span className="ml-2 text-sm text-slate-500">{data?.total ?? "…"} reports</span>
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-sm text-cyan-300 hover:bg-cyan-500/25 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search reports…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full bg-[#111827] border border-[#1e293b] rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
        />
      </div>

      <div className="space-y-3">
        {isLoading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="cyber-card p-4 animate-pulse space-y-2">
            <div className="h-4 bg-slate-700 rounded w-1/2" />
            <div className="h-3 bg-slate-800 rounded w-3/4" />
          </div>
        ))}

        {(data?.items ?? []).map((report) => {
          const tlp = TLP_STYLE[report.tlp_level] ?? TLP_STYLE.white;
          return (
            <button
              key={report.id}
              className="cyber-card p-4 w-full text-left cursor-pointer hover:border-cyan-500/30 hover:bg-white/[0.02] transition-all duration-150"
              onClick={() => setSelected(report)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={cn("text-xs px-2 py-0.5 rounded border font-mono font-bold shrink-0", tlp.badge)}>
                      {tlp.label}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded border capitalize shrink-0", STATUS_STYLE[report.status] ?? STATUS_STYLE.draft)}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">{report.title}</p>
                  {report.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {report.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(report); }}
                    className="p-1.5 rounded hover:bg-cyan-500/10 text-slate-600 hover:text-cyan-400 transition-colors cursor-pointer"
                    aria-label={`Edit ${report.title}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteReport.mutate(report.id); }}
                    className="p-1.5 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
                    aria-label={`Delete ${report.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {report.author && (
                  <span className="text-xs text-slate-600">By {report.author}</span>
                )}
                {entityCount(report) > 0 && (
                  <span className="text-xs text-slate-600">{entityCount(report)} linked entities</span>
                )}
                <span className="ml-auto text-xs text-slate-600">
                  {relativeTime(report.created_at)}
                </span>
              </div>
            </button>
          );
        })}

        {!isLoading && !data?.items.length && (
          <div className="text-center py-16 text-slate-600">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No reports yet</p>
          </div>
        )}
      </div>

      {selected && <ReportDetailDrawer report={selected} onClose={() => setSelected(null)} />}
      {editing && <EditReportModal report={editing} onClose={() => setEditing(null)} />}
      {showCreate && <CreateReportModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
