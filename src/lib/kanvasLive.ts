/**
 * Lapisan kanvas 2D di atas peta untuk objek yang bergerak tiap frame: satelit, pesawat, komet SIPRI,
 * dan aktor skenario (kapal, pesawat, kapal selam, rudal, ledakan, EMP, awan radioaktif).
 *
 * Kenapa bukan source GeoJSON MapLibre? Mengirim ratusan fitur ke worker tiap frame membuat
 * worker sibuk sehingga perubahan style lain (toggle lapisan) ikut tertunda. Kanvas ini
 * menggambar langsung dari posisi yang dihitung di thread utama, sehingga peta tetap responsif.
 *
 * Kelas ini hanya mengatur kanvas, urutan gambar, pemudaran lapisan, dan hit-test. Penggambar
 * sebenarnya ada di src/lib/kanvas/: proyeksi (globe/mercator), satelit, pesawat, komet, skenario,
 * ikon, dan label.
 *
 * Catatan bug lama: saat zoom, frame lama satelit kadang tertinggal (membentuk "cincin" hantu).
 * Penyebabnya clearRect yang memakai ukuran CSS + transform DPR, yang bisa tidak sinkron sesaat
 * dengan ukuran buffer kanvas saat layout berubah. Sekarang kanvas selalu dibersihkan dalam piksel
 * perangkat dengan transform identitas, sebelum early-return mana pun.
 */

import type { Map as MapLibre } from "maplibre-gl";
import type { PelacakSatelit } from "./live/satelit";
import type { PelacakPesawat } from "./live/pesawat";
import type { Lang } from "./i18n";
import type { BusurKomet, Frame, HitKanvas, JenisKanvas } from "./kanvas/jenis";
import { buatProyektor } from "./kanvas/proyeksi";
import { ZOOM_SAT_PUDAR, pudar } from "./kanvas/gaya";
import { PenataLabel } from "./kanvas/label";
import { gambarSatelit, type OrbitCache } from "./kanvas/satelit";
import { gambarPesawat } from "./kanvas/pesawat";
import { gambarKomet } from "./kanvas/komet";
import { gambarSkenario, type SkenarioAktif } from "./kanvas/skenario";

export type { BusurKomet, HitKanvas, JenisKanvas } from "./kanvas/jenis";
export { tinggiVisual } from "./kanvas/proyeksi";

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
  private orbit: OrbitCache | null = null;
  private ro: ResizeObserver | null = null;
  private frameSebelum = 0;
  /** alpha pudar per jenis (0..1), supaya muncul/hilang lapisan halus */
  private alpha = { satelit: 0, pesawat: 0, sipri: 0 };
  private label = new PenataLabel();

  satelit: PelacakSatelit | null = null;
  pesawat: PelacakPesawat | null = null;
  tampilSatelit = false;
  tampilPesawat = false;
  tampilSipri = false;
  busurSipri: BusurKomet[] = [];
  lang: Lang = "id";
  pilihan: { jenis: JenisKanvas; id: string } | null = null;
  /** fase skenario yang sedang dimainkan (lihat skenario.ts) */
  skenario: SkenarioAktif | null = null;
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

  // ---------- hit test ----------
  /** Semua objek kanvas dalam radius (piksel), terdekat dulu. Dipakai daftar pilihan saat objek numpuk. */
  cariSemua(x: number, y: number, radius = 14): (HitKanvas & { d2: number })[] {
    const r2 = radius * radius;
    const hasil: (HitKanvas & { d2: number })[] = [];
    for (const h of this.hits) {
      const d2 = (h.x - x) ** 2 + (h.y - y) ** 2;
      if (d2 < r2) hasil.push({ ...h, d2 });
    }
    return hasil.sort((a, b) => a.d2 - b.d2);
  }

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
    this.label.mulaiFrame();
    this.terlihatSatelit = 0;
    const dt = this.frameSebelum ? Math.min(100, now - this.frameSebelum) : 16;
    this.frameSebelum = now;
    if (this.lebar < 2 || this.tinggi < 2) return;
    const zoom = this.map.getZoom();
    const satTarget = this.tampilSatelit && this.satelit ? 1 - Math.min(1, Math.max(0, (zoom - ZOOM_SAT_PUDAR[0]) / (ZOOM_SAT_PUDAR[1] - ZOOM_SAT_PUDAR[0]))) : 0;
    this.alpha.satelit = pudar(this.alpha.satelit, satTarget, dt);
    this.alpha.pesawat = pudar(this.alpha.pesawat, this.tampilPesawat && this.pesawat ? 1 : 0, dt);
    this.alpha.sipri = pudar(this.alpha.sipri, this.tampilSipri && this.busurSipri.length ? 1 : 0, dt);
    if (this.alpha.satelit <= 0 && this.alpha.pesawat <= 0 && this.alpha.sipri <= 0 && !this.skenario) {
      this.label.bersihkan();
      return;
    }
    const mulai = performance.now();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const fr: Frame = { ctx, p: buatProyektor(this.map, this.lebar, this.tinggi), zoom, now, lang: this.lang, hits: this.hits, label: this.label };
    if (this.alpha.sipri > 0) {
      ctx.globalAlpha = this.alpha.sipri;
      gambarKomet(fr, this.busurSipri);
    }
    if (this.alpha.satelit > 0 && this.satelit) {
      ctx.globalAlpha = this.alpha.satelit;
      const idPilih = this.pilihan?.jenis === "satelit" ? this.pilihan.id : null;
      const hasil = gambarSatelit(fr, this.satelit, idPilih, this.alpha.satelit, this.orbit);
      this.terlihatSatelit = hasil.terlihat;
      this.orbit = hasil.orbit;
    }
    if (this.alpha.pesawat > 0 && this.pesawat) {
      ctx.globalAlpha = this.alpha.pesawat;
      gambarPesawat(fr, this.pesawat, this.pilihan?.jenis === "pesawat" ? this.pilihan.id : null, this.alpha.pesawat);
    }
    this.label.gambar(ctx, fr.p, dt);
    ctx.globalAlpha = 1;
    if (this.skenario) gambarSkenario(fr, this.skenario);
    ctx.globalAlpha = 1;
    this.lamaGambarMs = performance.now() - mulai;
  }
}
