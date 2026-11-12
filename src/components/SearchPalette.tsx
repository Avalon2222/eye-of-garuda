"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { lapisanDariId, type LayerId } from "@/lib/layers";
import { terjemah, type Lang } from "@/lib/i18n";
import { useFokusPanel } from "@/lib/useFokusPanel";

export interface EntriCari {
  id: string;
  lapisan: LayerId;
  nama: string;
  sub: string;
  lon: number;
  lat: number;
  props: Record<string, unknown>;
}

interface Props {
  lang: Lang;
  indeks: EntriCari[];
  onPilih: (e: EntriCari) => void;
  onTutup: () => void;
}

/** Kelompok hasil: wilayah (pulau, laut, ZEE, ALKI) > markas > insiden > fasilitas & lainnya. */
const GRUP_CARI: Partial<Record<LayerId, number>> = {
  batas: 4,
  zee: 4,
  alki: 4,
  tni: 3,
  asing: 3,
  kapalselam: 3,
  insiden: 2,
};

function rapikan(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nama tanpa keterangan dalam kurung: "Lanal Ranai (Natuna)" -> "lanal ranai". */
function namaInti(n: string): string {
  return n.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Skor pencarian (makin besar makin atas). Urutan: nama persis > pulau/wilayah > markas > insiden >
 * fasilitas (kabel, pelabuhan, bandara). Kecocokan di nama selalu di atas kecocokan di keterangan.
 */
export function skorCari(q: string, e: Pick<EntriCari, "nama" | "sub" | "lapisan">): number {
  const n = rapikan(e.nama);
  const qq = rapikan(q);
  if (!qq) return 0;
  const grup = GRUP_CARI[e.lapisan] ?? 1;
  if (n === qq || namaInti(n) === qq) return 1000 + grup;
  let cocok = 0;
  if (n.startsWith(qq)) cocok = 3;
  else if (new RegExp(`(^|[\\s(/-])${qq.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(n)) cocok = 2;
  else if (n.includes(qq)) cocok = 1;
  if (cocok) return 100 + grup * 10 + cocok;
  if (rapikan(e.sub).includes(qq)) return grup;
  return 0;
}

/** Hasil pencarian terurut (dipakai palet dan tes). */
export function cariEntri(q: string, indeks: EntriCari[], maks = 14): EntriCari[] {
  if (!rapikan(q)) return indeks.slice(0, 12);
  return indeks
    .map((e) => ({ e, s: skorCari(q, e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.nama.length - b.e.nama.length || a.e.nama.localeCompare(b.e.nama))
    .slice(0, maks)
    .map((x) => x.e);
}

export default function SearchPalette({ lang, indeks, onPilih, onTutup }: Props) {
  const [q, setQ] = useState("");
  const [aktif, setAktif] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const panel = useFokusPanel<HTMLDivElement>({ jebak: true });
  useEffect(() => input.current?.focus(), []);

  const hasil = useMemo(() => cariEntri(q, indeks), [q, indeks]);

  const tekan = (ev: React.KeyboardEvent) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setAktif((a) => Math.min(hasil.length - 1, a + 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setAktif((a) => Math.max(0, a - 1));
    } else if (ev.key === "Enter" && hasil[aktif]) {
      onPilih(hasil[aktif]);
    } else if (ev.key === "Escape") {
      onTutup();
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-start justify-center bg-black/40 pt-[12vh] backdrop-blur-[2px]" onClick={onTutup}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={terjemah(lang, "search")} tabIndex={-1} className="glass braket muncul w-[560px] max-w-[94vw] outline-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-white/10 px-3">
          <Search size={15} className="text-accent" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setAktif(0);
            }}
            onKeyDown={tekan}
            placeholder={terjemah(lang, "search_hint")}
            aria-label={terjemah(lang, "search_hint")}
            className="h-11 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-dim"
          />
          <span className="kbd">Esc</span>
        </div>
        <ul className="gulir max-h-[50vh] overflow-y-auto py-1">
          {hasil.length === 0 && <li className="px-3 py-3 text-[12px] text-dim">{terjemah(lang, "no_result")}</li>}
          {hasil.map((e, i) => {
            const def = lapisanDariId(e.lapisan);
            return (
              <li key={e.id}>
                <button
                  onMouseEnter={() => setAktif(i)}
                  onClick={() => onPilih(e)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === aktif ? "bg-white/[0.06]" : ""}`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: def?.warna }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-text">{e.nama}</span>
                    <span className="block truncate text-[10.5px] text-muted">
                      {def?.nama[lang]} · {e.sub}
                    </span>
                  </span>
                  {i === aktif && <CornerDownLeft size={13} className="text-dim" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
