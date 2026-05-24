"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGraph } from "@/lib/hooks/useQuery";
import { Network, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/types";

const NODE_COLORS: Record<string, string> = {
  actor: "#00d4ff",
  campaign: "#a855f7",
  ioc: "#ef4444",
  cve: "#f97316",
};

const NODE_LABELS: Record<string, string> = {
  actor: "Threat Actor",
  campaign: "Campaign",
  ioc: "IOC",
  cve: "CVE",
};

interface ForceGraphInstance {
  d3Force: (name: string, force?: unknown) => unknown;
  zoom: (k: number, ms?: number) => void;
}

function NodePanel({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const metaEntries = Object.entries(node.meta).filter(([, v]) => v != null && v !== "");
  return (
    <div className="absolute top-4 right-4 w-72 cyber-card z-10 shadow-2xl">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e293b]">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ background: NODE_COLORS[node.type] ?? "#94a3b8" }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{NODE_LABELS[node.type] ?? node.type}</p>
          <p className="text-sm font-semibold text-slate-100 truncate">{node.label}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 cursor-pointer transition-colors" aria-label="Close">
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
      {metaEntries.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          {metaEntries.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3">
              <span className="text-xs text-slate-600 capitalize shrink-0">{k.replace(/_/g, " ")}</span>
              <span className="text-xs text-slate-300 font-mono text-right">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GraphPage() {
  const { data, isLoading } = useGraph();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ForceGraph, setForceGraph] = useState<React.ComponentType<any> | null>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [visibleTypes, setVisibleTypes] = useState(new Set(["actor", "campaign", "ioc"]));
  const graphRef = useRef<ForceGraphInstance>(null);

  useEffect(() => {
    import("react-force-graph-2d").then((m) => setForceGraph(() => m.default));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggleType = (type: string) =>
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });

  const graphData = {
    nodes: (data?.nodes ?? [])
      .filter((n) => visibleTypes.has(n.type))
      .map((n) => ({ ...n, __type: n.type })),
    links: (data?.edges ?? []).map((e) => ({ source: e.source, target: e.target, type: e.type })),
  };

  const handleNodeClick = useCallback((node: unknown) => {
    setSelected(node as GraphNode);
  }, []);

  const nodePaint = useCallback((node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const n = node as GraphNode & { x?: number; y?: number };
    const { x = 0, y = 0, type, label } = n;
    const r = type === "actor" ? 6 : type === "campaign" ? 5 : 3.5;
    const color = NODE_COLORS[type] ?? "#94a3b8";

    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color + "33";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2 / globalScale;
    ctx.stroke();

    if (globalScale >= 1.5) {
      const fontSize = 10 / globalScale;
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(label.length > 20 ? label.slice(0, 18) + "…" : label, x, y + r + fontSize + 1);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e293b] shrink-0">
        <Network className="w-5 h-5 text-cyan-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-slate-100">Knowledge Graph</h1>
        {data && (
          <span className="text-sm text-slate-500">
            {data.nodes.length} nodes · {data.edges.length} edges
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {["actor", "campaign", "ioc"].map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                visibleTypes.has(type)
                  ? "border-current"
                  : "opacity-40 border-slate-700"
              )}
              style={{ color: NODE_COLORS[type] }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[type] }} />
              {NODE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative bg-[#060d1a] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-500 text-sm animate-pulse">Loading graph…</span>
          </div>
        )}

        {ForceGraph && !isLoading && (
          <ForceGraph
            ref={graphRef}
            graphData={graphData}
            width={dims.width}
            height={dims.height}
            backgroundColor="#060d1a"
            nodeId="id"
            nodeCanvasObject={nodePaint}
            nodeCanvasObjectMode={() => "replace"}
            linkColor={() => "#1e293b"}
            linkWidth={1}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkLabel="type"
            onNodeClick={handleNodeClick}
            cooldownTicks={100}
            onEngineStop={() => graphRef.current?.zoom(1.2, 500)}
          />
        )}

        {selected && <NodePanel node={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
