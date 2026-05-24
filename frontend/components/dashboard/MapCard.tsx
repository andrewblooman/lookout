"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { useHeatmap } from "@/lib/hooks/useQuery";
import { Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO 3166-1 alpha-2 → numeric mapping for heatmap countries
const ALPHA2_TO_NUMERIC: Record<string, number> = {
  RU: 643, CN: 156, KP: 408, IR: 364, US: 840,
  DE: 276, BR: 76,  IN: 356, NG: 566, RO: 642,
};

function threatColor(count: number): string {
  if (count > 100) return "#ef4444";
  if (count > 50)  return "#f97316";
  if (count > 0)   return "#f59e0b";
  return "#1e293b";
}

function markerRadius(count: number): number {
  return Math.max(3, Math.min(10, count / 15));
}

export function MapCard() {
  const { data, isLoading } = useHeatmap();
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [0, 0],
    zoom: 1,
  });

  const threatByNumeric = new Map<number, { count: number; label: string; lat: number; lon: number }>();
  for (const p of data?.points ?? []) {
    const num = ALPHA2_TO_NUMERIC[p.country];
    if (num) threatByNumeric.set(num, { count: p.count, label: p.label, lat: p.lat, lon: p.lon });
  }

  return (
    <div className="cyber-card scanlines relative flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 pt-4 pb-2 border-b border-[#1e293b] shrink-0">
        <MapIcon className="w-4 h-4 text-cyan-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
          Global Attack Heatmap
        </h2>
        {isLoading && (
          <span className="ml-auto text-xs text-slate-500 animate-pulse">Updating…</span>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden bg-[#060d1a] cursor-grab active:cursor-grabbing" aria-label="2D world map showing threat origin countries">
        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: 147 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={setPosition}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const threat = threatByNumeric.get(Number(geo.id));
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={threatColor(threat?.count ?? 0)}
                      stroke="#0d1829"
                      strokeWidth={0.4}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: threat ? threatColor(threat.count) : "#243044", transition: "fill 150ms" },
                        pressed: { outline: "none" },
                      }}
                    >
                      {threat && <title>{threat.label}: {threat.count} events</title>}
                    </Geography>
                  );
                })
              }
            </Geographies>

            {(data?.points ?? []).map((p) => (
              <Marker key={p.country} coordinates={[p.lon, p.lat]}>
                <circle
                  r={markerRadius(p.count) / position.zoom}
                  fill="#00d4ff"
                  fillOpacity={0.55}
                  stroke="#00d4ff"
                  strokeWidth={0.8 / position.zoom}
                  strokeOpacity={0.9}
                />
                <title>{p.label}: {p.count} events</title>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* Zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-10">
          {[
            { label: "+", action: () => setPosition((p) => ({ ...p, zoom: Math.min(p.zoom * 2, 16) })) },
            { label: "−", action: () => setPosition((p) => ({ ...p, zoom: Math.max(p.zoom / 2, 1) })) },
            { label: "⟳", action: () => setPosition({ coordinates: [0, 0], zoom: 1 }) },
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-7 h-7 flex items-center justify-center rounded bg-[#111827] border border-[#1e293b] text-cyan-400 text-sm hover:bg-[#1e293b] transition-colors"
              aria-label={label === "⟳" ? "Reset zoom" : label === "+" ? "Zoom in" : "Zoom out"}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

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
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 opacity-60" />
          <span className="text-xs text-slate-500">origin marker</span>
        </span>
      </div>
    </div>
  );
}
