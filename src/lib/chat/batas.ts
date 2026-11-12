/**
 * Pembatas laju untuk /api/chat: jendela tetap per kunci (alamat IP yang sudah di-hash).
 * Hitungan disimpan di Runtime Cache Vercel, jadi tidak hilang saat server baru menyala dan dipakai
 * bersama oleh semua instance. Di luar Vercel (lokal, tes) paket yang sama memakai memori biasa.
 */

import { createHash } from "node:crypto";

export interface Penyimpan {
  get(kunci: string): Promise<unknown>;
  set(kunci: string, nilai: unknown, opsi?: { ttl?: number }): Promise<unknown>;
}

interface Hitungan {
  mulai: number;
  n: number;
}

function isHitungan(v: unknown): v is Hitungan {
  return !!v && typeof v === "object" && typeof (v as Hitungan).mulai === "number" && typeof (v as Hitungan).n === "number";
}

/** IP tidak disimpan mentah, cukup sidik pendeknya. */
export function sidikIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export interface StatusBatas {
  /** true kalau permintaan ini sudah melewati batas */
  lewat: boolean;
  /** sisa permintaan di jendela berjalan */
  sisa: number;
  /** detik sampai jendela dibuka lagi */
  resetDetik: number;
}

/**
 * Catat satu permintaan untuk kunci ini dan laporkan sisa jatahnya di jendela berjalan.
 * Kalau penyimpan bermasalah, permintaan diloloskan: lebih baik asisten tetap menjawab.
 */
export async function catatPermintaan(penyimpan: Penyimpan, kunci: string, batas: number, jendelaMs: number, kini = Date.now()): Promise<StatusBatas> {
  try {
    const lama = await penyimpan.get(kunci);
    const h: Hitungan = isHitungan(lama) && kini - lama.mulai < jendelaMs ? { mulai: lama.mulai, n: lama.n + 1 } : { mulai: kini, n: 1 };
    const resetDetik = Math.max(1, Math.ceil((h.mulai + jendelaMs - kini) / 1000));
    await penyimpan.set(kunci, h, { ttl: resetDetik });
    return { lewat: h.n > batas, sisa: Math.max(0, batas - h.n), resetDetik };
  } catch (e) {
    console.warn("[chat] penyimpan batas laju bermasalah:", e instanceof Error ? e.message : e);
    return { lewat: false, sisa: batas, resetDetik: Math.ceil(jendelaMs / 1000) };
  }
}

/** Versi ringkas: true kalau kunci ini sudah melewati batas. */
export async function lewatBatas(penyimpan: Penyimpan, kunci: string, batas: number, jendelaMs: number, kini = Date.now()): Promise<boolean> {
  return (await catatPermintaan(penyimpan, kunci, batas, jendelaMs, kini)).lewat;
}

/** Penyimpan di memori, dipakai tes dan sebagai cadangan. */
export class PenyimpanMemori implements Penyimpan {
  private isi = new Map<string, { nilai: unknown; habis: number }>();
  constructor(private jam: () => number = Date.now) {}
  async get(kunci: string): Promise<unknown> {
    const e = this.isi.get(kunci);
    if (!e) return null;
    if (e.habis <= this.jam()) {
      this.isi.delete(kunci);
      return null;
    }
    return e.nilai;
  }
  async set(kunci: string, nilai: unknown, opsi?: { ttl?: number }): Promise<void> {
    if (this.isi.size > 5000) this.isi.clear();
    this.isi.set(kunci, { nilai, habis: this.jam() + (opsi?.ttl ?? 3600) * 1000 });
  }
}
