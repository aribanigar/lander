"use client";

import { useEffect, useRef, useState } from "react";
import { Globe2 } from "lucide-react";

interface GeoApp {
  _id: string;
  company: string;
  jobTitle: string;
  status: string;
  appliedAt: string;
  latitude: number;
  longitude: number;
  location?: string;
  country?: string;
}

const STATUS_COLOR: Record<string, string> = {
  applied:   "rgba(150,160,148,0.8)",
  viewed:    "rgba(60,120,220,0.9)",
  replied:   "rgba(100,190,80,0.9)",
  interview: "#cce832",
  rejected:  "rgba(220,70,70,0.7)",
  offer:     "#cce832",
};

export default function GlobeClient({ applications }: { applications: GeoApp[] }) {
  const globeRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<GeoApp | null>(null);
  const [Globe, setGlobe] = useState<typeof import("react-globe.gl").default | null>(null);

  // Dynamically import globe (SSR-safe, uses WebGL)
  useEffect(() => {
    import("react-globe.gl").then((mod) => setGlobe(() => mod.default));
  }, []);

  const points = applications.map((a) => ({
    lat: a.latitude,
    lng: a.longitude,
    size: a.status === "interview" || a.status === "offer" ? 0.7 : 0.4,
    color: STATUS_COLOR[a.status] ?? STATUS_COLOR.applied,
    data: a,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            {applications.length} applications mapped · real-time
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
          {[
            { label: "Applied",   color: "rgba(150,160,148,0.8)" },
            { label: "Viewed",    color: "rgba(60,120,220,0.9)" },
            { label: "Replied",   color: "rgba(100,190,80,0.9)" },
            { label: "Interview", color: "#cce832" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
              <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="relative rounded-card overflow-hidden"
        style={{ background: "var(--dark)", height: "72vh" }}
        ref={globeRef}
      >
        {applications.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <Globe2 size={40} color="rgba(255,255,255,0.1)" className="mb-4" />
            <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
              No mapped applications yet
            </div>
            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.15)" }}>
              As you apply to jobs, companies appear here on the globe
            </div>
          </div>
        ) : Globe ? (
          <Globe
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            pointsData={points}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude={0.01}
            pointRadius="size"
            pointsMerge={false}
            onPointClick={(p: object) => setHovered((p as { data: GeoApp }).data)}
            width={globeRef.current?.clientWidth ?? 900}
            height={globeRef.current?.clientHeight ?? 500}
            atmosphereColor="#cce832"
            atmosphereAltitude={0.12}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm font-mono animate-pulse" style={{ color: "rgba(255,255,255,0.2)" }}>
              Loading globe…
            </div>
          </div>
        )}

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute bottom-5 left-5 rounded-xl p-3 border"
            style={{ background: "rgba(26,30,22,0.9)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
          >
            <div className="text-xs font-mono mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {hovered.location || hovered.country}
            </div>
            <div className="text-sm font-medium text-white">{hovered.company}</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{hovered.jobTitle}</div>
            <div
              className="mt-1.5 inline-flex px-2 py-0.5 rounded text-2xs font-mono capitalize"
              style={{ background: STATUS_COLOR[hovered.status], color: "var(--dark)" }}
            >
              {hovered.status}
            </div>
            <button
              onClick={() => setHovered(null)}
              className="absolute top-2 right-2 text-white/20 hover:text-white/50 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
