/**
 * Lapisan kanvas 2D di atas peta untuk objek yang bergerak tiap frame: satelit dan pesawat.
 *
 * Kenapa bukan source GeoJSON MapLibre? Mengirim ratusan fitur ke worker tiap frame membuat
 * worker sibuk sehingga perubahan style lain (toggle lapisan) ikut tertunda. Kanvas ini
 * menggambar langsung dari posisi yang dihitung di thread utama, sehingga peta tetap responsif.
 *
 * Untuk proyeksi globe, satelit digambar di atas permukaan: vektor bola satuan dikalikan
 * (1 + tinggi visual) lalu diproyeksikan dengan matriks globe MapLibre. Tinggi visual dikompresi
 * supaya orbit tinggi tetap terlihat "lebih tinggi" tanpa keluar dari pandangan kamera.
 */

import type { Map as MapLibre } from "maplibre-gl";
import { PelacakSatelit, warnaSatelit, namaSatelit, type SatAktif, type PosisiSatelit } from "./live/satelit";
import { PelacakPesawat } from "./live/pesawat";
import { type FaseSkenario, type Aktor, posisiJalur, jejakJalur } from "./skenario";
import { lingkaran } from "./geo";

export type JenisKanvas = "satelit" | "pesawat";

export interface HitKanvas {
  jenis: JenisKanvas;
  id: string;
  props: Record<string, unknown>;
  lon: number;
  lat: number;
  x: number;
  y: number;
}

interface Proyektor {
  globe: boolean;
  M: Float64Array | number[] | null;
  cam: [number, number, number];
  camAlt: number;
  w: number;
  h: number;
}

interface TitikLayar {
  x: number;
  y: number;
  /** false bila tersembunyi di balik bumi atau di belakang kamera */
  terlihat: boolean;
}

const R_BUMI = 6371.0088;
const RAD = Math.PI / 180;
const FONT = "10px 'JetBrains Mono', ui-monospace, monospace";
const FONT_KECIL = "9px 'JetBrains Mono', ui-monospace, monospace";

interface TransformInternal {
  getProjectionDataForCustomLayer(applyGlobeMatrix: boolean): { mainMatrix: Float64Array | number[]; projectionTransition: number };
  cameraPosition: [number, number, number] | Float64Array;
  width: number;
  height: number;
}

function transformDari(map: MapLibre): TransformInternal | null {
  const m = map as unknown as { _camera?: { transform?: TransformInternal }; transform?: TransformInternal };
  return m.transform ?? m._camera?.transform ?? null;
}

/** Tinggi visual (satuan jari-jari bumi) dari tinggi nyata (km), dikompresi relatif terhadap tinggi kamera. */
export function tinggiVisual(altKm: number, camAlt: number): number {
  if (altKm <= 0) return 0;
  const nyata = altKm / R_BUMI;
  const g = 0.14 + 0.5 * Math.min(1, Math.max(0, Math.log(altKm / 300) / Math.log(120)));
  return Math.min(nyata, Math.max(camAlt, 0.002) * g);
}

export class KanvasLive {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: MapLibre;
  private dpr = 1;
  /** hasil hit-test frame terakhir (juga dipakai untuk uji otomatis) */
  hits: HitKanvas[] = [];
  /** lama gambar() frame terakhir, ms */
  lamaGambarMs = 0;
  private orbit: { norad: number; titik: PosisiSatelit[]; dibuat: number } | null = null;
  private ro: ResizeObserver | null = null;

  satelit: PelacakSatelit | null = null;
  pesawat: PelacakPesawat | null = null;
  tampilSatelit = false;
  tampilPesawat = false;
  pilihan: { jenis: JenisKanvas; id: string } | null = null;
  /** fase skenario yang sedang dimainkan (lihat skenario.ts) */
  skenario: { fase: FaseSkenario; mulai: number } | null = null;
  /** jumlah satelit yang tergambar pada frame terakhir */
  terlihatSatelit = 0;

  constructor(map: MapLibre, wadah: HTMLElement) {
    this.map = map;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "kanvas-live";
    Object.assign(this.canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" });
    wadah.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.ukur();
    this.ro = new ResizeObserver(() => this.ukur());
    this.ro.observe(wadah);
  }

  hancurkan(): void {
    this.ro?.disconnect();
    this.canvas.remove();
  }

  ukur(): void {
    const w = this.canvas.clientWidth || this.map.getContainer().clientWidth;
    const h = this.canvas.clientHeight || this.map.getContainer().clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(w * this.dpr));
    this.canvas.height = Math.max(1, Math.round(h * this.dpr));
  }

  // ---------- proyeksi ----------
  private proyektor(): Proyektor {
    const tr = transformDari(this.map);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const proj = this.map.getProjection?.()?.type;
    if (tr && proj === "globe" && typeof tr.getProjectionDataForCustomLayer === "function") {
      try {
        const pd = tr.getProjectionDataForCustomLayer(true);
        if (pd.projectionTransition > 0.999) {
          const cam = tr.cameraPosition;
          const c: [number, number, number] = [cam[0], cam[1], cam[2]];
          return { globe: true, M: pd.mainMatrix, cam: c, camAlt: Math.hypot(c[0], c[1], c[2]) - 1, w, h };
        }
      } catch {
        /* jatuh ke mercator */
      }
    }
    return { globe: false, M: null, cam: [0, 0, 0], camAlt: 1, w, h };
  }

  private proyeksi(p: Proyektor, lon: number, lat: number, altKm: number, keluar: TitikLayar): boolean {
    if (!p.globe || !p.M) {
      const q = this.map.project([lon, lat]);
      keluar.x = q.x;
      keluar.y = q.y;
      keluar.terlihat = true;
      return Number.isFinite(q.x) && Number.isFinite(q.y);
    }
    const la = lat * RAD;
    const lo = lon * RAD;
    const r = 1 + tinggiVisual(altKm, p.camAlt);
    const cl = Math.cos(la);
    const vx = Math.sin(lo) * cl * r;
    const vy = Math.sin(la) * r;
    const vz = Math.cos(lo) * cl * r;
    const M = p.M;
    const cw = M[3] * vx + M[7] * vy + M[11] * vz + M[15];
    if (cw <= 0) {
      keluar.terlihat = false;
      return false;
    }
    const cx = M[0] * vx + M[4] * vy + M[8] * vz + M[12];
    const cy = M[1] * vx + M[5] * vy + M[9] * vz + M[13];
    keluar.x = ((cx / cw + 1) / 2) * p.w;
    keluar.y = ((1 - cy / cw) / 2) * p.h;
    // tersembunyi di balik bumi? segmen kamera -> titik memotong bola satuan?
    const dx = vx - p.cam[0];
    const dy = vy - p.cam[1];
    const dz = vz - p.cam[2];
    const a = dx * dx + dy * dy + dz * dz;
    const b = 2 * (p.cam[0] * dx + p.cam[1] * dy + p.cam[2] * dz);
    const c = p.cam[0] * p.cam[0] + p.cam[1] * p.cam[1] + p.cam[2] * p.cam[2] - 1;
    const disc = b * b - 4 * a * c;
    let tersembunyi = false;
    if (disc > 0) {
      const t1 = (-b - Math.sqrt(disc)) / (2 * a);
      tersembunyi = t1 > 0 && t1 < 1 - 1e-4;
    }
    keluar.terlihat = !tersembunyi;
    return true;
  }

  // ---------- hit test ----------
  cari(x: number, y: number, radius = 14): HitKanvas | null {
    let terbaik: HitKanvas | null = null;
    let jarak = radius * radius;
    for (const h of this.hits) {
      const d = (h.x - x) ** 2 + (h.y - y) ** 2;
      if (d < jarak) {
        jarak = d;
        terbaik = h;
      }
    }
    return terbaik;
  }

  /** Posisi layar entitas terpilih (untuk mengikuti kamera), atau null. */
  posisiPilihan(): { lon: number; lat: number } | null {
    if (!this.pilihan) return null;
    if (this.pilihan.jenis === "satelit" && this.satelit) {
      const a = this.satelit.cari(Number(this.pilihan.id.replace("satelit-", "")));
      return a?.pos ? { lon: a.pos.lon, lat: a.pos.lat } : null;
    }
    if (this.pilihan.jenis === "pesawat" && this.pesawat) {
      const d = this.pesawat.daftar(Date.now()).find((p) => `pesawat-${p.hex}` === this.pilihan!.id);
      return d ? { lon: d.lon, lat: d.lat } : null;
    }
    return null;
  }

  // ---------- gambar ----------
  gambar(now: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.hits = [];
    this.terlihatSatelit = 0;
    if (!this.tampilSatelit && !this.tampilPesawat && !this.skenario) return;
    const mulai = performance.now();
    const p = this.proyektor();
    const zoom = this.map.getZoom();
    if (this.tampilSatelit && this.satelit) this.gambarSatelit(ctx, p, zoom, now);
    if (this.tampilPesawat && this.pesawat) this.gambarPesawat(ctx, p, zoom, now);
    if (this.skenario) this.gambarSkenario(ctx, p, zoom, now);
    this.lamaGambarMs = performance.now() - mulai;
  }

  private gambarSatelit(ctx: CanvasRenderingContext2D, p: Proyektor, zoom: number, now: number): void {
    const s = this.satelit!;
    s.perbaruiSebagian(now, 16);
    s.posisiSemua(now);
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    const r = Math.min(4, Math.max(1.8, 1.2 + zoom * 0.45));
    const labelSemua = zoom >= 4.3;
    const labelIndo = zoom >= 2.2;
    const idPilih = this.pilihan?.jenis === "satelit" ? this.pilihan.id : null;
    let terpilih: { a: SatAktif; x: number; y: number } | null = null;

    // orbit satelit terpilih, digambar di bawah titik
    if (idPilih) {
      const norad = Number(idPilih.replace("satelit-", ""));
      const a = s.cari(norad);
      if (a) {
        if (!this.orbit || this.orbit.norad !== norad || now - this.orbit.dibuat > 60_000) {
          this.orbit = { norad, titik: s.lintasanPenuh(a, now), dibuat: now };
        }
        this.gambarOrbit(ctx, p, this.orbit.titik, warnaSatelit(a.meta.kelompok));
      }
    } else this.orbit = null;

    ctx.font = FONT_KECIL;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.lineJoin = "round";
    for (const a of s.daftar) {
      const pos = a.pos;
      if (!pos) continue;
      if (!this.proyeksi(p, pos.lon, pos.lat, pos.alt, t) || !t.terlihat) continue;
      if (t.x < -20 || t.y < -20 || t.x > p.w + 20 || t.y > p.h + 20) continue;
      this.terlihatSatelit++;
      const warna = warnaSatelit(a.meta.kelompok);
      const id = `satelit-${a.meta.norad}`;
      const indo = a.meta.kelompok === "Indonesia";
      const rr = indo ? r + 0.8 : r;
      // cahaya
      ctx.beginPath();
      ctx.arc(t.x, t.y, rr + 3, 0, Math.PI * 2);
      ctx.fillStyle = warna;
      ctx.globalAlpha = 0.16;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(t.x, t.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = warna;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = "#05080f";
      ctx.stroke();
      this.hits.push({ jenis: "satelit", id, props: a.meta as unknown as Record<string, unknown>, lon: pos.lon, lat: pos.lat, x: t.x, y: t.y });
      if (id === idPilih) terpilih = { a, x: t.x, y: t.y };
      else if (labelSemua || (indo && labelIndo)) this.teks(ctx, namaSatelit(a.meta), t.x + rr + 4, t.y, warna);
    }
    if (terpilih) {
      const tp: { a: SatAktif; x: number; y: number } = terpilih;
      this.cincin(ctx, tp.x, tp.y, now);
      ctx.font = FONT;
      this.teks(ctx, namaSatelit(tp.a.meta), tp.x + 16, tp.y - 8, "#ffffff");
      const pos = tp.a.pos;
      if (pos) this.teks(ctx, `${Math.round(pos.alt).toLocaleString("en-US")} km · ${pos.kecepatan.toFixed(2)} km/s`, tp.x + 16, tp.y + 6, "#b8c2d6");
    }
  }

  private gambarOrbit(ctx: CanvasRenderingContext2D, p: Proyektor, titik: PosisiSatelit[], warna: string): void {
    if (titik.length < 2) return;
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    ctx.save();
    ctx.strokeStyle = warna;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    let buka = false;
    let xLama = 0;
    for (const q of titik) {
      const ok = this.proyeksi(p, q.lon, q.lat, q.alt, t) && t.terlihat;
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

  private gambarPesawat(ctx: CanvasRenderingContext2D, p: Proyektor, zoom: number, now: number): void {
    const d = this.pesawat!.daftar(now);
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    const bearing = this.map.getBearing();
    const ukuran = Math.min(16, Math.max(8, 5 + zoom * 1.4));
    const idPilih = this.pilihan?.jenis === "pesawat" ? this.pilihan.id : null;
    ctx.font = FONT;
    ctx.textBaseline = "middle";
    for (const a of d) {
      // jejak
      if (a.jejak.length > 1 && zoom >= 3) {
        ctx.beginPath();
        let buka = false;
        let xLama = 0;
        for (const [lon, lat] of [...a.jejak, [a.lon, a.lat] as [number, number]]) {
          const ok = this.proyeksi(p, lon, lat, 0, t) && t.terlihat;
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
        ctx.strokeStyle = "#facc15";
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (!this.proyeksi(p, a.lon, a.lat, 0, t) || !t.terlihat) continue;
      if (t.x < -30 || t.y < -30 || t.x > p.w + 30 || t.y > p.h + 30) continue;
      const id = `pesawat-${a.hex}`;
      this.ikonPesawat(ctx, t.x, t.y, ukuran, (a.track - bearing) * RAD, "#facc15");
      this.hits.push({ jenis: "pesawat", id, props: a.props, lon: a.lon, lat: a.lat, x: t.x, y: t.y });
      if (id === idPilih) {
        this.cincin(ctx, t.x, t.y, now);
        this.teks(ctx, a.callsign, t.x + 16, t.y - 2, "#ffffff");
      } else if (zoom >= 4) this.teks(ctx, a.callsign, t.x + ukuran * 0.7 + 3, t.y, "#fde68a");
    }
  }

  // ---------- skenario ----------
  private warnaPihak(pihak: Aktor["pihak"]): string {
    return pihak === "tni" ? "#4ade80" : pihak === "lawan" ? "#ef4444" : "#e2e8f0";
  }

  /** Polyline permukaan (dipotong di balik bumi / loncatan). */
  private garisPermukaan(ctx: CanvasRenderingContext2D, p: Proyektor, titik: [number, number][]): void {
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    let buka = false;
    let xLama = 0;
    for (const [lon, lat] of titik) {
      const ok = this.proyeksi(p, lon, lat, 0, t) && t.terlihat;
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
  }

  private gambarSkenario(ctx: CanvasRenderingContext2D, p: Proyektor, zoom: number, now: number): void {
    const { fase, mulai } = this.skenario!;
    const lewat = now - mulai;
    const bearing = this.map.getBearing();
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    ctx.font = FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    // lingkaran jangkauan
    for (const l of fase.lingkaran ?? []) {
      ctx.save();
      ctx.beginPath();
      this.garisPermukaan(ctx, p, lingkaran(l.pusat[0], l.pusat[1], l.radiusKm, 120));
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
      if (this.proyeksi(p, utara[0], utara[1], 0, t) && t.terlihat) {
        ctx.textAlign = "center";
        this.teks(ctx, l.label.id, t.x, t.y - 8, l.warna);
        ctx.textAlign = "left";
      }
    }
    const ukuran = Math.min(18, Math.max(10, 6 + zoom * 1.6));
    for (const a of fase.aktor) {
      let f = (lewat - a.mulai) / Math.max(1, a.durasi);
      if (f < 0) continue;
      const selesai = f >= 1;
      if (selesai && !a.tinggal && a.jenis !== "rudal") continue;
      if (a.jenis === "rudal") {
        this.gambarRudal(ctx, p, a, Math.min(1, f), selesai ? (lewat - a.mulai - a.durasi) : 0);
        continue;
      }
      f = Math.min(1, f);
      const pos = posisiJalur(a.jalur, f);
      const warna = this.warnaPihak(a.pihak);
      // jejak
      if (a.jalur.length > 1 && a.durasi > 1) {
        ctx.save();
        ctx.beginPath();
        this.garisPermukaan(ctx, p, jejakJalur(a.jalur, f, 48));
        ctx.strokeStyle = warna;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.restore();
      }
      if (!this.proyeksi(p, pos.lon, pos.lat, 0, t) || !t.terlihat) continue;
      const sudut = (pos.haluan - bearing) * RAD;
      if (a.jenis === "pesawat") this.ikonPesawat(ctx, t.x, t.y, ukuran, sudut, warna);
      else this.ikonKapal(ctx, t.x, t.y, ukuran * 0.8, sudut, warna);
      // cahaya halus
      ctx.beginPath();
      ctx.arc(t.x, t.y, ukuran * 0.9, 0, Math.PI * 2);
      ctx.strokeStyle = warna;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      this.teks(ctx, a.label.id, t.x + ukuran * 0.8 + 4, t.y, warna);
    }
  }

  private gambarRudal(ctx: CanvasRenderingContext2D, p: Proyektor, a: Aktor, f: number, sejakTiba: number): void {
    const awal: TitikLayar = { x: 0, y: 0, terlihat: true };
    const akhir: TitikLayar = { x: 0, y: 0, terlihat: true };
    const asal = a.jalur[0];
    const sasaran = a.jalur[a.jalur.length - 1];
    if (!this.proyeksi(p, asal[0], asal[1], 0, awal) || !this.proyeksi(p, sasaran[0], sasaran[1], 0, akhir)) return;
    if (!awal.terlihat && !akhir.terlihat) return;
    const warna = this.warnaPihak(a.pihak);
    const dx = akhir.x - awal.x;
    const dy = akhir.y - awal.y;
    const jarak = Math.hypot(dx, dy);
    if (jarak > p.w) return;
    // kendali bezier: titik tengah diangkat ke "atas layar" (lintasan balistik ilustratif)
    const cx = (awal.x + akhir.x) / 2;
    const cy = (awal.y + akhir.y) / 2 - Math.max(30, jarak * 0.38);
    const bez = (u: number): [number, number] => [
      (1 - u) * (1 - u) * awal.x + 2 * (1 - u) * u * cx + u * u * akhir.x,
      (1 - u) * (1 - u) * awal.y + 2 * (1 - u) * u * cy + u * u * akhir.y,
    ];
    ctx.save();
    if (sejakTiba > 0) {
      // ledakan / dampak: cincin melebar lalu pudar
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
    ctx.strokeStyle = warna;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    // ekor menyala
    ctx.beginPath();
    const u0 = Math.max(0, f - 0.18);
    for (let i = 0; i <= 12; i++) {
      const [x, y] = bez(u0 + ((f - u0) * i) / 12);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#fdba74";
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    ctx.stroke();
    // kepala
    const [hx, hy] = bez(f);
    ctx.beginPath();
    ctx.arc(hx, hy, 6, 0, Math.PI * 2);
    ctx.fillStyle = warna;
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = "#fff7ed";
    ctx.globalAlpha = 1;
    ctx.fill();
    if (f < 0.5) this.teks(ctx, a.label.id, hx + 9, hy - 6, warna);
    ctx.restore();
  }

  private ikonKapal(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string): void {
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
    ctx.strokeStyle = "#05080f";
    ctx.stroke();
    ctx.restore();
  }

  private ikonPesawat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string): void {
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
    ctx.strokeStyle = "#05080f";
    ctx.stroke();
    ctx.restore();
  }

  private cincin(ctx: CanvasRenderingContext2D, x: number, y: number, now: number): void {
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

  private teks(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, warna: string): void {
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(5,8,15,0.9)";
    ctx.strokeText(s, x, y);
    ctx.fillStyle = warna;
    ctx.fillText(s, x, y);
  }
}
