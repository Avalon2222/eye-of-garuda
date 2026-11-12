/**
 * Aktor skenario War Room di kanvas: kapal, pesawat, kapal selam, rudal, ledakan nuklir, EMP,
 * awan radioaktif, kabel putus, plus lingkaran jangkauan dan garis bantu tiap fase.
 */

import { type FaseSkenario, type Aktor, posisiJalur, jejakJalur } from "../skenario";
import { lingkaran } from "../geo";
import { terjemah } from "../i18n";
import type { Frame } from "./jenis";
import { proyeksi, titikKosong, garisPermukaan, pikselPerKm, RAD, type Proyektor } from "./proyeksi";
import { FONT, FONT_KECIL, FONT_BESAR, WARNA_TEPI, warnaPihak, lerp, teks } from "./gaya";
import { ikonKapal, ikonKapalSelam, ikonPesawat, ikonHelikopter } from "./ikon";

export interface SkenarioAktif {
  fase: FaseSkenario;
  /** ms epoch saat animasi fase mulai */
  mulai: number;
}

/** Geser label tepi lingkaran supaya tidak nabrak header/jam di atas layar (terutama di HP). */
function posisiAman(p: Proyektor, x: number, y: number): [number, number] {
  const atas = p.w <= 640 ? 116 : 72;
  return [Math.min(p.w - 70, Math.max(70, x)), Math.max(atas, y)];
}

export function gambarSkenario(fr: Frame, sk: SkenarioAktif): void {
  const { ctx, p, zoom, now, lang } = fr;
  const { fase, mulai } = sk;
  const lewat = now - mulai;
  const bearing = p.map.getBearing();
  const t = titikKosong();
  ctx.font = FONT;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  // lingkaran jangkauan
  for (const l of fase.lingkaran ?? []) {
    ctx.save();
    ctx.beginPath();
    garisPermukaan(ctx, p, lingkaran(l.pusat[0], l.pusat[1], l.radiusKm, 120));
    ctx.strokeStyle = l.warna;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = l.warna;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    // label di titik utara lingkaran
    const utara = lingkaran(l.pusat[0], l.pusat[1], l.radiusKm, 4)[0];
    if (proyeksi(p, utara[0], utara[1], 0, t) && t.terlihat) {
      ctx.textAlign = "center";
      const [lx, ly] = posisiAman(p, t.x, t.y - 8);
      teks(ctx, l.label[lang], lx, ly, l.warna);
      ctx.textAlign = "left";
    }
  }
  // garis bantu (rute alternatif / pasokan): ditarik progresif lalu dash berjalan
  for (const g of fase.garis ?? []) {
    const f = Math.min(1, Math.max(0, (lewat - (g.mulai ?? 0)) / 2500));
    if (f <= 0) continue;
    ctx.save();
    ctx.beginPath();
    garisPermukaan(ctx, p, jejakJalur(g.jalur, f, 48));
    ctx.strokeStyle = g.warna;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -((now / 40) % 12);
    ctx.stroke();
    ctx.restore();
    if (f >= 1) {
      const mid = posisiJalur(g.jalur, 0.55);
      if (proyeksi(p, mid.lon, mid.lat, 0, t) && t.terlihat) teks(ctx, g.label[lang], t.x + 6, t.y - 7, g.warna);
    }
  }
  const ukuran = Math.min(18, Math.max(10, 6 + zoom * 1.6));
  for (const a of fase.aktor) {
    let f = (lewat - a.mulai) / Math.max(1, a.durasi);
    if (f < 0) continue;
    const selesai = f >= 1;
    const sejakSelesai = selesai ? lewat - a.mulai - a.durasi : 0;
    if (a.jenis === "rudal" || a.jenis === "icbm") {
      if (!selesai || sejakSelesai < 1800) gambarRudal(fr, a, Math.min(1, f), sejakSelesai, a.jenis === "icbm");
      continue;
    }
    if (a.jenis === "ledakan") {
      gambarLedakan(fr, a, Math.min(1, f), sejakSelesai);
      continue;
    }
    if (a.jenis === "emp") {
      gambarEmp(fr, a, Math.min(1, f));
      continue;
    }
    if (a.jenis === "awan") {
      gambarAwan(fr, a, Math.min(1, f));
      continue;
    }
    if (a.jenis === "kabelputus") {
      gambarKabelPutus(fr, a, Math.min(1, f));
      continue;
    }
    if (selesai && !a.tinggal) continue;
    f = Math.min(1, f);
    const pos = posisiJalur(a.jalur, f);
    const warna = warnaPihak(a.pihak);
    // jejak
    if (a.jalur.length > 1 && a.durasi > 1) {
      ctx.save();
      ctx.beginPath();
      garisPermukaan(ctx, p, jejakJalur(a.jalur, f, 48));
      ctx.strokeStyle = warna;
      ctx.globalAlpha = a.jenis === "kapalselam" ? 0.25 : 0.45;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.restore();
    }
    if (!proyeksi(p, pos.lon, pos.lat, 0, t) || !t.terlihat) continue;
    const sudut = (pos.haluan - bearing) * RAD;
    if (a.jenis === "pesawat") ikonPesawat(ctx, t.x, t.y, ukuran, sudut, warna);
    else if (a.jenis === "helikopter") ikonHelikopter(ctx, t.x, t.y, ukuran, sudut, warna, now);
    else if (a.jenis === "kapalselam") ikonKapalSelam(ctx, t.x, t.y, ukuran, sudut, warna, now);
    else ikonKapal(ctx, t.x, t.y, ukuran * 0.8, sudut, warna);
    // cahaya halus
    ctx.beginPath();
    ctx.arc(t.x, t.y, ukuran * 0.9, 0, Math.PI * 2);
    ctx.strokeStyle = warna;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    teks(ctx, a.label[lang], t.x + ukuran * 0.8 + 4, t.y, warna);
  }
}

function gambarRudal(fr: Frame, a: Aktor, f: number, sejakTiba: number, balistik: boolean): void {
  const { ctx, p, lang } = fr;
  const awal = titikKosong();
  const akhir = titikKosong();
  const asal = a.jalur[0];
  const sasaran = a.jalur[a.jalur.length - 1];
  if (!proyeksi(p, asal[0], asal[1], 0, awal) || !proyeksi(p, sasaran[0], sasaran[1], 0, akhir)) return;
  if (!awal.terlihat && !akhir.terlihat) return;
  const warna = warnaPihak(a.pihak);
  const dx = akhir.x - awal.x;
  const dy = akhir.y - awal.y;
  const jarak = Math.hypot(dx, dy);
  if (jarak > p.w * 1.5) return;
  // kendali bezier: titik tengah diangkat ke "atas layar" (lintasan balistik ilustratif)
  const cx = (awal.x + akhir.x) / 2;
  const cy = (awal.y + akhir.y) / 2 - Math.max(30, jarak * (balistik ? 0.7 : 0.38));
  const bez = (u: number): [number, number] => [
    (1 - u) * (1 - u) * awal.x + 2 * (1 - u) * u * cx + u * u * akhir.x,
    (1 - u) * (1 - u) * awal.y + 2 * (1 - u) * u * cy + u * u * akhir.y,
  ];
  ctx.save();
  if (sejakTiba > 0) {
    // ledakan / dampak kecil (rudal konvensional): cincin melebar lalu pudar
    if (!balistik) {
      const d = Math.min(1, sejakTiba / 1600);
      if (d < 1) {
        ctx.beginPath();
        ctx.arc(akhir.x, akhir.y, 4 + d * 34, 0, Math.PI * 2);
        ctx.strokeStyle = warna;
        ctx.lineWidth = 2.5 * (1 - d);
        ctx.globalAlpha = 1 - d;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(akhir.x, akhir.y, 10 * (1 - d) + 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff7ed";
        ctx.globalAlpha = 0.9 * (1 - d);
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  // lintasan yang sudah ditempuh
  ctx.beginPath();
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const [x, y] = bez((f * i) / n);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = balistik ? "#fde68a" : warna;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  // ekor menyala
  ctx.beginPath();
  const u0 = Math.max(0, f - (balistik ? 0.26 : 0.18));
  for (let i = 0; i <= 12; i++) {
    const [x, y] = bez(u0 + ((f - u0) * i) / 12);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = balistik ? "#ffffff" : "#fdba74";
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = balistik ? 2.6 : 2;
  ctx.stroke();
  // kepala
  const [hx, hy] = bez(f);
  ctx.beginPath();
  ctx.arc(hx, hy, balistik ? 9 : 6, 0, Math.PI * 2);
  ctx.fillStyle = balistik ? "#fde68a" : warna;
  ctx.globalAlpha = 0.25;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hx, hy, balistik ? 3.2 : 2.6, 0, Math.PI * 2);
  ctx.fillStyle = "#fff7ed";
  ctx.globalAlpha = 1;
  ctx.fill();
  if (f < 0.6) teks(ctx, a.label[lang], hx + 10, hy - 7, balistik ? "#fde68a" : warna);
  ctx.restore();
}

/** Ledakan nuklir dilihat dari atas: kilat putih, bola api, gelombang kejut melebar, lalu cincin efek dalam km. */
function gambarLedakan(fr: Frame, a: Aktor, f: number, sejakSelesai: number): void {
  const { ctx, p, now, lang } = fr;
  const pusat = a.jalur[0];
  const t = titikKosong();
  if (!proyeksi(p, pusat[0], pusat[1], 0, t) || !t.terlihat) return;
  const ppk = pikselPerKm(p, pusat[0], pusat[1]);
  const radiusKm = a.radiusKm ?? 10;
  const rMaks = Math.max(26, radiusKm * ppk);
  ctx.save();
  // kilat awal
  if (f < 0.12) {
    const k = 1 - f / 0.12;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 90 * k + 10, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.85 * k;
    ctx.fill();
  }
  // bola api yang mekar
  const bola = Math.min(1, f / 0.5);
  const rBola = Math.max(6, 0.18 * rMaks) * (0.4 + 0.6 * bola);
  const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, rBola * 2.2);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.25, "rgba(253,224,71,0.9)");
  grad.addColorStop(0.55, "rgba(249,115,22,0.55)");
  grad.addColorStop(1, "rgba(127,29,29,0)");
  ctx.beginPath();
  ctx.arc(t.x, t.y, rBola * 2.2, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.globalAlpha = f < 1 ? 1 : Math.max(0.45, 1 - sejakSelesai / 30000);
  ctx.fill();
  // asap/jamur dari atas: cakram bergolak yang perlahan melebar
  const gol = 1 + 0.08 * Math.sin(now / 230) + 0.05 * Math.sin(now / 97);
  ctx.beginPath();
  ctx.arc(t.x, t.y, rBola * 1.1 * gol, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(60,30,20,0.55)";
  ctx.globalAlpha = 0.5 * bola;
  ctx.fill();
  // gelombang kejut melebar
  if (f > 0.1) {
    const k = Math.min(1, (f - 0.1) / 0.9);
    ctx.beginPath();
    ctx.arc(t.x, t.y, 4 + k * rMaks * 1.3, 0, Math.PI * 2);
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 3 * (1 - k) + 0.5;
    ctx.globalAlpha = 1 - k;
    ctx.stroke();
  }
  // cincin efek permanen (dalam km): bola api, 5 psi, luka bakar
  if (f >= 0.6) {
    const k = Math.min(1, (f - 0.6) / 0.4);
    const cincinEfek: [number, string, string][] = [
      [radiusKm * 0.1, "#fff7ed", "fireball"],
      [radiusKm * 0.5, "#f97316", "5 psi"],
      [radiusKm, "#fbbf24", terjemah(lang, "nuke_burns")],
    ];
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    for (const [km, warna, label] of cincinEfek) {
      const r = Math.max(rMaks * (km / radiusKm), 5);
      ctx.beginPath();
      if (ppk * km > 4) garisPermukaan(ctx, p, lingkaran(pusat[0], pusat[1], km, 72));
      else ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = warna;
      ctx.globalAlpha = 0.8 * k;
      ctx.stroke();
      if (ppk * km > 18) {
        ctx.font = FONT_KECIL;
        teks(ctx, `${label} ±${km < 10 ? km.toFixed(0) : Math.round(km)} km`, t.x + r + 3, t.y - r * 0.7, warna);
      }
    }
    ctx.setLineDash([]);
  }
  ctx.globalAlpha = 1;
  ctx.font = FONT_BESAR;
  teks(ctx, a.label[lang], t.x + rBola * 1.3 + 8, t.y + 2, "#fde68a");
  ctx.restore();
}

/** Denyut elektromagnetik ketinggian tinggi: cincin biru melebar sampai radiusKm, lalu "berkedip" tetap ada. */
function gambarEmp(fr: Frame, a: Aktor, f: number): void {
  const { ctx, p, now, lang } = fr;
  const pusat = a.jalur[0];
  const t = titikKosong();
  const radiusKm = a.radiusKm ?? 2000;
  const adaPusat = proyeksi(p, pusat[0], pusat[1], 0, t) && t.terlihat;
  ctx.save();
  const kedip = 0.75 + 0.25 * Math.sin(now / 160) * Math.sin(now / 53);
  // beberapa cincin yang bergerak keluar (gelombang)
  const n = 3;
  for (let i = 0; i < n; i++) {
    const fase = (now / 2800 + i / n) % 1;
    const km = radiusKm * Math.min(f, fase);
    if (km < 10) continue;
    ctx.beginPath();
    garisPermukaan(ctx, p, lingkaran(pusat[0], pusat[1], km, 140));
    ctx.strokeStyle = "#7dd3fc";
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = (1 - fase) * 0.5 * (f >= 1 ? 1 : 0.6);
    ctx.stroke();
  }
  // cincin tepi jangkauan
  const kmTepi = radiusKm * f;
  ctx.beginPath();
  garisPermukaan(ctx, p, lingkaran(pusat[0], pusat[1], kmTepi, 160));
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9 * kedip;
  ctx.setLineDash([10, 6]);
  ctx.lineDashOffset = -((now / 30) % 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#38bdf8";
  ctx.globalAlpha = 0.07 * kedip;
  ctx.fill();
  // kilatan di pusat (ledakan tanpa bola api di darat)
  if (adaPusat) {
    ctx.beginPath();
    ctx.arc(t.x, t.y, 6 + 3 * kedip, 0, Math.PI * 2);
    ctx.fillStyle = "#e0f2fe";
    ctx.globalAlpha = 0.9;
    ctx.fill();
    // petir pendek acak
    ctx.strokeStyle = "#bae6fd";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 5; i++) {
      const sudut = (now / 900 + i * 1.257) % (Math.PI * 2);
      const panjang = 14 + 10 * Math.abs(Math.sin(now / 150 + i));
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(sudut) * panjang * 0.5 + 3 * Math.sin(now / 70 + i), t.y + Math.sin(sudut) * panjang * 0.5);
      ctx.lineTo(t.x + Math.cos(sudut) * panjang, t.y + Math.sin(sudut) * panjang);
      ctx.stroke();
    }
    ctx.font = FONT_BESAR;
    ctx.globalAlpha = 1;
    teks(ctx, a.label[lang], t.x + 14, t.y - 12, "#7dd3fc");
  }
  // label di tepi utara
  const utara = lingkaran(pusat[0], pusat[1], kmTepi, 4)[0];
  if (f >= 1 && proyeksi(p, utara[0], utara[1], 0, t) && t.terlihat) {
    ctx.textAlign = "center";
    ctx.font = FONT;
    ctx.globalAlpha = 1;
    const [lx, ly] = posisiAman(p, t.x, t.y - 8);
    teks(ctx, `EMP ±${Math.round(radiusKm).toLocaleString("en-US")} km`, lx, ly, "#7dd3fc");
    ctx.textAlign = "left";
  }
  ctx.restore();
}

/** Awan radioaktif: rangkaian cakram yang melebar sepanjang jalur angin, memudar ke ujung. */
function gambarAwan(fr: Frame, a: Aktor, f: number): void {
  const { ctx, p, now, lang } = fr;
  const t = titikKosong();
  const [l0, l1] = a.lebarKm ?? [40, 300];
  const n = 22;
  ctx.save();
  const pusatAwal = a.jalur[0];
  const ppk = pikselPerKm(p, pusatAwal[0], pusatAwal[1]);
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * f;
    if (u > f) break;
    const pos = posisiJalur(a.jalur, u);
    const lebar = lerp(l0, l1, u);
    const goyang = 1 + 0.06 * Math.sin(now / 400 + i * 0.9);
    const r = Math.max(4, (lebar / 2) * ppk * goyang);
    if (!proyeksi(p, pos.lon, pos.lat, 0, t) || !t.terlihat) continue;
    const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, r);
    const kuat = (1 - u * 0.75) * 0.22;
    grad.addColorStop(0, `rgba(190,242,100,${kuat})`);
    grad.addColorStop(0.6, `rgba(163,230,53,${kuat * 0.5})`);
    grad.addColorStop(1, "rgba(163,230,53,0)");
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.globalAlpha = 1;
    ctx.fill();
  }
  // kepala awan + label
  const kepala = posisiJalur(a.jalur, f);
  if (proyeksi(p, kepala.lon, kepala.lat, 0, t) && t.terlihat) {
    const r = Math.max(5, (lerp(l0, l1, f) / 2) * ppk);
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#bef264";
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -((now / 60) % 8);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.font = FONT;
    teks(ctx, a.label[lang], t.x + r + 4, t.y, "#bef264");
  }
  ctx.restore();
}

/** Titik kabel putus: silang merah berdenyut + percikan. */
function gambarKabelPutus(fr: Frame, a: Aktor, f: number): void {
  const { ctx, p, now, lang } = fr;
  const pusat = a.jalur[0];
  const t = titikKosong();
  if (!proyeksi(p, pusat[0], pusat[1], 0, t) || !t.terlihat) return;
  ctx.save();
  const denyut = (now % 1400) / 1400;
  if (f < 1) {
    // percikan saat putus
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 1 - f;
    for (let i = 0; i < 8; i++) {
      const s = (i / 8) * Math.PI * 2 + f * 2;
      ctx.beginPath();
      ctx.moveTo(t.x + Math.cos(s) * 4, t.y + Math.sin(s) * 4);
      ctx.lineTo(t.x + Math.cos(s) * (8 + 22 * f), t.y + Math.sin(s) * (8 + 22 * f));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1 - denyut;
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(t.x, t.y, 8 + denyut * 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(t.x - 6, t.y - 6);
  ctx.lineTo(t.x + 6, t.y + 6);
  ctx.moveTo(t.x + 6, t.y - 6);
  ctx.lineTo(t.x - 6, t.y + 6);
  ctx.strokeStyle = WARNA_TEPI;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.font = FONT;
  teks(ctx, a.label[lang], t.x + 12, t.y - 10, "#fca5a5");
  ctx.restore();
}
