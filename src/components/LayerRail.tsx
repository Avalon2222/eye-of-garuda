"use client";

import { useState } from "react";
import { Shield, Flag, Mountain, Waves, Cable, Ship, Plane, Satellite, Pentagon, Target, ArrowRightLeft, History, ChevronLeft, Layers } from "lucide-react";
import { LAPISAN, GRUP_URUT, type LayerId, type Grup } from "@/lib/layers";
import { terjemah, type Lang } from "@/lib/i18n";

const IKON: Record<LayerId, React.ComponentType<{ size?: number; className?: string }>> = {
  tni: Shield,
  asing: Flag,
  batas: Mountain,
  alki: Waves,
  kabel: Cable,
  kapal: Ship,
  pesawat: Plane,
  satelit: Satellite,
  zee: Pentagon,
  radius: Target,
  sipri: ArrowRightLeft,
  insiden: History,
};

const KUNCI_GRUP: Record<Grup, "group_darat" | "group_laut" | "group_udara" | "group_analisis"> = {
  darat: "group_darat",
  laut: "group_laut",
  udara: "group_udara",
  analisis: "group_analisis",
};

interface Props {
  lang: Lang;
  aktif: Set<LayerId>;
  jumlah: Partial<Record<LayerId, number>>;
  onToggle: (id: LayerId) => void;
  tersedia: Set<LayerId>;
}

export default function LayerRail({ lang, aktif, jumlah, onToggle, tersedia }: Props) {
  const [terbuka, setTerbuka] = useState(true);

  return (
    <aside className={`pointer-events-auto absolute left-2 top-[72px] z-20 hidden max-h-[calc(100%-150px)] flex-col sm:flex sm:left-3 sm:top-[84px] ${terbuka ? "w-[250px]" : "w-[46px]"} transition-[width] duration-200`}>
      <div className="glass braket flex h-full flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-2 py-1.5">
          {terbuka && (
            <span className="label-kecil flex items-center gap-2 pl-1">
              <Layers size={12} /> {terjemah(lang, "layers")}
            </span>
          )}
          <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={() => setTerbuka(!terbuka)} title={terjemah(lang, "layers")}>
            {terbuka ? <ChevronLeft size={14} /> : <Layers size={14} />}
          </button>
        </div>
        <div className="gulir flex-1 overflow-y-auto py-1">
          {GRUP_URUT.map((g) => (
            <div key={g} className="mb-1">
              {terbuka && <div className="label-kecil px-3 pt-2 pb-1 text-[9px]">{terjemah(lang, KUNCI_GRUP[g])}</div>}
              {LAPISAN.filter((l) => l.grup === g).map((l) => {
                const Ikon = IKON[l.id];
                const on = aktif.has(l.id);
                const ada = tersedia.has(l.id);
                return (
                  <button
                    key={l.id}
                    onClick={() => onToggle(l.id)}
                    disabled={!ada}
                    title={`${l.nama[lang]} [${l.tombol}]`}
                    className={`group flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors ${on ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"} ${ada ? "" : "opacity-40"}`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center border"
                      style={{ borderColor: on ? l.warna : "rgba(255,255,255,0.1)", color: on ? l.warna : "#5b6475", background: on ? `${l.warna}1a` : "transparent" }}
                    >
                      <Ikon size={14} />
                    </span>
                    {terbuka && (
                      <>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[11.5px] ${on ? "text-text" : "text-muted"}`}>{l.nama[lang]}</span>
                          <span className="block truncate text-[9.5px] text-dim">{l.deskripsi[lang]}</span>
                        </span>
                        <span className="flex flex-col items-end gap-0.5">
                          <span className={`text-[10px] tabular-nums ${on ? "text-text" : "text-dim"}`}>{jumlah[l.id] != null ? jumlah[l.id]!.toLocaleString("en-US") : "–"}</span>
                          {l.jenis === "live" && <span className={`text-[8px] tracking-[0.2em] ${on ? "text-accent" : "text-dim"}`}>LIVE</span>}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/** Baris chip untuk layar kecil (ponsel). */
export function LayerChips({ lang, aktif, onToggle, tersedia }: Omit<Props, "jumlah">) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-[38px] z-20 flex gap-1.5 overflow-x-auto px-2 pb-1 sm:hidden [scrollbar-width:none]">
      {LAPISAN.filter((l) => tersedia.has(l.id)).map((l) => {
        const Ikon = IKON[l.id];
        const on = aktif.has(l.id);
        return (
          <button
            key={l.id}
            onClick={() => onToggle(l.id)}
            className="glass flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 text-[11px]"
            style={{ borderColor: on ? l.warna : undefined, color: on ? l.warna : "#8b95a7" }}
          >
            <Ikon size={13} /> {l.nama[lang]}
          </button>
        );
      })}
    </div>
  );
}
