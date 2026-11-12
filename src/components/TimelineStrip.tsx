"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import type { GeoJSON } from "geojson";
import { terjemah, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  data: GeoJSON.FeatureCollection;
  terpilih: string | null;
  onPilih: (f: GeoJSON.Feature) => void;
}

function bulanDari(tanggal: string): number {
  const [y, m] = tanggal.split("-").map(Number);
  return (y || 0) * 12 + ((m || 1) - 1);
}

/** Lini masa insiden: chip yang bisa diklik + slider yang bisa digeser maju/mundur dan tombol putar. */
export default function TimelineStrip({ lang, data, terpilih, onPilih }: Props) {
  const fitur = useMemo(() => [...data.features].sort((a, b) => String(a.properties?.tanggal).localeCompare(String(b.properties?.tanggal))), [data]);
  const bulan = useMemo(() => fitur.map((f) => bulanDari(String(f.properties?.tanggal ?? "2000-01"))), [fitur]);
  const min = bulan[0] ?? 0;
  const maks = bulan[bulan.length - 1] ?? 1;
  const idxTerpilih = fitur.findIndex((f) => String(f.properties?.id) === terpilih);
  const [posisi, setPosisi] = useState<number>(idxTerpilih >= 0 ? bulan[idxTerpilih] : min);
  const [putar, setPutar] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const terakhirDipilih = useRef<string | null>(null);

  // sinkron slider dengan pilihan dari peta/pencarian (bukan dari slider sendiri)
  const [idxSebelum, setIdxSebelum] = useState(idxTerpilih);
  if (idxTerpilih !== idxSebelum) {
    setIdxSebelum(idxTerpilih);
    if (idxTerpilih >= 0) setPosisi(bulan[idxTerpilih]);
  }

  // geser slider -> pilih insiden terdekat (sekali per insiden)
  const pilihTerdekat = (p: number) => {
    let terbaik = 0;
    let jarak = Infinity;
    bulan.forEach((b, i) => {
      const d = Math.abs(b - p);
      if (d < jarak) {
        jarak = d;
        terbaik = i;
      }
    });
    const f = fitur[terbaik];
    const id = String(f?.properties?.id);
    if (f && id !== terakhirDipilih.current) {
      terakhirDipilih.current = id;
      setIdxSebelum(terbaik); // pilihan datang dari slider: jangan sentak posisi thumb
      onPilih(f);
    }
  };

  // mode putar: maju 1 insiden tiap 3,5 detik
  useEffect(() => {
    if (!putar) return;
    let i = Math.max(0, idxTerpilih);
    const id = setInterval(() => {
      i = (i + 1) % fitur.length;
      const f = fitur[i];
      terakhirDipilih.current = String(f.properties?.id);
      setIdxSebelum(i);
      setPosisi(bulan[i]);
      onPilih(f);
      if (i === fitur.length - 1) setPutar(false);
    }, 3500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [putar]);

  // gulirkan chip terpilih ke tengah strip saja (scrollIntoView ikut menggeser halaman di HP)
  useEffect(() => {
    const wadah = strip.current;
    const el = wadah?.querySelector<HTMLElement>("[data-aktif='1']");
    if (!wadah || !el) return;
    wadah.scrollTo({ left: el.offsetLeft - wadah.clientWidth / 2 + el.offsetWidth / 2, behavior: "smooth" });
  }, [terpilih]);

  const tahunLabel = (b: number) => `${Math.floor(b / 12)}`;

  return (
    <div className="pointer-events-auto absolute inset-x-0 z-20 px-2 sm:left-[270px] sm:right-3 sm:bottom-[44px] lg:right-[312px] max-sm:top-[106px]">
      <div className="glass flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5">
          <button className={`tombol-ikon !h-6 !w-6 ${putar ? "aktif" : ""}`} onClick={() => setPutar(!putar)} title={terjemah(lang, putar ? "timeline_pause" : "timeline_play")}>
            {putar ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <span className="w-9 text-[10px] tabular-nums text-muted">{tahunLabel(min)}</span>
          <input
            type="range"
            className="slider-waktu flex-1"
            min={min}
            max={maks}
            step={1}
            value={posisi}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPosisi(v);
              pilihTerdekat(v);
            }}
            title={terjemah(lang, "timeline_drag")}
            aria-label={terjemah(lang, "timeline")}
          />
          <span className="w-9 text-right text-[10px] tabular-nums text-muted">{tahunLabel(maks)}</span>
          <span className="w-14 text-right text-[10px] tabular-nums text-gold">
            {Math.floor(posisi / 12)}-{String((posisi % 12) + 1).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-stretch max-sm:hidden">
          <div className="flex shrink-0 items-center border-r border-white/10 px-2 text-[9px] tracking-[0.2em] text-accent uppercase [writing-mode:vertical-rl] rotate-180">{terjemah(lang, "timeline")}</div>
          <div ref={strip} className="gulir flex flex-1 gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:thin]">
            {fitur.map((f) => {
              const p = f.properties ?? {};
              const id = String(p.id);
              const aktif = terpilih === id;
              const insiden = p.kategori === "insiden";
              return (
                <button
                  key={id}
                  data-aktif={aktif ? "1" : "0"}
                  onClick={() => {
                    terakhirDipilih.current = id;
                    onPilih(f);
                  }}
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
    </div>
  );
}
