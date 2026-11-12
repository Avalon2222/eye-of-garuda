"use client";

import { X } from "lucide-react";
import { terjemah, type Lang } from "@/lib/i18n";
import Logo from "./Logo";

const PINTASAN: [string, "help_k" | "help_t" | "help_f" | "help_r" | "help_l" | "help_s" | "help_g" | "help_num" | "help_esc" | "help_q" | "help_w" | "help_c" | "help_o"][] = [
  ["Ctrl K", "help_k"],
  ["T", "help_t"],
  ["W", "help_w"],
  ["C", "help_c"],
  ["O", "help_o"],
  ["F", "help_f"],
  ["R", "help_r"],
  ["L", "help_l"],
  ["S", "help_s"],
  ["G", "help_g"],
  ["1–9 0", "help_num"],
  ["Esc", "help_esc"],
  ["?", "help_q"],
];

const SENTUH: [string, "help_touch_drag" | "help_touch_pinch" | "help_touch_tilt" | "help_touch_tap" | "help_touch_chips" | "help_touch_menu"][] = [
  ["☝", "help_touch_drag"],
  ["⤢", "help_touch_pinch"],
  ["⇕", "help_touch_tilt"],
  ["◉", "help_touch_tap"],
  ["⇆", "help_touch_chips"],
  ["⋮", "help_touch_menu"],
];

export default function HelpOverlay({ lang, onTutup, tentang, onPanduan }: { lang: Lang; onTutup: () => void; tentang?: boolean; onPanduan?: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 sm:p-3 sm:backdrop-blur-[2px]" onClick={onTutup}>
      <div className="glass braket muncul lembar-hp flex w-[620px] max-w-full flex-col" role="dialog" aria-modal="true" aria-label={terjemah(lang, "help")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo size={26} className="text-accent" />
            <div>
              <div className="text-[13px] tracking-[0.3em] text-text">EYE OF GARUDA</div>
              <div className="text-[10px] tracking-[0.15em] text-muted uppercase">{terjemah(lang, tentang ? "about" : "help")}</div>
            </div>
          </div>
          <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={onTutup} title={terjemah(lang, "close")} aria-label={terjemah(lang, "close")}>
            <X size={15} />
          </button>
        </div>
        <div className="gulir max-h-[70vh] flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-relaxed text-muted max-sm:max-h-none">
          {lang === "id" ? (
            <p>
              Konsol globe interaktif untuk melihat postur pertahanan Indonesia dari luar angkasa: markas TNI, pangkalan asing di kawasan, pulau terluar,
              ALKI, kabel bawah laut, pesawat dan helikopter militer yang memancarkan ADS-B, satelit militer dan pengintai, kapal dari AIS, pangkalan kapal selam,
              serta analisis ZEE, radius tempur, impor senjata SIPRI, lini masa insiden, dan tiga simulasi War Room. Semua dari data publik; koordinat adalah perkiraan.
            </p>
          ) : (
            <p>
              An interactive globe console for Indonesia&apos;s defense posture seen from orbit: TNI bases, foreign bases in the region, outer islands, sea lanes,
              undersea cables, military aircraft and helicopters broadcasting ADS-B, military and spy satellites, AIS vessels, submarine home ports, plus EEZ,
              combat-radius, SIPRI arms-import and incident-timeline analysis, and three War Room simulations. Public data only; coordinates are approximate.
            </p>
          )}
          <div className="mt-4 hidden max-sm:block pointer-coarse:block">
            <div className="label-kecil mb-1.5 text-gold">{terjemah(lang, "help_touch")}</div>
            <ul className="space-y-1.5">
              {SENTUH.map(([ikon, k]) => (
                <li key={k} className="flex items-start gap-2.5 border-b border-white/5 pb-1.5 text-text">
                  <span className="w-5 shrink-0 text-center text-accent" aria-hidden>
                    {ikon}
                  </span>
                  {terjemah(lang, k)}
                </li>
              ))}
            </ul>
          </div>
          <div className="label-kecil mb-1 mt-4 text-gold">{terjemah(lang, "help_keys_title")}</div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
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
          {onPanduan && (
            <button className="tombol-hud mt-4" onClick={onPanduan}>
              {terjemah(lang, "help_replay_guide")}
            </button>
          )}
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
