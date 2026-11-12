/** Menggambar pesawat militer live: jejak, ikon sesuai kategori, label, dan cincin pilihan. */

import type { PelacakPesawat } from "../live/pesawat";
import { WARNA_KATEGORI_PESAWAT, type KategoriPesawat } from "../negara";
import type { Frame } from "./jenis";
import { proyeksi, titikKosong, garisPermukaan, RAD } from "./proyeksi";
import { FONT, teks } from "./gaya";
import { cincin, ikonPesawatKategori } from "./ikon";

export function gambarPesawat(fr: Frame, pelacak: PelacakPesawat, idPilih: string | null, alpha: number): void {
  const { ctx, p, zoom, now } = fr;
  const d = pelacak.daftar(now);
  const t = titikKosong();
  const bearing = p.map.getBearing();
  const ukuran = Math.min(16, Math.max(8, 5 + zoom * 1.4));
  // jejak memudar masuk antara zoom 2,6 dan 3,4 (bukan langsung nyala semua di zoom 3)
  const faktorJejak = Math.min(1, Math.max(0, (zoom - 2.6) / 0.8));
  ctx.font = FONT;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  for (const a of d) {
    const kategori = (a.props.kategori as KategoriPesawat) ?? "lain";
    const warna = WARNA_KATEGORI_PESAWAT[kategori];
    // jejak
    if (a.jejak.length > 1 && faktorJejak > 0) {
      ctx.beginPath();
      garisPermukaan(ctx, p, [...a.jejak, [a.lon, a.lat] as [number, number]]);
      ctx.strokeStyle = warna;
      ctx.globalAlpha = 0.4 * alpha * faktorJejak;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.globalAlpha = alpha;
    }
    if (!proyeksi(p, a.lon, a.lat, 0, t) || !t.terlihat) continue;
    if (t.x < -30 || t.y < -30 || t.x > p.w + 30 || t.y > p.h + 30) continue;
    const id = `pesawat-${a.hex}`;
    const sudut = (a.track - bearing) * RAD;
    ikonPesawatKategori(ctx, t.x, t.y, ukuran, sudut, warna, kategori, now);
    fr.hits.push({ jenis: "pesawat", id, props: a.props, lon: a.lon, lat: a.lat, x: t.x, y: t.y });
    const label = String(a.props.label ?? a.callsign);
    if (id === idPilih) {
      cincin(ctx, t.x, t.y, now);
      teks(ctx, label, t.x + 16, t.y - 2, "#ffffff");
    } else if (zoom >= 4) fr.label.usul(p, id, label, t.x + ukuran * 0.7 + 3, t.y, warna, FONT, alpha);
  }
}
