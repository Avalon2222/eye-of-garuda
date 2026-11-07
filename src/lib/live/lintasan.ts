/**
 * Klien untuk worker jadwal lintasan satelit (lintasan.worker.ts).
 * Kotak "Indonesia" sedikit dilebarkan dari batas wilayah supaya satelit yang lewat di tepi tetap terhitung.
 */

import type { MetaSatelit } from "./satelit";
import type { HasilLintasan, Lintasan, PermintaanLintasan } from "./lintasan.worker";

export type { Lintasan };

export const KOTAK_INDONESIA = { lonMin: 94, lonMax: 142, latMin: -12, latMax: 7 };

export class PenjadwalLintasan {
  private worker: Worker | null = null;
  private sibuk = false;
  hasil: HasilLintasan | null = null;

  private pastikan(): Worker | null {
    if (this.worker) return this.worker;
    try {
      this.worker = new Worker(new URL("./lintasan.worker.ts", import.meta.url));
    } catch {
      this.worker = null;
    }
    return this.worker;
  }

  hitung(satelit: MetaSatelit[], jamKeDepan = 12): Promise<HasilLintasan | null> {
    const w = this.pastikan();
    if (!w || this.sibuk) return Promise.resolve(this.hasil);
    this.sibuk = true;
    return new Promise((res) => {
      const h = (e: MessageEvent<HasilLintasan>) => {
        if (e.data?.jenis !== "hasil") return;
        w.removeEventListener("message", h);
        this.sibuk = false;
        this.hasil = e.data;
        res(e.data);
      };
      w.addEventListener("message", h);
      const q: PermintaanLintasan = {
        jenis: "hitung",
        satelit: satelit.map((s) => ({ norad: s.norad, nama: s.nama, negara: s.negara, kelompok: s.kelompok, l1: s.l1, l2: s.l2 })),
        mulai: Date.now(),
        jamKeDepan,
        langkahDetik: 60,
        kotak: KOTAK_INDONESIA,
      };
      w.postMessage(q);
    });
  }

  hancurkan(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
