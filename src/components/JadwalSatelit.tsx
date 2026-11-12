"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Orbit, RefreshCw } from "lucide-react";
import { terjemah, type Lang } from "@/lib/i18n";
import { useFokusPanel } from "@/lib/useFokusPanel";
import { warnaSatelit, kodeNegara } from "@/lib/live/satelit";
import type { Lintasan } from "@/lib/live/lintasan";

interface Props {
  lang: Lang;
  lintasan: Lintasan[] | null;
  sekarang: number[];
  dihitung: number | null;
  sedangHitung: boolean;
  lapisanAktif: boolean;
  onTutup: () => void;
  onHitung: () => void;
  onPilih: (norad: number) => void;
}

function jam(ms: number, zona: "Z" | "WIB"): string {
  const d = new Date(ms + (zona === "WIB" ? 7 * 3600_000 : 0));
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Jadwal lintasan satelit strategis (LEO) di atas Indonesia, 12 jam ke depan. */
export default function JadwalSatelit({ lang, lintasan, sekarang, dihitung, sedangHitung, lapisanAktif, onTutup, onHitung, onPilih }: Props) {
  const [tick, setTick] = useState(() => Date.now());
  const panel = useFokusPanel<HTMLDivElement>({ jebak: true });
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const mendatang = useMemo(() => (lintasan ?? []).filter((l) => l.keluar > tick).slice(0, 80), [lintasan, tick]);
  const diAtas = useMemo(() => (lintasan ?? []).filter((l) => l.masuk <= tick && l.keluar > tick), [lintasan, tick]);
  const jumlahSekarang = Math.max(sekarang.length, diAtas.length);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 sm:p-3 sm:backdrop-blur-[2px]" onClick={onTutup}>
      <div ref={panel} tabIndex={-1} className="glass braket muncul lembar-hp flex max-h-[82vh] w-[640px] max-w-full flex-col outline-none" role="dialog" aria-modal="true" aria-label={terjemah(lang, "passes_title")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <Orbit size={22} className="text-accent" />
            <div>
              <div className="text-[13px] tracking-[0.25em] text-text">{terjemah(lang, "passes_title")}</div>
              <div className="text-[10px] tracking-[0.1em] text-muted">{terjemah(lang, "passes_sub")}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button className={`tombol-ikon !h-7 !w-7 ${sedangHitung ? "animate-spin" : ""}`} onClick={onHitung} disabled={sedangHitung || !lapisanAktif} title={terjemah(lang, "passes_refresh")} aria-label={terjemah(lang, "passes_refresh")}>
              <RefreshCw size={13} />
            </button>
            <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={onTutup} title={`${terjemah(lang, "close")} (Esc)`} aria-label={terjemah(lang, "close")}>
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 border-b border-white/10 px-4 py-2 text-[11px]">
          <div>
            <div className="label-kecil text-[9px]">{terjemah(lang, "passes_now")}</div>
            <div className="text-[18px] leading-none text-gold tabular-nums">{jumlahSekarang}</div>
          </div>
          <div className="flex flex-1 flex-wrap gap-x-3 gap-y-0.5">
            {diAtas.slice(0, 8).map((l) => (
              <button key={`${l.norad}-${l.masuk}`} className="sentuh truncate text-[10.5px] hover:underline" style={{ color: warnaSatelit(l.kelompok) }} onClick={() => onPilih(l.norad)}>
                {l.nama} ({kodeNegara(l.negara)})
              </button>
            ))}
          </div>
          {dihitung && <div className="text-[9.5px] text-dim">{jam(dihitung, "Z")}Z</div>}
        </div>
        <div className="gulir flex-1 overflow-y-auto">
          {!lapisanAktif ? (
            <p className="px-4 py-6 text-center text-[11.5px] text-muted">{terjemah(lang, "passes_need_layer")}</p>
          ) : sedangHitung && !lintasan ? (
            <p className="px-4 py-6 text-center text-[11.5px] text-muted">{terjemah(lang, "passes_computing")}</p>
          ) : mendatang.length === 0 ? (
            <p className="px-4 py-6 text-center text-[11.5px] text-muted">{terjemah(lang, "passes_none")}</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-[#0a0f1c] text-[9px] uppercase tracking-[0.15em] text-muted">
                <tr>
                  <th className="px-3 py-1.5 text-left font-normal">{terjemah(lang, "passes_enter")} Z / WIB</th>
                  <th className="px-2 py-1.5 text-left font-normal">
                    Satelit
                    <span className="sm:hidden">
                      {" "}
                      · {terjemah(lang, "passes_alt")} · {terjemah(lang, "passes_dir")}
                    </span>
                  </th>
                  <th className="px-2 py-1.5 text-right font-normal">{terjemah(lang, "passes_duration")}</th>
                  <th className="hidden px-2 py-1.5 text-right font-normal sm:table-cell">{terjemah(lang, "passes_alt")}</th>
                  <th className="hidden px-3 py-1.5 text-right font-normal sm:table-cell">{terjemah(lang, "passes_dir")}</th>
                </tr>
              </thead>
              <tbody>
                {mendatang.map((l) => {
                  const aktif = l.masuk <= tick;
                  const menit = Math.round((l.keluar - l.masuk) / 60000);
                  return (
                    <tr key={`${l.norad}-${l.masuk}`} className={`cursor-pointer border-t border-white/5 hover:bg-white/[0.04] ${aktif ? "bg-white/[0.05]" : ""}`} onClick={() => onPilih(l.norad)}>
                      <td className="px-3 py-1.5 tabular-nums text-text">
                        {jam(l.masuk, "Z")}
                        <span className="text-dim"> / {jam(l.masuk, "WIB")}</span>
                        {aktif && <span className="ml-1 text-[9px] tracking-[0.15em] text-accent">LIVE</span>}
                      </td>
                      <td className="px-2 py-1.5">
                        <span style={{ color: warnaSatelit(l.kelompok) }}>{l.nama}</span>
                        <span className="text-muted"> ({kodeNegara(l.negara)})</span>
                        <span className="block text-[10px] tabular-nums text-muted sm:hidden">
                          {Math.round(l.altKm).toLocaleString("en-US")} km · {l.arah === "S→U" ? "S → N" : "N → S"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-text">{menit} min</td>
                      <td className="hidden px-2 py-1.5 text-right tabular-nums text-muted sm:table-cell">{Math.round(l.altKm).toLocaleString("en-US")} km</td>
                      <td className="hidden px-3 py-1.5 text-right text-muted sm:table-cell">{l.arah === "S→U" ? "S → N" : "N → S"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="border-t border-white/10 px-4 py-2 text-[9.5px] leading-snug text-dim">{terjemah(lang, "sat_caveat")}</p>
      </div>
    </div>
  );
}
