/**
 * Pilihan objek saat klik/ketuk mengenai beberapa objek sekaligus (misal markas TNI yang menumpuk
 * dengan landing station kabel). Objek diurutkan menurut prioritas lapisan, lalu jarak ke titik klik.
 */

import type { LayerId } from "./layers";
import type { Pilihan } from "./types";

/** Makin kecil makin diutamakan. Markas TNI > pangkalan asing > ... > bandara > pelabuhan > kabel. */
export const PRIORITAS_KLIK: Record<LayerId, number> = {
  tni: 0,
  asing: 1,
  kapalselam: 2,
  pesawat: 3,
  kapal: 4,
  satelit: 5,
  insiden: 6,
  bandara: 7,
  pelabuhan: 8,
  kabel: 9,
  batas: 10,
  sipri: 11,
  radius: 12,
  alki: 13,
  zee: 14,
};

export interface CalonKlik {
  pilihan: Pilihan;
  /** jarak kuadrat (px²) ke titik klik */
  d2: number;
}

/** Kunci unik objek: satu objek bisa kena di beberapa layer MapLibre (titik + label). */
export function kunciObjek(p: Pilihan): string {
  return `${p.lapisan}:${String(p.props.id ?? p.props.nama ?? `${p.lon},${p.lat}`)}`;
}

/** Buang duplikat, urutkan menurut prioritas lapisan lalu jarak. */
export function urutkanCalon(calon: CalonKlik[]): CalonKlik[] {
  const terdekat = new Map<string, CalonKlik>();
  for (const c of calon) {
    const k = kunciObjek(c.pilihan);
    const lama = terdekat.get(k);
    if (!lama || c.d2 < lama.d2) terdekat.set(k, c);
  }
  return [...terdekat.values()].sort((a, b) => (PRIORITAS_KLIK[a.pilihan.lapisan] ?? 99) - (PRIORITAS_KLIK[b.pilihan.lapisan] ?? 99) || a.d2 - b.d2);
}
