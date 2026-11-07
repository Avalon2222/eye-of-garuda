import type { LayerId } from "./layers";

export interface Pilihan {
  lapisan: LayerId;
  props: Record<string, unknown>;
  lon: number;
  lat: number;
}

export interface StatusLive {
  pesawat: { jumlah: number; totalDunia: number; galat: string | null; terakhir: number };
  satelit: { jumlah: number; epoch: string; galat: string | null };
  kapal: { jumlah: number; umurMenit: number | null; galat: string | null; live: number };
}

export type PanelId = "none" | "cari" | "bantuan" | "data" | "tentang";
