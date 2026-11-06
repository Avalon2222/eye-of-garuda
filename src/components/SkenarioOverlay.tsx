"use client";

import { Square, SkipForward, SkipBack, RotateCcw, Swords } from "lucide-react";
import { type Skenario, hitungAngka } from "@/lib/skenario";
import { terjemah, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  skenario: Skenario;
  fase: number;
  onStop: () => void;
  onLanjut: () => void;
  onMundur: () => void;
  onUlang: () => void;
}

export default function SkenarioOverlay({ lang, skenario, fase, onStop, onLanjut, onMundur, onUlang }: Props) {
  const f = skenario.fase[fase];
  if (!f) return null;
  const terakhir = fase === skenario.fase.length - 1;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[60px] z-30 flex justify-center px-2 sm:bottom-[72px] sm:px-3">
      <div key={fase} className="glass braket muncul pointer-events-auto flex max-h-[62vh] w-[720px] max-w-full flex-col sm:max-h-[56vh]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 border border-warn/70 px-1.5 py-0.5 text-[9px] tracking-[0.2em] text-warn">{terjemah(lang, "scenario_fictional")}</span>
            <div className="label-kecil truncate text-accent">
              <Swords size={11} className="mr-1 inline-block" />
              {skenario.judul[lang]} · {terjemah(lang, "scenario_phase")} {fase + 1}/{skenario.fase.length}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button className="tombol-ikon !h-7 !w-7" onClick={onMundur} disabled={fase === 0} title={terjemah(lang, "scenario_prev")}>
              <SkipBack size={13} />
            </button>
            {terakhir ? (
              <button className="tombol-ikon !h-7 !w-7" onClick={onUlang} title={terjemah(lang, "scenario_replay")}>
                <RotateCcw size={13} />
              </button>
            ) : (
              <button className="tombol-ikon !h-7 !w-7" onClick={onLanjut} title={terjemah(lang, "scenario_next")}>
                <SkipForward size={13} />
              </button>
            )}
            <button className="tombol-ikon !h-7 !w-7" onClick={onStop} title={terjemah(lang, "scenario_stop")}>
              <Square size={13} />
            </button>
          </div>
        </div>
        <div className="gulir overflow-y-auto px-4 py-3 sm:px-5">
          <div className="text-[17px] tracking-[0.25em] text-gold sm:text-[18px]">{f.judul[lang]}</div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-text">{f.teks[lang]}</p>
          {f.angka && f.angka.length > 0 && (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
              {f.angka.map((a) => (
                <div key={a.label.en} className="flex items-baseline justify-between gap-3 border-b border-white/5 py-0.5 text-[11px]">
                  <dt className="text-muted">{a.label[lang]}</dt>
                  <dd className="shrink-0 tabular-nums text-text">{hitungAngka(a, lang)}</dd>
                </div>
              ))}
            </dl>
          )}
          {f.lingkaran && f.lingkaran.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-muted">
              {f.lingkaran.map((l) => (
                <span key={l.label.en} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full border" style={{ borderColor: l.warna }} />
                  {l.label[lang]}
                </span>
              ))}
            </div>
          )}
          {terakhir && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="label-kecil mb-1 text-gold">{terjemah(lang, "conclusions")}</div>
                <ol className="list-decimal space-y-1 pl-4 text-[11.5px] leading-snug text-text">
                  {skenario.kesimpulan[lang].map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ol>
              </div>
              <div>
                <div className="label-kecil mb-1 text-accent">{terjemah(lang, "recommendations")}</div>
                <ol className="list-decimal space-y-1 pl-4 text-[11.5px] leading-snug text-text">
                  {skenario.saran[lang].map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}
          <p className="mt-3 border-l-2 border-warn/60 pl-2 text-[10px] leading-snug text-muted">{terjemah(lang, "scenario_disclaimer")}</p>
        </div>
        <div className="flex gap-1 px-4 pb-3 sm:px-5">
          {skenario.fase.map((x, i) => (
            <span key={x.kode} className={`h-[2px] flex-1 ${i <= fase ? "bg-accent" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
