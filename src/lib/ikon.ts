/** Ikon kecil digambar dengan canvas lalu didaftarkan ke MapLibre (tanpa berkas sprite). */

import type { Map as MapLibre } from "maplibre-gl";

type Penggambar = (ctx: CanvasRenderingContext2D, s: number) => void;

const PESAWAT: Penggambar = (ctx, s) => {
  // siluet pesawat menghadap ke atas (utara); dirotasi dengan icon-rotate
  const u = s / 32;
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
  ctx.fill();
};

const KAPAL: Penggambar = (ctx, s) => {
  const u = s / 32;
  ctx.beginPath();
  ctx.moveTo(16 * u, 2 * u);
  ctx.lineTo(24 * u, 14 * u);
  ctx.lineTo(24 * u, 30 * u);
  ctx.lineTo(8 * u, 30 * u);
  ctx.lineTo(8 * u, 14 * u);
  ctx.closePath();
  ctx.fill();
};

const SATELIT: Penggambar = (ctx, s) => {
  const u = s / 32;
  ctx.lineWidth = 3 * u;
  ctx.strokeStyle = ctx.fillStyle;
  // badan
  ctx.fillRect(12 * u, 12 * u, 8 * u, 8 * u);
  // panel surya
  ctx.fillRect(2 * u, 13.5 * u, 8 * u, 5 * u);
  ctx.fillRect(22 * u, 13.5 * u, 8 * u, 5 * u);
};

const PENGGAMBAR: Record<string, Penggambar> = { pesawat: PESAWAT, kapal: KAPAL, satelit: SATELIT };

export function daftarkanIkon(map: MapLibre, nama: string, bentuk: keyof typeof PENGGAMBAR, warna: string, ukuran = 32): void {
  if (map.hasImage(nama)) return;
  const skala = 2;
  const c = document.createElement("canvas");
  c.width = ukuran * skala;
  c.height = ukuran * skala;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = warna;
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 3 * skala;
  PENGGAMBAR[bentuk](ctx, ukuran * skala);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  map.addImage(nama, { width: c.width, height: c.height, data: data.data }, { pixelRatio: skala });
}
