/**
 * Pemuat indeks objek di server. Berkas GeoJSON dibaca dari public/data (ikut dibundel lewat
 * outputFileTracingIncludes di next.config.ts); kalau gagal, diambil lewat HTTP dari situs sendiri.
 * Hasilnya disimpan di memori selama instance hidup.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { BERKAS_CHAT, LAPISAN_CHAT, bangunIndeks, type KoleksiMentah, type LapisanChat, type ObjekPeta } from "./indeks";

let janji: Promise<ObjekPeta[]> | null = null;

async function bacaBerkas(berkas: string, asal?: string): Promise<KoleksiMentah | null> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "public", "data", berkas), "utf8")) as KoleksiMentah;
  } catch {
    /* lanjut ke HTTP */
  }
  if (!asal) return null;
  try {
    const res = await fetch(`${asal}/data/${berkas}`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as KoleksiMentah;
  } catch (e) {
    console.warn(`[chat] gagal memuat ${berkas}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** `asal`: origin situs (https://...), dipakai hanya kalau pembacaan berkas gagal. */
export function muatIndeks(asal?: string): Promise<ObjekPeta[]> {
  if (!janji) {
    janji = (async () => {
      const sumber: Partial<Record<LapisanChat, KoleksiMentah>> = {};
      await Promise.all(
        LAPISAN_CHAT.map(async (l) => {
          const k = await bacaBerkas(BERKAS_CHAT[l], asal);
          if (k) sumber[l] = k;
        }),
      );
      const indeks = bangunIndeks(sumber);
      // jangan simpan hasil kosong, supaya permintaan berikutnya mencoba lagi
      if (indeks.length === 0) janji = null;
      return indeks;
    })();
  }
  return janji;
}
