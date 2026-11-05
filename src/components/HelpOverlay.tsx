"use client";

import { X } from "lucide-react";
import { terjemah, type Lang } from "@/lib/i18n";
import Logo from "./Logo";

const PINTASAN: [string, "help_k" | "help_t" | "help_f" | "help_r" | "help_l" | "help_s" | "help_g" | "help_num" | "help_esc" | "help_q"][] = [
  ["Ctrl K", "help_k"],
  ["T", "help_t"],
  ["F", "help_f"],
  ["R", "help_r"],
  ["L", "help_l"],
  ["S", "help_s"],
  ["G", "help_g"],
  ["1–9 0", "help_num"],
  ["Esc", "help_esc"],
  ["?", "help_q"],
];

export default function HelpOverlay({ lang, onTutup, tentang }: { lang: Lang; onTutup: () => void; tentang?: boolean }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-3 backdrop-blur-[2px]" onClick={onTutup}>
      <div className="glass braket muncul w-[620px] max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo size={26} className="text-accent" />
            <div>
              <div className="text-[13px] tracking-[0.3em] text-text">EYE OF GARUDA</div>
              <div className="text-[10px] tracking-[0.15em] text-muted uppercase">{terjemah(lang, tentang ? "about" : "shortcuts")}</div>
            </div>
          </div>
          <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={onTutup}>
            <X size={15} />
          </button>
        </div>
        <div className="gulir max-h-[70vh] overflow-y-auto px-4 py-3 text-[12px] leading-relaxed text-muted">
          {lang === "id" ? (
            <p>
              Konsol globe interaktif untuk melihat postur pertahanan Indonesia dari luar angkasa: markas TNI, pangkalan asing di kawasan, pulau terluar,
              ALKI, kabel bawah laut, pesawat militer yang memancarkan ADS-B, satelit militer dan pengintai, kapal dari AIS, serta analisis ZEE, radius tempur,
              impor senjata, dan lini masa insiden. Semua dari data publik; koordinat adalah perkiraan.
            </p>
          ) : (
            <p>
              An interactive globe console for Indonesia&apos;s defense posture seen from orbit: TNI bases, foreign bases in the region, outer islands, sea lanes,
              undersea cables, military aircraft broadcasting ADS-B, military and spy satellites, AIS vessels, plus EEZ, combat-radius, arms-import and
              incident-timeline analysis. Public data only; coordinates are approximate.
            </p>
          )}
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {PINTASAN.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-white/5 py-1">
                <span className="text-text">{terjemah(lang, v)}</span>
                <span className="flex gap-1">
                  {k.split(" ").map((x) => (
                    <span key={x} className="kbd">
                      {x}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10.5px] text-dim">
            {terjemah(lang, "disclaimer")} ·{" "}
            <a className="underline hover:text-text" href="https://github.com/Avalon2222/eye-of-garuda" target="_blank" rel="noreferrer">
              github.com/Avalon2222/eye-of-garuda
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
