/**
 * Ekspor tampilan: snapshot PNG (kanvas peta + kanvas overlay digabung) dan rekaman video WebM/MP4
 * lewat MediaRecorder. Kanvas MapLibre harus dibuat dengan preserveDrawingBuffer: true supaya
 * pikselnya bisa dibaca.
 */

import type { Map as MapLibre } from "maplibre-gl";
import { FONT_MONO } from "./font";

export function unduhBlob(blob: Blob, nama: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function unduhTeks(teks: string, nama: string, tipe = "text/markdown"): void {
  unduhBlob(new Blob([teks], { type: `${tipe};charset=utf-8` }), nama);
}

function gabung(map: MapLibre, overlay: HTMLCanvasElement | null, tujuan?: HTMLCanvasElement): HTMLCanvasElement {
  const peta = map.getCanvas();
  const c = tujuan ?? document.createElement("canvas");
  if (c.width !== peta.width || c.height !== peta.height) {
    c.width = peta.width;
    c.height = peta.height;
  }
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#05080f";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(peta, 0, 0, c.width, c.height);
  if (overlay) ctx.drawImage(overlay, 0, 0, c.width, c.height);
  return c;
}

function stempel(c: HTMLCanvasElement, teks: string): void {
  const ctx = c.getContext("2d")!;
  const skala = Math.max(1, c.width / 1200);
  ctx.font = `${11 * skala}px ${FONT_MONO}`;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "right";
  ctx.lineWidth = 3 * skala;
  ctx.strokeStyle = "rgba(5,8,15,0.9)";
  ctx.strokeText(teks, c.width - 12 * skala, c.height - 10 * skala);
  ctx.fillStyle = "#f2c66d";
  ctx.fillText(teks, c.width - 12 * skala, c.height - 10 * skala);
}

export async function fotoPng(map: MapLibre, overlay: HTMLCanvasElement | null, nama: string, keterangan: string): Promise<boolean> {
  try {
    map.triggerRepaint();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const c = gabung(map, overlay);
    stempel(c, keterangan);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
    if (!blob) return false;
    unduhBlob(blob, nama);
    return true;
  } catch {
    return false;
  }
}

export function bisaMerekam(): boolean {
  return typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

function mimeTerbaik(): string {
  const kandidat = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  for (const k of kandidat) if (MediaRecorder.isTypeSupported(k)) return k;
  return "";
}

/** Perekam video: menggambar komposit peta + overlay ke kanvas tersembunyi ~24 fps dan merekamnya. */
export class Perekam {
  private map: MapLibre;
  private overlay: HTMLCanvasElement | null;
  private kanvas = document.createElement("canvas");
  private rekorder: MediaRecorder | null = null;
  private potongan: Blob[] = [];
  private raf = 0;
  private keterangan: string;
  readonly mime: string;
  mulaiPada = 0;

  constructor(map: MapLibre, overlay: HTMLCanvasElement | null, keterangan: string) {
    this.map = map;
    this.overlay = overlay;
    this.keterangan = keterangan;
    this.mime = mimeTerbaik();
  }

  get aktif(): boolean {
    return this.rekorder?.state === "recording";
  }

  mulai(): boolean {
    if (!bisaMerekam() || !this.mime) return false;
    gabung(this.map, this.overlay, this.kanvas);
    const stream = this.kanvas.captureStream(24);
    try {
      this.rekorder = new MediaRecorder(stream, { mimeType: this.mime, videoBitsPerSecond: 6_000_000 });
    } catch {
      return false;
    }
    this.potongan = [];
    this.rekorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.potongan.push(e.data);
    };
    this.rekorder.start(1000);
    this.mulaiPada = Date.now();
    const tik = () => {
      gabung(this.map, this.overlay, this.kanvas);
      stempel(this.kanvas, this.keterangan);
      this.raf = requestAnimationFrame(tik);
    };
    this.raf = requestAnimationFrame(tik);
    return true;
  }

  async berhenti(): Promise<Blob | null> {
    cancelAnimationFrame(this.raf);
    const r = this.rekorder;
    if (!r || r.state === "inactive") return null;
    const selesai = new Promise<void>((res) => {
      r.onstop = () => res();
    });
    r.stop();
    await selesai;
    this.rekorder = null;
    if (!this.potongan.length) return null;
    return new Blob(this.potongan, { type: this.mime.split(";")[0] });
  }

  get ekstensi(): string {
    return this.mime.startsWith("video/mp4") ? "mp4" : "webm";
  }
}
