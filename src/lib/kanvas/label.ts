/**
 * Penata label nama satelit/pesawat: maksimal MAKS_LABEL per frame, yang paling dekat tengah layar
 * duluan, masing-masing memudar masuk/keluar. Dulu semua label muncul serentak begitu zoom lewat
 * ambang, jadi layar mendadak penuh tulisan.
 */

import type { Proyektor } from "./proyeksi";
import { teks } from "./gaya";

/** batas label nama satelit/pesawat per frame; sisanya disembunyikan (yang dekat tengah layar menang) */
export const MAKS_LABEL = 30;
const LAMA_PUDAR_LABEL_MS = 350;

interface CalonLabel {
  id: string;
  teks: string;
  x: number;
  y: number;
  warna: string;
  font: string;
  /** alpha lapisan asal (satelit/pesawat) */
  alpha: number;
  /** jarak kuadrat ke tengah layar */
  d2: number;
}

export class PenataLabel {
  /** alpha pudar per label (id objek), supaya label tidak nongol bareng saat zoom */
  private alphaLabel = new Map<string, number>();
  private calon: CalonLabel[] = [];

  /** Dipanggil di awal frame: kosongkan daftar calon. */
  mulaiFrame(): void {
    this.calon = [];
  }

  /** Lupakan semua pudaran (misal saat tidak ada lapisan kanvas yang aktif). */
  bersihkan(): void {
    this.alphaLabel.clear();
  }

  usul(p: Proyektor, id: string, s: string, x: number, y: number, warna: string, font: string, alpha: number): void {
    const dx = x - p.w / 2;
    const dy = y - p.h / 2;
    this.calon.push({ id, teks: s, x, y, warna, font, alpha, d2: dx * dx + dy * dy });
  }

  gambar(ctx: CanvasRenderingContext2D, p: Proyektor, dt: number): void {
    const calon = this.calon;
    calon.sort((a, b) => a.d2 - b.d2);
    const langkah = dt / LAMA_PUDAR_LABEL_MS;
    const ada = new Set<string>();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (let i = 0; i < calon.length; i++) {
      const c = calon[i];
      ada.add(c.id);
      const target = i < MAKS_LABEL ? 1 : 0;
      const lama = this.alphaLabel.get(c.id) ?? 0;
      const baru = target > lama ? Math.min(1, lama + langkah) : Math.max(0, lama - langkah);
      if (baru <= 0) {
        this.alphaLabel.delete(c.id);
        continue;
      }
      this.alphaLabel.set(c.id, baru);
      if (c.x > p.w + 40 || c.y < -20 || c.y > p.h + 20) continue;
      ctx.globalAlpha = c.alpha * baru;
      ctx.font = c.font;
      teks(ctx, c.teks, c.x, c.y, c.warna);
    }
    for (const id of this.alphaLabel.keys()) if (!ada.has(id)) this.alphaLabel.delete(id);
  }
}
