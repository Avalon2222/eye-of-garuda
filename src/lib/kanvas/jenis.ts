/** Tipe bersama antar penggambar kanvas. */

import type { Lang } from "../i18n";
import type { Proyektor } from "./proyeksi";
import type { PenataLabel } from "./label";

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

/** Keadaan satu frame yang dibagikan ke semua penggambar. */
export interface Frame {
  ctx: CanvasRenderingContext2D;
  p: Proyektor;
  zoom: number;
  now: number;
  lang: Lang;
  /** objek yang bisa diklik pada frame ini; penggambar menambahkan ke sini */
  hits: HitKanvas[];
  label: PenataLabel;
}
