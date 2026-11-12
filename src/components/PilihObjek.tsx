"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { lapisanDariId } from "@/lib/layers";
import { terjemah, type Lang } from "@/lib/i18n";
import type { Pilihan } from "@/lib/types";
import { barisUntuk } from "./DetailPanel";

interface Props {
  lang: Lang;
  /** posisi klik di layar (px, relatif wadah peta) */
  x: number;
  y: number;
  lebar: number;
  tinggi: number;
  daftar: Pilihan[];
  /** jumlah objek lain yang tidak muat di daftar */
  sisa: number;
  onPilih: (p: Pilihan) => void;
  onTutup: () => void;
}

const LEBAR_MENU = 260;

/** Daftar pilihan kecil saat klik/ketuk mengenai lebih dari satu objek. */
export default function PilihObjek({ lang, x, y, lebar, tinggi, daftar, sisa, onPilih, onTutup }: Props) {
  useEffect(() => {
    // capture + stop: Esc cukup menutup daftar ini, tidak ikut menutup panel lain
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onTutup();
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onTutup]);

  const kiri = Math.max(8, Math.min(x + 12, lebar - LEBAR_MENU - 8));
  const perkiraanTinggi = 40 + daftar.length * 46 + (sisa ? 28 : 0);
  const atas = Math.max(64, Math.min(y + 12, tinggi - perkiraanTinggi - 96));

  return (
    <div
      role="dialog"
      aria-label={terjemah(lang, "pick_object")}
      data-testid="pilih-objek"
      className="glass braket muncul pointer-events-auto absolute z-40"
      style={{ left: kiri, top: atas, width: LEBAR_MENU, maxWidth: "calc(100% - 16px)" }}
    >
      <div className="flex items-center justify-between border-b border-white/10 py-1 pl-3 pr-1">
        <span className="label-kecil text-[9px]">{terjemah(lang, "pick_object_n", { n: daftar.length + sisa })}</span>
        <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={onTutup} title={`${terjemah(lang, "close")} (Esc)`} aria-label={terjemah(lang, "close")}>
          <X size={13} />
        </button>
      </div>
      <ul className="py-1">
        {daftar.map((p, i) => {
          const def = lapisanDariId(p.lapisan);
          const { judul } = barisUntuk(p, lang);
          return (
            <li key={`${p.lapisan}-${String(p.props.id ?? i)}`}>
              <button
                autoFocus={i === 0}
                onClick={() => onPilih(p)}
                className="sentuh flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: def?.warna }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] text-text">{judul || "—"}</span>
                  <span className="block truncate text-[10px] text-muted">{def?.nama[lang]}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {sisa > 0 && <div className="border-t border-white/10 px-3 py-1.5 text-[10px] text-dim">{terjemah(lang, "pick_object_more", { n: sisa })}</div>}
    </div>
  );
}
