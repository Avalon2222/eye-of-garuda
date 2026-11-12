/** Komet kecil yang meluncur sepanjang busur SIPRI ke Indonesia: pengganti animasi dasharray MapLibre yang berat. */

import type { BusurKomet, Frame } from "./jenis";
import { proyeksi, titikKosong } from "./proyeksi";
import { lerp } from "./gaya";

export function gambarKomet(fr: Frame, busur: BusurKomet[]): void {
  const { ctx, p, zoom, now } = fr;
  const t = titikKosong();
  if (zoom > 8.5) return;
  ctx.lineCap = "round";
  for (let i = 0; i < busur.length; i++) {
    const b = busur[i];
    const n = b.koordinat.length;
    if (n < 2) continue;
    const periode = 5200 + ((i * 731) % 1800);
    const f = ((now + i * 977) % periode) / periode;
    const ekor = 0.12;
    const u0 = Math.max(0, f - ekor);
    const langkah = 6;
    ctx.beginPath();
    let buka = false;
    let xLama = 0;
    for (let k = 0; k <= langkah; k++) {
      const u = u0 + ((f - u0) * k) / langkah;
      const idx = u * (n - 1);
      const i0 = Math.floor(idx);
      const i1 = Math.min(n - 1, i0 + 1);
      const fr2 = idx - i0;
      const lon = lerp(b.koordinat[i0][0], b.koordinat[i1][0], fr2);
      const lat = lerp(b.koordinat[i0][1], b.koordinat[i1][1], fr2);
      const ok = proyeksi(p, lon, lat, 0, t) && t.terlihat;
      if (!ok) {
        buka = false;
        continue;
      }
      if (buka && Math.abs(t.x - xLama) > p.w * 0.45) buka = false;
      if (!buka) {
        ctx.moveTo(t.x, t.y);
        buka = true;
      } else ctx.lineTo(t.x, t.y);
      xLama = t.x;
    }
    if (!buka) continue;
    ctx.strokeStyle = "#f5d0fe";
    ctx.lineWidth = 0.8 + b.tebal * 0.22;
    ctx.stroke();
    // kepala menyala
    ctx.beginPath();
    ctx.arc(t.x, t.y, 1.6 + b.tebal * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
}
