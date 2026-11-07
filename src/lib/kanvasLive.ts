/**
 * Lapisan kanvas 2D di atas peta untuk objek yang bergerak tiap frame: satelit, pesawat, komet SIPRI,
 * dan aktor skenario (kapal, pesawat, kapal selam, rudal, ledakan, EMP, awan radioaktif).
 *
 * Kenapa bukan source GeoJSON MapLibre? Mengirim ratusan fitur ke worker tiap frame membuat
 * worker sibuk sehingga perubahan style lain (toggle lapisan) ikut tertunda. Kanvas ini
 * menggambar langsung dari posisi yang dihitung di thread utama, sehingga peta tetap responsif.
 *
 * Untuk proyeksi globe, satelit digambar di atas permukaan: vektor bola satuan dikalikan
 * (1 + tinggi visual) lalu diproyeksikan dengan matriks globe MapLibre. Tinggi visual dikompresi
 * supaya orbit tinggi tetap terlihat "lebih tinggi" tanpa keluar dari pandangan kamera.
 *
 * Catatan bug lama: saat zoom, frame lama satelit kadang tertinggal (membentuk "cincin" hantu).
 * Penyebabnya clearRect yang memakai ukuran CSS + transform DPR, yang bisa tidak sinkron sesaat
 * dengan ukuran buffer kanvas saat layout berubah. Sekarang kanvas selalu dibersihkan dalam piksel
 * perangkat dengan transform identitas, sebelum early-return mana pun.
 */

import type { Map as MapLibre } from "maplibre-gl";
import { PelacakSatelit, warnaSatelit, namaSatelit, type SatAktif, type PosisiSatelit } from "./live/satelit";
import { PelacakPesawat } from "./live/pesawat";
import { type FaseSkenario, type Aktor, posisiJalur, jejakJalur } from "./skenario";
import { lingkaran, jarakKm } from "./geo";
import { WARNA_KATEGORI_PESAWAT, type KategoriPesawat } from "./negara";

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

export interface BusurKomet {
  id: string;
  koordinat: [number, number][];
  /** 1..10, dari properti `tebal` busur SIPRI */
  tebal: number;
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
const FONT_BESAR = "11px 'JetBrains Mono', ui-monospace, monospace";
/** satelit memudar antara dua zoom ini (di atasnya proyeksi globe tidak lagi dipakai MapLibre) */
const ZOOM_SAT_PUDAR: [number, number] = [9.5, 11];
const LAMA_PUDAR_MS = 450;

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

function pudar(nilai: number, target: number, dtMs: number): number {
  const langkah = dtMs / LAMA_PUDAR_MS;
  if (target > nilai) return Math.min(target, nilai + langkah);
  return Math.max(target, nilai - langkah);
}

function lerp(a: number, b: number, f: number): number {
  return a + (b - a) * f;
}

export class KanvasLive {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map: MapLibre;
  private dpr = 1;
  private lebar = 0;
  private tinggi = 0;
  /** hasil hit-test frame terakhir (juga dipakai untuk uji otomatis) */
  hits: HitKanvas[] = [];
  /** lama gambar() frame terakhir, ms */
  lamaGambarMs = 0;
  private orbit: { norad: number; titik: PosisiSatelit[]; dibuat: number } | null = null;
  private ro: ResizeObserver | null = null;
  private frameSebelum = 0;
  /** alpha pudar per jenis (0..1), supaya muncul/hilang lapisan halus */
  private alpha = { satelit: 0, pesawat: 0, sipri: 0 };

  satelit: PelacakSatelit | null = null;
  pesawat: PelacakPesawat | null = null;
  tampilSatelit = false;
  tampilPesawat = false;
  tampilSipri = false;
  busurSipri: BusurKomet[] = [];
  lang: "id" | "en" = "id";
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
    this.lebar = w;
    this.tinggi = h;
    const bw = Math.max(1, Math.round(w * this.dpr));
    const bh = Math.max(1, Math.round(h * this.dpr));
    if (this.canvas.width !== bw) this.canvas.width = bw;
    if (this.canvas.height !== bh) this.canvas.height = bh;
  }

  // ---------- proyeksi ----------
  private proyektor(): Proyektor {
    const tr = transformDari(this.map);
    const w = this.lebar;
    const h = this.tinggi;
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

  /** Piksel per km di sekitar titik (untuk radius visual minimum). */
  private pikselPerKm(p: Proyektor, lon: number, lat: number): number {
    const a: TitikLayar = { x: 0, y: 0, terlihat: true };
    const b: TitikLayar = { x: 0, y: 0, terlihat: true };
    const dLat = lat > 80 ? -0.5 : 0.5;
    if (!this.proyeksi(p, lon, lat, 0, a) || !this.proyeksi(p, lon, lat + dLat, 0, b)) return 0;
    return Math.hypot(b.x - a.x, b.y - a.y) / jarakKm(lon, lat, lon, lat + dLat);
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
    // bersihkan SELALU dalam piksel perangkat dengan transform identitas (lihat catatan di atas)
    ctx.resetTransform();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.globalAlpha = 1;
    this.hits = [];
    this.terlihatSatelit = 0;
    const dt = this.frameSebelum ? Math.min(100, now - this.frameSebelum) : 16;
    this.frameSebelum = now;
    if (this.lebar < 2 || this.tinggi < 2) return;
    const zoom = this.map.getZoom();
    const satTarget = this.tampilSatelit && this.satelit ? 1 - Math.min(1, Math.max(0, (zoom - ZOOM_SAT_PUDAR[0]) / (ZOOM_SAT_PUDAR[1] - ZOOM_SAT_PUDAR[0]))) : 0;
    this.alpha.satelit = pudar(this.alpha.satelit, satTarget, dt);
    this.alpha.pesawat = pudar(this.alpha.pesawat, this.tampilPesawat && this.pesawat ? 1 : 0, dt);
    this.alpha.sipri = pudar(this.alpha.sipri, this.tampilSipri && this.busurSipri.length ? 1 : 0, dt);
    if (this.alpha.satelit <= 0 && this.alpha.pesawat <= 0 && this.alpha.sipri <= 0 && !this.skenario) return;
    const mulai = performance.now();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const p = this.proyektor();
    if (this.alpha.sipri > 0) {
      ctx.globalAlpha = this.alpha.sipri;
      this.gambarKomet(ctx, p, now);
    }
    if (this.alpha.satelit > 0 && this.satelit) {
      ctx.globalAlpha = this.alpha.satelit;
      this.gambarSatelit(ctx, p, zoom, now, this.alpha.satelit);
    }
    if (this.alpha.pesawat > 0 && this.pesawat) {
      ctx.globalAlpha = this.alpha.pesawat;
      this.gambarPesawat(ctx, p, zoom, now, this.alpha.pesawat);
    }
    ctx.globalAlpha = 1;
    if (this.skenario) this.gambarSkenario(ctx, p, zoom, now);
    ctx.globalAlpha = 1;
    this.lamaGambarMs = performance.now() - mulai;
  }

  private gambarSatelit(ctx: CanvasRenderingContext2D, p: Proyektor, zoom: number, now: number, alpha: number): void {
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
        this.gambarOrbit(ctx, p, this.orbit.titik, warnaSatelit(a.meta.kelompok), alpha);
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
      ctx.globalAlpha = 0.16 * alpha;
      ctx.fill();
      ctx.globalAlpha = alpha;
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

  private gambarOrbit(ctx: CanvasRenderingContext2D, p: Proyektor, titik: PosisiSatelit[], warna: string, alpha: number): void {
    if (titik.length < 2) return;
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    ctx.save();
    ctx.strokeStyle = warna;
    ctx.globalAlpha = 0.75 * alpha;
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

  private gambarPesawat(ctx: CanvasRenderingContext2D, p: Proyektor, zoom: number, now: number, alpha: number): void {
    const d = this.pesawat!.daftar(now);
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    const bearing = this.map.getBearing();
    const ukuran = Math.min(16, Math.max(8, 5 + zoom * 1.4));
    const idPilih = this.pilihan?.jenis === "pesawat" ? this.pilihan.id : null;
    ctx.font = FONT;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    for (const a of d) {
      const kategori = (a.props.kategori as KategoriPesawat) ?? "lain";
      const warna = WARNA_KATEGORI_PESAWAT[kategori];
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
        ctx.strokeStyle = warna;
        ctx.globalAlpha = 0.4 * alpha;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = alpha;
      }
      if (!this.proyeksi(p, a.lon, a.lat, 0, t) || !t.terlihat) continue;
      if (t.x < -30 || t.y < -30 || t.x > p.w + 30 || t.y > p.h + 30) continue;
      const id = `pesawat-${a.hex}`;
      const sudut = (a.track - bearing) * RAD;
      if (kategori === "helikopter") this.ikonHelikopter(ctx, t.x, t.y, ukuran, sudut, warna, now);
      else if (kategori === "tanker" || kategori === "angkut" || kategori === "pembom" || kategori === "intai") this.ikonPesawatBerat(ctx, t.x, t.y, ukuran * 1.15, sudut, warna, kategori);
      else this.ikonPesawat(ctx, t.x, t.y, ukuran, sudut, warna);
      this.hits.push({ jenis: "pesawat", id, props: a.props, lon: a.lon, lat: a.lat, x: t.x, y: t.y });
      const label = String(a.props.label ?? a.callsign);
      if (id === idPilih) {
        this.cincin(ctx, t.x, t.y, now);
        this.teks(ctx, label, t.x + 16, t.y - 2, "#ffffff");
      } else if (zoom >= 4) this.teks(ctx, label, t.x + ukuran * 0.7 + 3, t.y, warna);
    }
  }

  /** Komet kecil yang meluncur sepanjang busur SIPRI ke Indonesia: pengganti animasi dasharray MapLibre yang berat. */
  private gambarKomet(ctx: CanvasRenderingContext2D, p: Proyektor, now: number): void {
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    const zoom = this.map.getZoom();
    if (zoom > 8.5) return;
    ctx.lineCap = "round";
    for (let i = 0; i < this.busurSipri.length; i++) {
      const b = this.busurSipri[i];
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
        const fr = idx - i0;
        const lon = lerp(b.koordinat[i0][0], b.koordinat[i1][0], fr);
        const lat = lerp(b.koordinat[i0][1], b.koordinat[i1][1], fr);
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

  // ---------- skenario ----------
  private warnaPihak(pihak: Aktor["pihak"]): string {
    return pihak === "tni" ? "#4ade80" : pihak === "lawan" ? "#ef4444" : "#e2e8f0";
  }

  /** Polyline permukaan (dipotong di balik bumi / loncatan). */
  private garisPermukaan(ctx: CanvasRenderingContext2D, p: Proyektor, titik: [number, number][]): boolean {
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    let buka = false;
    let ada = false;
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
      ada = true;
      xLama = t.x;
    }
    return ada;
  }

  private gambarSkenario(ctx: CanvasRenderingContext2D, p: Proyektor, zoom: number, now: number): void {
    const { fase, mulai } = this.skenario!;
    const lewat = now - mulai;
    const bearing = this.map.getBearing();
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    const lang = this.lang;
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
        this.teks(ctx, l.label[lang], t.x, t.y - 8, l.warna);
        ctx.textAlign = "left";
      }
    }
    // garis bantu (rute alternatif / pasokan): ditarik progresif lalu dash berjalan
    for (const g of fase.garis ?? []) {
      const f = Math.min(1, Math.max(0, (lewat - (g.mulai ?? 0)) / 2500));
      if (f <= 0) continue;
      ctx.save();
      ctx.beginPath();
      const titik = jejakJalur(g.jalur, f, 48);
      this.garisPermukaan(ctx, p, titik);
      ctx.strokeStyle = g.warna;
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -((now / 40) % 12);
      ctx.stroke();
      ctx.restore();
      if (f >= 1) {
        const mid = posisiJalur(g.jalur, 0.55);
        if (this.proyeksi(p, mid.lon, mid.lat, 0, t) && t.terlihat) this.teks(ctx, g.label[lang], t.x + 6, t.y - 7, g.warna);
      }
    }
    const ukuran = Math.min(18, Math.max(10, 6 + zoom * 1.6));
    for (const a of fase.aktor) {
      let f = (lewat - a.mulai) / Math.max(1, a.durasi);
      if (f < 0) continue;
      const selesai = f >= 1;
      const sejakSelesai = selesai ? lewat - a.mulai - a.durasi : 0;
      if (a.jenis === "rudal" || a.jenis === "icbm") {
        if (!selesai || sejakSelesai < 1800) this.gambarRudal(ctx, p, a, Math.min(1, f), sejakSelesai, a.jenis === "icbm");
        continue;
      }
      if (a.jenis === "ledakan") {
        this.gambarLedakan(ctx, p, a, Math.min(1, f), sejakSelesai, now);
        continue;
      }
      if (a.jenis === "emp") {
        this.gambarEmp(ctx, p, a, Math.min(1, f), now);
        continue;
      }
      if (a.jenis === "awan") {
        this.gambarAwan(ctx, p, a, Math.min(1, f), now);
        continue;
      }
      if (a.jenis === "kabelputus") {
        this.gambarKabelPutus(ctx, p, a, Math.min(1, f), now);
        continue;
      }
      if (selesai && !a.tinggal) continue;
      f = Math.min(1, f);
      const pos = posisiJalur(a.jalur, f);
      const warna = this.warnaPihak(a.pihak);
      // jejak
      if (a.jalur.length > 1 && a.durasi > 1) {
        ctx.save();
        ctx.beginPath();
        this.garisPermukaan(ctx, p, jejakJalur(a.jalur, f, 48));
        ctx.strokeStyle = warna;
        ctx.globalAlpha = a.jenis === "kapalselam" ? 0.25 : 0.45;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.restore();
      }
      if (!this.proyeksi(p, pos.lon, pos.lat, 0, t) || !t.terlihat) continue;
      const sudut = (pos.haluan - bearing) * RAD;
      if (a.jenis === "pesawat") this.ikonPesawat(ctx, t.x, t.y, ukuran, sudut, warna);
      else if (a.jenis === "helikopter") this.ikonHelikopter(ctx, t.x, t.y, ukuran, sudut, warna, now);
      else if (a.jenis === "kapalselam") this.ikonKapalSelam(ctx, t.x, t.y, ukuran, sudut, warna, now);
      else this.ikonKapal(ctx, t.x, t.y, ukuran * 0.8, sudut, warna);
      // cahaya halus
      ctx.beginPath();
      ctx.arc(t.x, t.y, ukuran * 0.9, 0, Math.PI * 2);
      ctx.strokeStyle = warna;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
      this.teks(ctx, a.label[lang], t.x + ukuran * 0.8 + 4, t.y, warna);
    }
  }

  private gambarRudal(ctx: CanvasRenderingContext2D, p: Proyektor, a: Aktor, f: number, sejakTiba: number, balistik: boolean): void {
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
    if (f < 0.6) this.teks(ctx, a.label[this.lang], hx + 10, hy - 7, balistik ? "#fde68a" : warna);
    ctx.restore();
  }

  /** Ledakan nuklir dilihat dari atas: kilat putih, bola api, gelombang kejut melebar, lalu cincin efek dalam km. */
  private gambarLedakan(ctx: CanvasRenderingContext2D, p: Proyektor, a: Aktor, f: number, sejakSelesai: number, now: number): void {
    const pusat = a.jalur[0];
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    if (!this.proyeksi(p, pusat[0], pusat[1], 0, t) || !t.terlihat) return;
    const ppk = this.pikselPerKm(p, pusat[0], pusat[1]);
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
      const cincin: [number, string, string][] = [
        [radiusKm * 0.1, "#fff7ed", "fireball"],
        [radiusKm * 0.5, "#f97316", "5 psi"],
        [radiusKm, "#fbbf24", this.lang === "id" ? "luka bakar" : "burns"],
      ];
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      for (const [km, warna, label] of cincin) {
        const r = Math.max(rMaks * (km / radiusKm), 5);
        ctx.beginPath();
        if (ppk * km > 4) this.garisPermukaan(ctx, p, lingkaran(pusat[0], pusat[1], km, 72));
        else ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = warna;
        ctx.globalAlpha = 0.8 * k;
        ctx.stroke();
        if (ppk * km > 18) {
          ctx.font = FONT_KECIL;
          this.teks(ctx, `${label} ±${km < 10 ? km.toFixed(0) : Math.round(km)} km`, t.x + r + 3, t.y - r * 0.7, warna);
        }
      }
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
    ctx.font = FONT_BESAR;
    const judul = a.kiloton ? `${a.label[this.lang]}` : a.label[this.lang];
    this.teks(ctx, judul, t.x + rBola * 1.3 + 8, t.y + 2, "#fde68a");
    ctx.restore();
  }

  /** Denyut elektromagnetik ketinggian tinggi: cincin biru melebar sampai radiusKm, lalu "berkedip" tetap ada. */
  private gambarEmp(ctx: CanvasRenderingContext2D, p: Proyektor, a: Aktor, f: number, now: number): void {
    const pusat = a.jalur[0];
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    const radiusKm = a.radiusKm ?? 2000;
    const adaPusat = this.proyeksi(p, pusat[0], pusat[1], 0, t) && t.terlihat;
    ctx.save();
    const kedip = 0.75 + 0.25 * Math.sin(now / 160) * Math.sin(now / 53);
    // beberapa cincin yang bergerak keluar (gelombang)
    const n = 3;
    for (let i = 0; i < n; i++) {
      const fase = ((now / 2800 + i / n) % 1);
      const km = radiusKm * Math.min(f, fase);
      if (km < 10) continue;
      ctx.beginPath();
      this.garisPermukaan(ctx, p, lingkaran(pusat[0], pusat[1], km, 140));
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = (1 - fase) * 0.5 * (f >= 1 ? 1 : 0.6);
      ctx.stroke();
    }
    // cincin tepi jangkauan
    const kmTepi = radiusKm * f;
    ctx.beginPath();
    this.garisPermukaan(ctx, p, lingkaran(pusat[0], pusat[1], kmTepi, 160));
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
      this.teks(ctx, a.label[this.lang], t.x + 14, t.y - 12, "#7dd3fc");
    }
    // label di tepi utara
    const utara = lingkaran(pusat[0], pusat[1], kmTepi, 4)[0];
    if (f >= 1 && this.proyeksi(p, utara[0], utara[1], 0, t) && t.terlihat) {
      ctx.textAlign = "center";
      ctx.font = FONT;
      ctx.globalAlpha = 1;
      this.teks(ctx, `EMP ±${Math.round(radiusKm).toLocaleString("en-US")} km`, t.x, t.y - 8, "#7dd3fc");
      ctx.textAlign = "left";
    }
    ctx.restore();
  }

  /** Awan radioaktif: rangkaian cakram yang melebar sepanjang jalur angin, memudar ke ujung. */
  private gambarAwan(ctx: CanvasRenderingContext2D, p: Proyektor, a: Aktor, f: number, now: number): void {
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    const [l0, l1] = a.lebarKm ?? [40, 300];
    const n = 22;
    ctx.save();
    const pusatAwal = a.jalur[0];
    const ppk = this.pikselPerKm(p, pusatAwal[0], pusatAwal[1]);
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * f;
      if (u > f) break;
      const pos = posisiJalur(a.jalur, u);
      const lebar = lerp(l0, l1, u);
      const goyang = 1 + 0.06 * Math.sin(now / 400 + i * 0.9);
      const r = Math.max(4, (lebar / 2) * ppk * goyang);
      if (!this.proyeksi(p, pos.lon, pos.lat, 0, t) || !t.terlihat) continue;
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
    if (this.proyeksi(p, kepala.lon, kepala.lat, 0, t) && t.terlihat) {
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
      this.teks(ctx, a.label[this.lang], t.x + r + 4, t.y, "#bef264");
    }
    ctx.restore();
  }

  /** Titik kabel putus: silang merah berdenyut + percikan. */
  private gambarKabelPutus(ctx: CanvasRenderingContext2D, p: Proyektor, a: Aktor, f: number, now: number): void {
    const pusat = a.jalur[0];
    const t: TitikLayar = { x: 0, y: 0, terlihat: true };
    if (!this.proyeksi(p, pusat[0], pusat[1], 0, t) || !t.terlihat) return;
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
    ctx.strokeStyle = "#05080f";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.font = FONT;
    this.teks(ctx, a.label[this.lang], t.x + 12, t.y - 10, "#fca5a5");
    ctx.restore();
  }

  // ---------- ikon ----------
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

  /** Kapal selam dari atas: lambung lonjong setengah transparan (menyelam) + riak di belakang. */
  private ikonKapalSelam(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string, now: number): void {
    const u = s / 32;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sudut);
    // riak
    ctx.strokeStyle = warna;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const k = ((now / 900 + i / 3) % 1);
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
    ctx.strokeStyle = "#05080f";
    ctx.stroke();
    // menara
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(0, -2 * u, 2.2 * u, 4 * u, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#05080f";
    ctx.fill();
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

  /** Pesawat besar (tanker, angkut, intai, pembom): sayap lurus lebar, badan panjang; tanker diberi cincin, intai diberi radome. */
  private ikonPesawatBerat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string, kategori: KategoriPesawat): void {
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
    ctx.strokeStyle = "#05080f";
    ctx.stroke();
    if (kategori === "intai") {
      ctx.beginPath();
      ctx.arc(16 * u, 15 * u, 4 * u, 0, Math.PI * 2);
      ctx.fillStyle = "#05080f";
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
  private ikonHelikopter(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, sudut: number, warna: string, now: number): void {
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
    ctx.strokeStyle = "#05080f";
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
