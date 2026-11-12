"use client";

import { X } from "lucide-react";
import { terjemah, type Lang, type KunciKamus } from "@/lib/i18n";
import { LAPISAN } from "@/lib/layers";
import { useFokusPanel } from "@/lib/useFokusPanel";
import Logo from "./Logo";

const PINTASAN: [string, KunciKamus][] = [
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
  ["D", "help_d"],
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
  const panel = useFokusPanel<HTMLDivElement>({ jebak: true });
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 sm:p-3 sm:backdrop-blur-[2px]" onClick={onTutup}>
      <div ref={panel} tabIndex={-1} className="glass braket muncul lembar-hp flex w-[620px] max-w-full flex-col outline-none" role="dialog" aria-modal="true" aria-label={terjemah(lang, "help")} onClick={(e) => e.stopPropagation()}>
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
          <p>{terjemah(lang, "about_text")}</p>
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
          <div className="label-kecil mb-1 mt-4 text-gold">{terjemah(lang, "help_layers_title")}</div>
          <p className="mb-1.5 text-[10.5px] text-dim">{terjemah(lang, "help_layers_note")}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2" data-testid="bantuan-lapisan">
            {LAPISAN.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 border-b border-white/5 py-1">
                <span className="flex min-w-0 items-center gap-2 text-text">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.warna }} />
                  <span className="truncate">{l.nama[lang]}</span>
                </span>
                <span className="kbd">{l.tombol}</span>
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
