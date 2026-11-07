"use client";

import { useEffect, useState } from "react";
import { Square, SkipForward, SkipBack, RotateCcw, Swords, Cable, Radiation, ChevronDown, ChevronUp, Download, Camera, Video, X, Play } from "lucide-react";
import { type Skenario, hitungAngka, SKENARIO, TAHAN_KESIMPULAN_MS } from "@/lib/skenario";
import { terjemah, type Lang } from "@/lib/i18n";

const IKON = { swords: Swords, cable: Cable, radiation: Radiation };

interface PropsPilih {
  lang: Lang;
  onPilih: (id: string) => void;
  onTutup: () => void;
}

/** Pemilih skenario: kartu untuk tiap simulasi. */
export function SkenarioPicker({ lang, onPilih, onTutup }: PropsPilih) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px]" onClick={onTutup}>
      <div className="glass braket muncul w-[760px] max-w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <div className="label-kecil text-accent">{terjemah(lang, "scenario")}</div>
            <div className="text-[15px] tracking-[0.2em] text-gold">{terjemah(lang, "scenario_pick")}</div>
          </div>
          <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={onTutup} title="Esc">
            <X size={15} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-3">
          {SKENARIO.map((s) => {
            const Ikon = IKON[s.ikon];
            return (
              <button key={s.id} onClick={() => onPilih(s.id)} className="group flex flex-col gap-2 border border-white/10 bg-white/[0.02] p-3 text-left transition-colors hover:border-white/30 hover:bg-white/[0.05]">
                <span className="flex h-9 w-9 items-center justify-center border" style={{ borderColor: s.warna, color: s.warna, background: `${s.warna}1a` }}>
                  <Ikon size={18} />
                </span>
                <span className="text-[12.5px] tracking-[0.12em] text-text">{s.judul[lang]}</span>
                <span className="text-[10.5px] leading-snug text-muted">{s.sub[lang]}</span>
                <span className="mt-auto flex items-center gap-1 pt-1 text-[10px] uppercase tracking-[0.15em] text-dim group-hover:text-text">
                  <Play size={11} /> {terjemah(lang, "scenario_start")} · {s.fase.length} {terjemah(lang, "scenario_phases")}
                </span>
              </button>
            );
          })}
        </div>
        <p className="border-t border-white/10 px-4 py-2 text-[10px] leading-snug text-muted">{terjemah(lang, "scenario_pick_sub")}</p>
      </div>
    </div>
  );
}

interface Props {
  lang: Lang;
  skenario: Skenario;
  fase: number;
  /** ms epoch saat fase terakhir mulai, untuk hitung mundur auto-close */
  mulaiFase: number;
  merekam: boolean;
  bisaRekam: boolean;
  onStop: () => void;
  onLanjut: () => void;
  onMundur: () => void;
  onUlang: () => void;
  onEksporMd: () => void;
  onEksporPng: () => void;
  onRekam: () => void;
}

export default function SkenarioOverlay({ lang, skenario, fase, mulaiFase, merekam, bisaRekam, onStop, onLanjut, onMundur, onUlang, onEksporMd, onEksporPng, onRekam }: Props) {
  // dilipat hanya berlaku untuk fase saat tombol ditekan (di HP); fase baru membuka panel lagi di desktop
  const [lipat, setLipat] = useState<{ fase: number; kecil: boolean; hp: boolean } | null>(null);
  const kecil = Boolean(lipat?.kecil && (lipat.fase === fase || lipat.hp));
  const setKecil = (k: boolean) => setLipat({ fase, kecil: k, hp: typeof window !== "undefined" && window.innerWidth < 640 });
  const [sisa, setSisa] = useState(TAHAN_KESIMPULAN_MS);
  const f = skenario.fase[fase];
  const terakhir = fase === skenario.fase.length - 1;
  useEffect(() => {
    if (!terakhir) return;
    const id = setInterval(() => setSisa(Math.max(0, TAHAN_KESIMPULAN_MS - (Date.now() - mulaiFase))), 250);
    return () => clearInterval(id);
  }, [terakhir, mulaiFase]);
  if (!f) return null;
  const Ikon = IKON[skenario.ikon];
  const kelasKaca = "glass-tipis sm:glass";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[60px] z-30 flex justify-center px-2 sm:bottom-[72px] sm:px-3">
      <div key={fase} className={`${kelasKaca} braket muncul pointer-events-auto flex w-[720px] max-w-full flex-col ${kecil ? "max-h-[46px]" : "max-h-[46vh] sm:max-h-[56vh]"}`}>
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="hidden shrink-0 border border-warn/70 px-1.5 py-0.5 text-[9px] tracking-[0.2em] text-warn sm:inline">{terjemah(lang, "scenario_fictional")}</span>
            <div className="label-kecil teks-bayang truncate" style={{ color: skenario.warna }}>
              <Ikon size={11} className="mr-1 inline-block" />
              {skenario.judul[lang]} · {terjemah(lang, "scenario_phase")} {fase + 1}/{skenario.fase.length}
            </div>
            {merekam && (
              <span className="flex shrink-0 items-center gap-1 border border-red-500/70 px-1.5 py-0.5 text-[9px] tracking-[0.2em] text-red-400">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> {terjemah(lang, "export_recording")}
              </span>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <button className="tombol-ikon !h-7 !w-7 sm:hidden" onClick={() => setKecil(!kecil)} title={terjemah(lang, kecil ? "scenario_expand" : "scenario_minimize")}>
              {kecil ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
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
        {!kecil && (
          <>
            <div className="gulir overflow-y-auto px-3 py-2.5 sm:px-5 sm:py-3">
              <div className="teks-bayang text-[15px] tracking-[0.22em] text-gold sm:text-[18px] sm:tracking-[0.25em]">{f.judul[lang]}</div>
              <p className="teks-bayang mt-1 text-[12px] leading-relaxed text-text sm:text-[12.5px]">{f.teks[lang]}</p>
              {f.angka && f.angka.length > 0 && (
                <dl className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
                  {f.angka.map((a) => (
                    <div key={a.label.en} className="flex items-baseline justify-between gap-3 border-b border-white/5 py-0.5 text-[11px]">
                      <dt className="teks-bayang text-muted">{a.label[lang]}</dt>
                      <dd className="teks-bayang shrink-0 tabular-nums text-text">{hitungAngka(a, lang)}</dd>
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
                    <ol className="teks-bayang list-decimal space-y-1 pl-4 text-[11.5px] leading-snug text-text">
                      {skenario.kesimpulan[lang].map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <div className="label-kecil mb-1 text-accent">{terjemah(lang, "recommendations")}</div>
                    <ol className="teks-bayang list-decimal space-y-1 pl-4 text-[11.5px] leading-snug text-text">
                      {skenario.saran[lang].map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
              <p className="mt-3 border-l-2 border-warn/60 pl-2 text-[10px] leading-snug text-muted">{terjemah(lang, "scenario_disclaimer")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1 border-t border-white/10 px-3 py-2 sm:px-5">
              <span className="label-kecil mr-1 text-[9px]">{terjemah(lang, "export")}</span>
              <button className="tombol-hud !h-6 !px-2 !text-[10px]" onClick={onEksporMd} title={terjemah(lang, "export_md")}>
                <Download size={11} /> .md
              </button>
              <button className="tombol-hud !h-6 !px-2 !text-[10px]" onClick={onEksporPng} title={terjemah(lang, "export_png")}>
                <Camera size={11} /> .png
              </button>
              {bisaRekam && (
                <button className={`tombol-hud !h-6 !px-2 !text-[10px] ${merekam ? "aktif" : ""}`} onClick={onRekam} title={terjemah(lang, merekam ? "export_rec_stop" : "export_rec")}>
                  <Video size={11} /> {merekam ? terjemah(lang, "export_rec_stop") : terjemah(lang, "export_rec")}
                </button>
              )}
              <span className="flex-1" />
              {terakhir && (
                <>
                  <span className="text-[10px] tabular-nums text-muted">{terjemah(lang, "scenario_autoclose", { n: Math.ceil(sisa / 1000) })}</span>
                  <button className="tombol-hud aktif !h-6 !px-2 !text-[10px]" onClick={onStop}>
                    {terjemah(lang, "scenario_finish")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
        <div className="flex gap-1 px-3 pb-2 sm:px-5">
          {skenario.fase.map((x, i) => (
            <span key={x.kode} className="relative h-[2px] flex-1 bg-white/10">
              <span className={`absolute inset-y-0 left-0 ${i < fase ? "w-full bg-accent" : i === fase ? "bg-accent" : "w-0"}`} style={i === fase && terakhir ? { width: `${100 - (sisa / TAHAN_KESIMPULAN_MS) * 100}%`, transition: "width 250ms linear" } : i === fase ? { width: "100%", opacity: 0.6 } : undefined} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
