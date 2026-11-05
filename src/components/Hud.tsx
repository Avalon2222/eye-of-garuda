"use client";

import { useEffect, useState } from "react";
import { Search, HelpCircle, Maximize2, Minimize2, Share2, Play, Square, BarChart3, Globe2, Map as MapIcon, Satellite, Languages } from "lucide-react";
import Logo from "./Logo";
import { terjemah, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  jumlahLapisanAktif: number;
  jumlahLapisan: number;
  jumlahEntitas: number;
  sat: boolean;
  datar: boolean;
  tourAktif: boolean;
  online: boolean;
  onToggleSat: () => void;
  onToggleDatar: () => void;
  onToggleLang: () => void;
  onCari: () => void;
  onBantuan: () => void;
  onTour: () => void;
  onBagikan: () => void;
  onData: () => void;
  onFullscreen: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function JamZulu({ lang }: { lang: Lang }) {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!t) return <div className="h-7" />;
  const wib = new Date(t.getTime() + 7 * 3600_000);
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-[22px] leading-none tracking-[0.12em] text-gold tabular-nums">
        {pad(t.getUTCHours())}:{pad(t.getUTCMinutes())}:{pad(t.getUTCSeconds())}
        <span className="text-[12px] text-muted">Z</span>
      </div>
      <div className="hidden text-[11px] text-muted tabular-nums sm:block">
        {pad(wib.getUTCHours())}:{pad(wib.getUTCMinutes())} {terjemah(lang, "wib")}
      </div>
    </div>
  );
}

export default function Hud(p: Props) {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2 sm:p-3">
      {/* kiri: identitas */}
      <div className="glass braket pointer-events-auto flex items-center gap-3 px-3 py-2">
        <Logo size={30} className="text-accent shrink-0" />
        <div className="leading-tight">
          <div className="whitespace-nowrap text-[11px] font-semibold tracking-[0.22em] text-text sm:text-[13px] sm:tracking-[0.3em]">EYE OF GARUDA</div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] tracking-[0.18em] text-muted uppercase">
            <span className={`denyut ${p.online ? "" : "!bg-warn"}`} />
            {p.online ? terjemah(p.lang, "online") : terjemah(p.lang, "offline")}
            <span className="hidden text-dim sm:inline">· ID-DEF-CONSOLE v1</span>
          </div>
        </div>
      </div>

      {/* tengah: jam + hitungan (desktop) */}
      <div className="glass pointer-events-auto hidden items-center gap-6 px-4 py-2 md:flex">
        <JamZulu lang={p.lang} />
        <div className="h-7 w-px bg-white/10" />
        <div className="flex gap-5 text-[11px] uppercase tracking-[0.15em]">
          <div>
            <div className="label-kecil">{terjemah(p.lang, "layers")}</div>
            <div className="text-text tabular-nums">
              {p.jumlahLapisanAktif}
              <span className="text-dim">/{p.jumlahLapisan}</span>
            </div>
          </div>
          <div>
            <div className="label-kecil">{terjemah(p.lang, "entities")}</div>
            <div className="text-text tabular-nums">{p.jumlahEntitas.toLocaleString("en-US")}</div>
          </div>
        </div>
      </div>

      {/* kanan: alat */}
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <div className="glass flex items-center gap-1 p-1">
          <button className={`tombol-hud ${!p.datar ? "aktif" : ""}`} onClick={p.onToggleDatar} title="G">
            <Globe2 size={13} /> <span className="hidden sm:inline">{terjemah(p.lang, "globe_mode")}</span>
          </button>
          <button className={`tombol-hud ${p.datar ? "aktif" : ""}`} onClick={p.onToggleDatar} title="G">
            {terjemah(p.lang, "flat_mode")}
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button className={`tombol-hud ${!p.sat ? "aktif" : ""}`} onClick={p.onToggleSat} title="S">
            <MapIcon size={13} /> <span className="hidden sm:inline">{terjemah(p.lang, "map_mode")}</span>
          </button>
          <button className={`tombol-hud ${p.sat ? "aktif" : ""}`} onClick={p.onToggleSat} title="S">
            <Satellite size={13} /> <span className="hidden sm:inline">{terjemah(p.lang, "sat_mode")}</span>
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button className="tombol-hud" onClick={p.onToggleLang} title="L">
            <Languages size={13} /> {terjemah(p.lang, "lang_toggle")}
          </button>
        </div>
        <div className="glass flex items-center gap-1 p-1">
          <button className="tombol-ikon" onClick={p.onCari} title={`${terjemah(p.lang, "search")} (Ctrl+K)`}>
            <Search size={15} />
          </button>
          <button className={`tombol-ikon ${p.tourAktif ? "aktif" : ""}`} onClick={p.onTour} title={`${terjemah(p.lang, "tour")} (T)`}>
            {p.tourAktif ? <Square size={15} /> : <Play size={15} />}
          </button>
          <button className="tombol-ikon" onClick={p.onData} title={terjemah(p.lang, "data_panel")}>
            <BarChart3 size={15} />
          </button>
          <button className="tombol-ikon" onClick={p.onBagikan} title={terjemah(p.lang, "share")}>
            <Share2 size={15} />
          </button>
          <button className="tombol-ikon" onClick={p.onFullscreen} title={`${terjemah(p.lang, "fullscreen")} (F)`}>
            {fs ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button className="tombol-ikon" onClick={p.onBantuan} title={`${terjemah(p.lang, "help")} (?)`}>
            <HelpCircle size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}
