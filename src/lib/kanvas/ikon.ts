/**
 * Ikon vektor kecil yang digambar langsung ke kanvas (kapal, kapal selam, pesawat, helikopter)
 * plus cincin sorotan objek terpilih. Semua menerima pusat (x, y), ukuran s, dan sudut radian.
 */

import type { KategoriPesawat } from "../negara";
import { WARNA_TEPI } from "./gaya";

export function ikonKapal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string): void {
  const u = s / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sudut);
  ctx.translate(-16 * u, -16 * u);
  ctx.beginPath();
  ctx.moveTo(16 * u, 2 * u);
  ctx.lineTo(24 * u, 14 * u);
  ctx.lineTo(24 * u, 30 * u);
  ctx.lineTo(8 * u, 30 * u);
  ctx.lineTo(8 * u, 14 * u);
  ctx.closePath();
  ctx.fillStyle = warna;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = WARNA_TEPI;
  ctx.stroke();
  ctx.restore();
}

/** Kapal selam dari atas: lambung lonjong setengah transparan (menyelam) + riak di belakang. */
export function ikonKapalSelam(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string, now: number): void {
  const u = s / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sudut);
  // riak
  ctx.strokeStyle = warna;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const k = (now / 900 + i / 3) % 1;
    ctx.globalAlpha = (1 - k) * 0.5;
    ctx.beginPath();
    ctx.ellipse(0, (8 + k * 18) * u, (6 + k * 10) * u, (3 + k * 4) * u, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.ellipse(0, 0, 5 * u, 15 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = warna;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = WARNA_TEPI;
  ctx.stroke();
  // menara
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.ellipse(0, -2 * u, 2.2 * u, 4 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = WARNA_TEPI;
  ctx.fill();
  ctx.restore();
}

export function ikonPesawat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string): void {
  const u = s / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sudut);
  ctx.translate(-16 * u, -16 * u);
  ctx.beginPath();
  ctx.moveTo(16 * u, 1 * u);
  ctx.lineTo(18.5 * u, 10 * u);
  ctx.lineTo(31 * u, 17 * u);
  ctx.lineTo(31 * u, 20 * u);
  ctx.lineTo(18.5 * u, 16 * u);
  ctx.lineTo(18 * u, 25 * u);
  ctx.lineTo(23 * u, 28.5 * u);
  ctx.lineTo(23 * u, 31 * u);
  ctx.lineTo(16 * u, 29 * u);
  ctx.lineTo(9 * u, 31 * u);
  ctx.lineTo(9 * u, 28.5 * u);
  ctx.lineTo(14 * u, 25 * u);
  ctx.lineTo(13.5 * u, 16 * u);
  ctx.lineTo(1 * u, 20 * u);
  ctx.lineTo(1 * u, 17 * u);
  ctx.lineTo(13.5 * u, 10 * u);
  ctx.closePath();
  ctx.fillStyle = warna;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = WARNA_TEPI;
  ctx.stroke();
  ctx.restore();
}

/** Pesawat besar (tanker, angkut, intai, pembom): sayap lurus lebar, badan panjang; tanker diberi cincin, intai diberi radome. */
export function ikonPesawatBerat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string, kategori: KategoriPesawat): void {
  const u = s / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sudut);
  ctx.translate(-16 * u, -16 * u);
  ctx.beginPath();
  ctx.moveTo(16 * u, 1 * u);
  ctx.lineTo(18.2 * u, 6 * u);
  ctx.lineTo(18.2 * u, 12 * u);
  ctx.lineTo(31 * u, 16 * u);
  ctx.lineTo(31 * u, 19 * u);
  ctx.lineTo(18.2 * u, 18 * u);
  ctx.lineTo(18 * u, 26 * u);
  ctx.lineTo(23 * u, 28.5 * u);
  ctx.lineTo(23 * u, 31 * u);
  ctx.lineTo(16 * u, 30 * u);
  ctx.lineTo(9 * u, 31 * u);
  ctx.lineTo(9 * u, 28.5 * u);
  ctx.lineTo(14 * u, 26 * u);
  ctx.lineTo(13.8 * u, 18 * u);
  ctx.lineTo(1 * u, 19 * u);
  ctx.lineTo(1 * u, 16 * u);
  ctx.lineTo(13.8 * u, 12 * u);
  ctx.lineTo(13.8 * u, 6 * u);
  ctx.closePath();
  ctx.fillStyle = warna;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = WARNA_TEPI;
  ctx.stroke();
  if (kategori === "intai") {
    ctx.beginPath();
    ctx.arc(16 * u, 15 * u, 4 * u, 0, Math.PI * 2);
    ctx.fillStyle = WARNA_TEPI;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(16 * u, 15 * u, 2.4 * u, 0, Math.PI * 2);
    ctx.fillStyle = warna;
    ctx.fill();
  } else if (kategori === "tanker") {
    ctx.beginPath();
    ctx.arc(16 * u, 16 * u, 11 * u, 0, Math.PI * 2);
    ctx.strokeStyle = warna;
    ctx.lineWidth = 1;
    ctx.setLineDash([2 * u, 2 * u]);
    ctx.stroke();
  }
  ctx.restore();
}

/** Helikopter dari atas: badan kecil + ekor + rotor yang berputar. */
export function ikonHelikopter(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string, now: number): void {
  const u = s / 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sudut);
  // ekor
  ctx.beginPath();
  ctx.moveTo(-1.5 * u, 4 * u);
  ctx.lineTo(1.5 * u, 4 * u);
  ctx.lineTo(1 * u, 15 * u);
  ctx.lineTo(4 * u, 15 * u);
  ctx.lineTo(4 * u, 17 * u);
  ctx.lineTo(-2 * u, 17 * u);
  ctx.lineTo(-1.5 * u, 4 * u);
  ctx.closePath();
  ctx.fillStyle = warna;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = WARNA_TEPI;
  ctx.stroke();
  // badan
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5 * u, 7 * u, 0, 0, Math.PI * 2);
  ctx.fillStyle = warna;
  ctx.fill();
  ctx.stroke();
  // rotor berputar
  const putar = (now / 60) % (Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 2; i++) {
    const sdt = putar + (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(sdt) * 12 * u, Math.sin(sdt) * 12 * u);
    ctx.lineTo(-Math.cos(sdt) * 12 * u, -Math.sin(sdt) * 12 * u);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, 12 * u, 0, Math.PI * 2);
  ctx.strokeStyle = warna;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Ikon pesawat sesuai kategori: helikopter berotor, pesawat berat bersayap lebar, sisanya siluet jet. */
export function ikonPesawatKategori(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string, kategori: KategoriPesawat, now: number): void {
  if (kategori === "helikopter") ikonHelikopter(ctx, x, y, s, sudut, warna, now);
  else if (kategori === "tanker" || kategori === "angkut" || kategori === "pembom" || kategori === "intai") ikonPesawatBerat(ctx, x, y, s * 1.15, sudut, warna, kategori);
  else ikonPesawat(ctx, x, y, s, sudut, warna);
}

/** Cincin bidik berdenyut di sekitar objek terpilih. */
export function cincin(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
  const denyut = (now % 1600) / 1600;
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1 - denyut;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 11 + denyut * 12, 0, Math.PI * 2);
  ctx.stroke();
  // garis bidik
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    ctx.moveTo(x + dx * 14, y + dy * 14);
    ctx.lineTo(x + dx * 20, y + dy * 20);
  }
  ctx.stroke();
  ctx.restore();
}
