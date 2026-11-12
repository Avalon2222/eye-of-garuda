/** Konstanta gaya bersama untuk semua penggambar kanvas: font, warna dasar, pemudaran. */

import { FONT_MONO } from "../font";
import type { Aktor } from "../skenario";

export const FONT = `10px ${FONT_MONO}`;
export const FONT_KECIL = `9px ${FONT_MONO}`;
export const FONT_BESAR = `11px ${FONT_MONO}`;
/** warna tepi gelap di balik ikon dan teks supaya terbaca di atas peta terang/gelap */
export const WARNA_TEPI = "#05080f";

/** satelit memudar antara dua zoom ini (di atasnya proyeksi globe tidak lagi dipakai MapLibre) */
export const ZOOM_SAT_PUDAR: [number, number] = [9.5, 11];
export const LAMA_PUDAR_MS = 450;

export function warnaPihak(pihak: Aktor["pihak"]): string {
  return pihak === "tni" ? "#4ade80" : pihak === "lawan" ? "#ef4444" : "#e2e8f0";
}

/** Geser nilai alpha ke target dengan kecepatan tetap (LAMA_PUDAR_MS dari 0 ke 1). */
export function pudar(nilai: number, target: number, dtMs: number): number {
  const langkah = dtMs / LAMA_PUDAR_MS;
  if (target > nilai) return Math.min(target, nilai + langkah);
  return Math.max(target, nilai - langkah);
}

export function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

/** Teks dengan garis tepi gelap. Font dan textAlign diatur pemanggil. */
export function teks(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, warna: string): void {
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(5,8,15,0.9)";
  ctx.strokeText(s, x, y);
  ctx.fillStyle = warna;
  ctx.fillText(s, x, y);
}
