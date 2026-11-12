"use client";

import { Square, SkipForward } from "lucide-react";
import { TOUR } from "@/lib/tour";
import { terjemah, type Lang } from "@/lib/i18n";

export default function TourOverlay({ lang, langkah, onStop, onLanjut }: { lang: Lang; langkah: number; onStop: () => void; onLanjut: () => void }) {
  const l = TOUR[langkah];
  if (!l) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[40px] z-30 flex justify-center px-2 sm:bottom-[72px] sm:px-3">
      <div key={langkah} role="region" aria-live="polite" aria-label={`${terjemah(lang, "tour")} ${langkah + 1}/${TOUR.length}`} className="glass braket muncul pointer-events-auto w-[640px] max-w-full px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="label-kecil text-accent">
            {terjemah(lang, "tour")} {langkah + 1}/{TOUR.length}
          </div>
          <div className="flex gap-1">
            <button className="tombol-ikon !h-7 !w-7" onClick={onLanjut} title={terjemah(lang, "tour_next")} aria-label={terjemah(lang, "tour_next")}>
              <SkipForward size={13} />
            </button>
            <button className="tombol-ikon !h-7 !w-7" onClick={onStop} title={terjemah(lang, "tour_stop")} aria-label={terjemah(lang, "tour_stop")}>
              <Square size={13} />
            </button>
          </div>
        </div>
        <div className="mt-1 text-[18px] tracking-[0.25em] text-gold">{l.judul[lang]}</div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text">{l.teks[lang]}</p>
        <div className="mt-3 flex gap-1">
          {TOUR.map((_, i) => (
            <span key={i} className={`h-[2px] flex-1 ${i <= langkah ? "bg-accent" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
