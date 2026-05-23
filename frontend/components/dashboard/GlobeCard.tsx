"use client";

import { useEffect, useRef, useState } from "react";
import { useHeatmap } from "@/lib/hooks/useQuery";
import { Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobePoint {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
  count: number;
}

// Target capitals for arc destinations (major democracies / NATO)
const TARGETS = [
  { lat: 51.5074, lng: -0.1278, label: "London" },
  { lat: 48.8566, lng: 2.3522, label: "Paris" },
  { lat: 38.9072, lng: -77.0369, label: "Washington" },
  { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  { lat: 52.5200, lng: 13.4050, label: "Berlin" },
];

export function GlobeCard() {
  const { data, isLoading } = useHeatmap();
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<HTMLDivElement>(null);
  const [GlobeComponent, setGlobeComponent] = useState<React.ComponentType<any> | null>(null);
  const [dims, setDims] = useState({ width: 600, height: 500 });

  // Dynamically import react-globe.gl (client-only, depends on Three.js)
  useEffect(() => {
    import("react-globe.gl").then((mod) => setGlobeComponent(() => mod.default));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const points: GlobePoint[] = (data?.points ?? []).map((p) => ({
    lat: p.lat,
    lng: p.lon,
    size: Math.max(0.4, Math.min(2.5, p.count / 40)),
    color: p.count > 100 ? "#ef4444" : p.count > 50 ? "#f97316" : "#f59e0b",
    label: `${p.label}: ${p.count} events`,
    count: p.count,
  }));

  const arcs = (data?.points ?? []).flatMap((src) =>
    TARGETS.slice(0, 2).map((tgt) => ({
      startLat: src.lat,
      startLng: src.lon,
      endLat: tgt.lat,
      endLng: tgt.lng,
      color: src.count > 100 ? "#ef444480" : "#f59e0b80",
    }))
  );

  return (
    <div className="cyber-card scanlines relative flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2 border-b border-[#1e293b] shrink-0">
        <Globe2 className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Global Attack Heatmap
        </h2>
        {isLoading && (
          <span className="ml-auto text-xs text-slate-500 animate-pulse">Updating…</span>
        )}
      </div>

      <div ref={containerRef} className="flex-1 relative overflow-hidden" aria-label="Interactive 3D globe showing attack origins">
        {!GlobeComponent ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-slate-500 text-sm animate-pulse">Loading globe…</div>
          </div>
        ) : (
          <GlobeComponent
            ref={globeRef}
            width={dims.width}
            height={dims.height}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="#00d4ff"
            atmosphereAltitude={0.15}
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointRadius="size"
            pointAltitude={0.02}
            pointLabel="label"
            arcsData={arcs}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcColor="color"
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={2000}
            arcAltitude={0.2}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-5 py-2 border-t border-[#1e293b] shrink-0">
        {[
          { color: "bg-red-500", label: ">100 events" },
          { color: "bg-orange-500", label: "50–100" },
          { color: "bg-amber-500", label: "<50" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", color)} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
