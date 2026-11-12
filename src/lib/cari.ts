/** Pencarian objek di palet Search (Ctrl+K). */

import type { LayerId } from "./layers";

export interface EntriCari {
  id: string;
  lapisan: LayerId;
  nama: string;
  sub: string;
  lon: number;
  lat: number;
  props: Record<string, unknown>;
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
