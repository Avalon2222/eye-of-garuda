"use client";

import type { GeoJSON } from "geojson";
import { terjemah, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  data: GeoJSON.FeatureCollection;
  terpilih: string | null;
  onPilih: (f: GeoJSON.Feature) => void;
}

export default function TimelineStrip({ lang, data, terpilih, onPilih }: Props) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[40px] z-20 px-2 sm:left-[270px] sm:right-3 sm:bottom-[44px] max-sm:bottom-[82px]">
      <div className="glass flex items-stretch overflow-hidden">
        <div className="flex shrink-0 items-center border-r border-white/10 px-2 text-[9px] tracking-[0.2em] text-accent uppercase [writing-mode:vertical-rl] rotate-180">
          {terjemah(lang, "timeline")}
        </div>
        <div className="gulir flex flex-1 gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:thin]">
          {data.features.map((f) => {
            const p = f.properties ?? {};
            const id = String(p.id);
            const aktif = terpilih === id;
            const insiden = p.kategori === "insiden";
            return (
              <button
                key={id}
                onClick={() => onPilih(f)}
                className={`flex shrink-0 flex-col items-start border px-2 py-1 text-left transition-colors ${aktif ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"}`}
                style={{ borderColor: aktif ? (insiden ? "#f87171" : "#60a5fa") : "rgba(255,255,255,0.08)" }}
              >
                <span className="text-[10px] tabular-nums" style={{ color: insiden ? "#f87171" : "#60a5fa" }}>
                  {String(p.tanggal)}
                </span>
                <span className="max-w-[160px] truncate text-[11px] text-text">{String(p.judul)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
