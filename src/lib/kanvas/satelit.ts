/** Menggambar satelit (titik + cahaya), orbit satelit terpilih, dan label namanya. */

import { type PelacakSatelit, warnaSatelit, namaSatelit, type SatAktif, type PosisiSatelit } from "../live/satelit";
import type { Frame } from "./jenis";
import { proyeksi, titikKosong, type Proyektor } from "./proyeksi";
import { FONT, FONT_KECIL, WARNA_TEPI, teks } from "./gaya";
import { cincin } from "./ikon";

export interface OrbitCache {
  norad: number;
  titik: PosisiSatelit[];
  dibuat: number;
}

export interface HasilSatelit {
  /** jumlah satelit yang tergambar */
  terlihat: number;
  /** orbit yang dihitung untuk satelit terpilih (disimpan 60 s), null bila tak ada pilihan */
  orbit: OrbitCache | null;
}

export function gambarSatelit(fr: Frame, s: PelacakSatelit, idPilih: string | null, alpha: number, orbitLama: OrbitCache | null): HasilSatelit {
  const { ctx, p, zoom, now } = fr;
  s.perbaruiSebagian(now, 16);
  s.posisiSemua(now);
  const t = titikKosong();
  const r = Math.min(4, Math.max(1.8, 1.2 + zoom * 0.45));
  const labelSemua = zoom >= 4.3;
  const labelIndo = zoom >= 2.2;
  // zoom jauh (tampilan awal di HP): satelit asing diredupkan supaya cincin titiknya tidak menutupi Indonesia
  const redup = 0.35 + 0.65 * Math.min(1, Math.max(0, (zoom - 2) / 2));
  let terpilih: { a: SatAktif; x: number; y: number } | null = null;
  let terlihat = 0;

  // orbit satelit terpilih, digambar di bawah titik
  let orbit: OrbitCache | null = idPilih ? orbitLama : null;
  if (idPilih) {
    const norad = Number(idPilih.replace("satelit-", ""));
    const a = s.cari(norad);
    if (a) {
      orbit = orbitLama && orbitLama.norad === norad && now - orbitLama.dibuat <= 60_000 ? orbitLama : { norad, titik: s.lintasanPenuh(a, now), dibuat: now };
      gambarOrbit(ctx, p, orbit.titik, warnaSatelit(a.meta.kelompok), alpha);
    }
  }

  ctx.font = FONT_KECIL;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  for (const a of s.daftar) {
    const pos = a.pos;
    if (!pos) continue;
    if (!proyeksi(p, pos.lon, pos.lat, pos.alt, t) || !t.terlihat) continue;
    if (t.x < -20 || t.y < -20 || t.x > p.w + 20 || t.y > p.h + 20) continue;
    terlihat++;
    const warna = warnaSatelit(a.meta.kelompok);
    const id = `satelit-${a.meta.norad}`;
    const indo = a.meta.kelompok === "Indonesia";
    const rr = indo ? r + 0.8 : r;
    const a2 = indo || id === idPilih ? alpha : alpha * redup;
    // cahaya
    ctx.beginPath();
    ctx.arc(t.x, t.y, rr + 3, 0, Math.PI * 2);
    ctx.fillStyle = warna;
    ctx.globalAlpha = 0.16 * a2 * a2;
    ctx.fill();
    ctx.globalAlpha = a2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, rr, 0, Math.PI * 2);
    ctx.fillStyle = warna;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = WARNA_TEPI;
    ctx.stroke();
    fr.hits.push({ jenis: "satelit", id, props: a.meta as unknown as Record<string, unknown>, lon: pos.lon, lat: pos.lat, x: t.x, y: t.y });
    if (id === idPilih) terpilih = { a, x: t.x, y: t.y };
    else if (labelSemua || (indo && labelIndo)) fr.label.usul(p, id, namaSatelit(a.meta), t.x + rr + 4, t.y, warna, FONT_KECIL, a2);
  }
  if (terpilih) {
    const tp: { a: SatAktif; x: number; y: number } = terpilih;
    cincin(ctx, tp.x, tp.y, now);
    ctx.font = FONT;
    teks(ctx, namaSatelit(tp.a.meta), tp.x + 16, tp.y - 8, "#ffffff");
    const pos = tp.a.pos;
    if (pos) teks(ctx, `${Math.round(pos.alt).toLocaleString("en-US")} km · ${pos.kecepatan.toFixed(2)} km/s`, tp.x + 16, tp.y + 6, "#b8c2d6");
  }
  return { terlihat, orbit };
}

function gambarOrbit(ctx: CanvasRenderingContext2D, p: Proyektor, titik: PosisiSatelit[], warna: string, alpha: number): void {
  if (titik.length < 2) return;
  const t = titikKosong();
  ctx.save();
  ctx.strokeStyle = warna;
  ctx.globalAlpha = 0.75 * alpha;
  ctx.lineWidth = 1.3;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  let buka = false;
  let xLama = 0;
  for (const q of titik) {
    const ok = proyeksi(p, q.lon, q.lat, q.alt, t) && t.terlihat;
    if (!ok) {
      buka = false;
      continue;
    }
    // potong loncatan garis tanggal (mercator) / di balik bumi
    if (buka && Math.abs(t.x - xLama) > p.w * 0.45) buka = false;
    if (!buka) {
      ctx.moveTo(t.x, t.y);
      buka = true;
    } else ctx.lineTo(t.x, t.y);
    xLama = t.x;
  }
  ctx.stroke();
  ctx.restore();
}
