/**
 * Pemasang lapisan MapLibre. Setiap lapisan punya satu source (id = LayerId) dan beberapa layer
 * dengan prefix `${id}-`. Toggle = ubah visibility semua layer berprefix itu.
 */

import type { Map as MapLibre, LayerSpecification, ExpressionSpecification, GeoJSONSource, FilterSpecification } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { WARNA_MATRA, WARNA_OPERATOR, LAPISAN, type LayerId } from "./layers";
import { FONT, FONT_TEBAL } from "./mapStyle";
import { daftarkanIkon } from "./ikon";

const KOSONG: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function matchWarna(prop: string, tabel: Record<string, string>, lainnya: string): ExpressionSpecification {
  const pasangan: (string | string[])[] = [];
  for (const [k, v] of Object.entries(tabel)) pasangan.push(k, v);
  return ["match", ["get", prop], ...pasangan, lainnya] as unknown as ExpressionSpecification;
}

const LABEL_DASAR = {
  "text-font": FONT,
  "text-size": 11,
  "text-offset": [0, 1.1] as [number, number],
  "text-anchor": "top" as const,
  "text-optional": true,
  "text-allow-overlap": false,
};

const LABEL_PAINT = {
  "text-color": "#e5e7eb",
  "text-halo-color": "#05080f",
  "text-halo-width": 1.4,
};

function tambahSourceKosong(map: MapLibre, id: string) {
  if (!map.getSource(id)) map.addSource(id, { type: "geojson", data: KOSONG });
}

/** Layer id yang bisa diklik, dipetakan ke LayerId. */
export const LAYER_INTERAKTIF: Record<string, LayerId> = {};

function daftar(map: MapLibre, layer: LayerSpecification, interaktif: LayerId | null, sebelum?: string) {
  if (map.getLayer(layer.id)) return;
  map.addLayer(layer, sebelum);
  if (interaktif) LAYER_INTERAKTIF[layer.id] = interaktif;
}

// ---------- lapisan statis fase 1 ----------

function pasangTni(map: MapLibre) {
  tambahSourceKosong(map, "tni");
  const warna = matchWarna("matra", WARNA_MATRA, "#ff5a3c");
  daftar(map, {
    id: "tni-halo",
    type: "circle",
    source: "tni",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 7, 7, 16],
      "circle-color": warna,
      "circle-opacity": 0.12,
      "circle-stroke-color": warna,
      "circle-stroke-width": 1,
      "circle-stroke-opacity": 0.35,
    },
  }, null);
  daftar(map, {
    id: "tni-titik",
    type: "circle",
    source: "tni",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 7, 6],
      "circle-color": warna,
      "circle-stroke-color": "#05080f",
      "circle-stroke-width": 1,
    },
  }, "tni");
  daftar(map, {
    id: "tni-label",
    type: "symbol",
    source: "tni",
    minzoom: 5,
    layout: { ...LABEL_DASAR, "text-field": ["get", "nama"] },
    paint: LABEL_PAINT,
  }, "tni");
}

function pasangAsing(map: MapLibre) {
  tambahSourceKosong(map, "asing");
  const warna = matchWarna("operator_utama", WARNA_OPERATOR, "#9ca3af");
  daftar(map, {
    id: "asing-halo",
    type: "circle",
    source: "asing",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 8, 7, 18],
      "circle-color": warna,
      "circle-opacity": 0.1,
      "circle-stroke-color": warna,
      "circle-stroke-width": 1,
      "circle-stroke-opacity": 0.4,
      "circle-stroke-dasharray": [2, 2],
    } as never,
  }, null);
  daftar(map, {
    id: "asing-titik",
    type: "circle",
    source: "asing",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3.5, 7, 6.5],
      "circle-color": "#05080f",
      "circle-stroke-color": warna,
      "circle-stroke-width": 2,
    },
  }, "asing");
  daftar(map, {
    id: "asing-label",
    type: "symbol",
    source: "asing",
    minzoom: 4.5,
    layout: { ...LABEL_DASAR, "text-field": ["get", "nama"] },
    paint: { ...LABEL_PAINT, "text-color": "#bfdbfe" },
  }, "asing");
}

function pasangBatas(map: MapLibre) {
  tambahSourceKosong(map, "batas");
  const warna: ExpressionSpecification = ["match", ["get", "jenis"], "wilayah_rawan", "#ef4444", "pos_perbatasan_darat", "#84cc16", "#22c55e"];
  daftar(map, {
    id: "batas-rawan",
    type: "circle",
    source: "batas",
    filter: ["==", ["get", "jenis"], "wilayah_rawan"],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 18, 7, 60],
      "circle-color": "#ef4444",
      "circle-opacity": 0.12,
      "circle-stroke-color": "#ef4444",
      "circle-stroke-width": 1,
      "circle-stroke-opacity": 0.5,
    },
  }, "batas");
  daftar(map, {
    id: "batas-titik",
    type: "circle",
    source: "batas",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 7, 5],
      "circle-color": warna,
      "circle-stroke-color": "#05080f",
      "circle-stroke-width": 1,
    },
  }, "batas");
  daftar(map, {
    id: "batas-label",
    type: "symbol",
    source: "batas",
    minzoom: 5,
    layout: { ...LABEL_DASAR, "text-field": ["get", "nama"], "text-size": 10 },
    paint: { ...LABEL_PAINT, "text-color": "#bbf7d0" },
  }, "batas");
}

function pasangAlki(map: MapLibre) {
  tambahSourceKosong(map, "alki");
  daftar(map, {
    id: "alki-garis",
    type: "line",
    source: "alki",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#38bdf8", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 7, 3], "line-dasharray": [3, 2], "line-opacity": 0.8 },
  }, "alki");
  daftar(map, {
    id: "alki-label",
    type: "symbol",
    source: "alki",
    layout: { "symbol-placement": "line", "text-field": ["get", "nama"], "text-font": FONT_TEBAL, "text-size": 11, "text-letter-spacing": 0.15 },
    paint: { "text-color": "#7dd3fc", "text-halo-color": "#05080f", "text-halo-width": 1.5 },
  }, "alki");
}

function pasangKabel(map: MapLibre) {
  tambahSourceKosong(map, "kabel");
  tambahSourceKosong(map, "kabel-landing");
  daftar(map, {
    id: "kabel-garis",
    type: "line",
    source: "kabel",
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": ["match", ["get", "kategori"], "domestik", "#2dd4bf", "transit", "#64748b", "#22d3ee"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.8, 7, 2],
      "line-opacity": ["match", ["get", "status"], "rencana", 0.35, 0.75],
    },
  }, "kabel");
  daftar(map, {
    id: "kabel-landing",
    type: "circle",
    source: "kabel-landing",
    minzoom: 3.5,
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 5],
      "circle-color": "#05080f",
      "circle-stroke-color": "#22d3ee",
      "circle-stroke-width": 1.2,
    },
  }, "kabel");
}

// ---------- lapisan live fase 2 ----------

export const WARNA_KAPAL: Record<string, string> = {
  militer: "#ef4444",
  patroli: "#3b82f6",
  sar: "#f97316",
  tanker: "#a855f7",
  kargo: "#a3e635",
  penumpang: "#22d3ee",
  nelayan: "#fbbf24",
  lainnya: "#9ca3af",
};

function pasangPesawat() {
  /* pesawat digambar di kanvas (src/lib/kanvasLive.ts), bukan sebagai layer MapLibre */
}

function pasangKapal(map: MapLibre) {
  tambahSourceKosong(map, "kapal");
  for (const [k, w] of Object.entries(WARNA_KAPAL)) daftarkanIkon(map, `ikon-kapal-${k}`, "kapal", w, 24);
  daftar(map, {
    id: "kapal-sanksi",
    type: "circle",
    source: "kapal",
    filter: ["==", ["get", "tersanksi"], true],
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 7, 9, 14],
      "circle-color": "#ef4444",
      "circle-opacity": 0.25,
      "circle-stroke-color": "#ef4444",
      "circle-stroke-width": 1.5,
    },
  }, "kapal");
  daftar(map, {
    id: "kapal-ikon",
    type: "symbol",
    source: "kapal",
    layout: {
      "icon-image": ["concat", "ikon-kapal-", ["get", "kelas"]],
      "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.35, 9, 0.8],
      "icon-rotate": ["get", "arah"],
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "text-field": ["step", ["zoom"], "", 8, ["get", "nama"]],
      "text-font": FONT,
      "text-size": 10,
      "text-offset": [0, 1.1],
      "text-anchor": "top",
      "text-optional": true,
    },
    paint: { "text-color": "#d9f99d", "text-halo-color": "#05080f", "text-halo-width": 1.2 },
  }, "kapal");
}

function pasangSatelit() {
  /* satelit digambar di kanvas (src/lib/kanvasLive.ts), bukan sebagai layer MapLibre */
}

function pasangBandara(map: MapLibre) {
  tambahSourceKosong(map, "bandara");
  const warna: ExpressionSpecification = ["case", ["get", "militer"], "#fb7185", ["==", ["get", "kelas"], "besar"], "#f0abfc", "#d8b4fe"];
  daftar(map, {
    id: "bandara-titik",
    type: "circle",
    source: "bandara",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["case", ["==", ["get", "kelas"], "besar"], 2.6, 1.8], 8, 6],
      "circle-color": "#05080f",
      "circle-stroke-color": warna,
      "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 2],
      "circle-opacity": 0.9,
    },
  }, "bandara");
  daftar(map, {
    id: "bandara-label",
    type: "symbol",
    source: "bandara",
    minzoom: 6.2,
    layout: { ...LABEL_DASAR, "text-field": ["coalesce", ["get", "iata"], ["get", "icao"], ["get", "nama"]], "text-size": 9.5 },
    paint: { ...LABEL_PAINT, "text-color": "#f5d0fe" },
  }, "bandara");
}

function pasangPelabuhan(map: MapLibre) {
  tambahSourceKosong(map, "pelabuhan");
  daftar(map, {
    id: "pelabuhan-titik",
    type: "circle",
    source: "pelabuhan",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 8, 5],
      "circle-color": "#5eead4",
      "circle-stroke-color": "#05080f",
      "circle-stroke-width": 0.8,
      "circle-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 6, 0.95],
    },
  }, "pelabuhan");
  daftar(map, {
    id: "pelabuhan-label",
    type: "symbol",
    source: "pelabuhan",
    minzoom: 7,
    layout: { ...LABEL_DASAR, "text-field": ["get", "nama"], "text-size": 9.5 },
    paint: { ...LABEL_PAINT, "text-color": "#99f6e4" },
  }, "pelabuhan");
}

// ---------- lapisan analisis fase 3 ----------

function pasangZee(map: MapLibre) {
  tambahSourceKosong(map, "zee");
  daftar(map, {
    id: "zee-isi",
    type: "fill",
    source: "zee",
    filter: ["==", ["get", "jenis"], "zee"],
    paint: { "fill-color": "#f472b6", "fill-opacity": 0.06 },
  }, "zee");
  daftar(map, {
    id: "zee-tumpang",
    type: "fill",
    source: "zee",
    filter: ["==", ["get", "jenis"], "tumpang_tindih"],
    paint: { "fill-color": "#ef4444", "fill-opacity": 0.35 },
  }, "zee");
  daftar(map, {
    id: "zee-garis",
    type: "line",
    source: "zee",
    filter: ["==", ["get", "jenis"], "batas"],
    paint: {
      "line-color": "#f472b6",
      "line-width": ["match", ["get", "tipe_garis"], "Treaty", 2, 1.4],
      "line-opacity": 0.9,
      "line-dasharray": ["match", ["get", "tipe_garis"], "Treaty", ["literal", [1, 0]], ["literal", [3, 2]]],
    },
  }, "zee");
  daftar(map, {
    id: "zee-sembilan",
    type: "line",
    source: "zee",
    filter: ["==", ["get", "jenis"], "sembilan_garis"],
    paint: { "line-color": "#ef4444", "line-width": 3, "line-dasharray": [1.5, 1.5], "line-opacity": 0.9 },
  }, "zee");
  daftar(map, {
    id: "zee-label",
    type: "symbol",
    source: "zee",
    filter: ["==", ["get", "jenis"], "tumpang_tindih"],
    layout: { "text-field": ["get", "nama"], "text-font": FONT_TEBAL, "text-size": 11 },
    paint: { "text-color": "#fecaca", "text-halo-color": "#05080f", "text-halo-width": 1.5 },
  }, "zee");
}

function pasangRadius(map: MapLibre) {
  tambahSourceKosong(map, "radius");
  tambahSourceKosong(map, "radius-buta");
  daftar(map, {
    id: "radius-buta",
    type: "fill",
    source: "radius-buta",
    paint: { "fill-color": "#e879f9", "fill-opacity": 0.07, "fill-outline-color": "#e879f9" },
  }, "radius");
  daftar(map, {
    id: "radius-isi",
    type: "fill",
    source: "radius",
    paint: { "fill-color": ["get", "warna"], "fill-opacity": 0.05 },
  }, "radius");
  daftar(map, {
    id: "radius-garis",
    type: "line",
    source: "radius",
    paint: { "line-color": ["get", "warna"], "line-width": 1.2, "line-opacity": 0.7 },
  }, "radius");
}

function pasangSipri(map: MapLibre) {
  tambahSourceKosong(map, "sipri");
  tambahSourceKosong(map, "sipri-titik");
  daftar(map, {
    id: "sipri-busur-latar",
    type: "line",
    source: "sipri",
    layout: { "line-cap": "round" },
    paint: { "line-color": "#c084fc", "line-width": ["interpolate", ["linear"], ["get", "tebal"], 1, 1, 10, 7], "line-opacity": 0.25 },
  }, "sipri");
  daftar(map, {
    id: "sipri-busur",
    type: "line",
    source: "sipri",
    layout: { "line-cap": "round" },
    paint: {
      "line-color": "#e9d5ff",
      "line-width": ["interpolate", ["linear"], ["get", "tebal"], 1, 1, 10, 4],
      "line-opacity": 0.9,
      "line-dasharray": [0, 2, 1],
    },
  }, "sipri");
  daftar(map, {
    id: "sipri-titik",
    type: "symbol",
    source: "sipri-titik",
    layout: { ...LABEL_DASAR, "text-field": ["get", "label"], "text-font": FONT_TEBAL, "text-size": 11, "text-offset": [0, 0.6], "text-allow-overlap": true },
    paint: { ...LABEL_PAINT, "text-color": "#e9d5ff" },
  }, "sipri");
}

function pasangInsiden(map: MapLibre) {
  tambahSourceKosong(map, "insiden");
  const warna: ExpressionSpecification = ["match", ["get", "kategori"], "insiden", "#f87171", "#60a5fa"];
  daftar(map, {
    id: "insiden-halo",
    type: "circle",
    source: "insiden",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 10, 7, 22],
      "circle-color": warna,
      "circle-opacity": 0.15,
      "circle-stroke-color": warna,
      "circle-stroke-width": 1,
      "circle-stroke-opacity": 0.6,
    },
  }, "insiden");
  daftar(map, {
    id: "insiden-titik",
    type: "circle",
    source: "insiden",
    paint: { "circle-radius": 4, "circle-color": warna, "circle-stroke-color": "#05080f", "circle-stroke-width": 1 },
  }, "insiden");
  daftar(map, {
    id: "insiden-label",
    type: "symbol",
    source: "insiden",
    minzoom: 4,
    layout: { ...LABEL_DASAR, "text-field": ["get", "label"], "text-size": 10 },
    paint: { ...LABEL_PAINT, "text-color": "#fecaca" },
  }, "insiden");
}

const PEMASANG: Record<LayerId, (map: MapLibre) => void> = {
  tni: pasangTni,
  asing: pasangAsing,
  batas: pasangBatas,
  alki: pasangAlki,
  kabel: pasangKabel,
  pesawat: pasangPesawat,
  kapal: pasangKapal,
  satelit: pasangSatelit,
  zee: pasangZee,
  radius: pasangRadius,
  sipri: pasangSipri,
  insiden: pasangInsiden,
  bandara: pasangBandara,
  pelabuhan: pasangPelabuhan,
};

/** Urutan pemasangan menentukan urutan gambar (yang terakhir di atas). */
const URUTAN: LayerId[] = ["zee", "radius", "kabel", "alki", "sipri", "pelabuhan", "bandara", "batas", "insiden", "asing", "tni", "kapal", "satelit", "pesawat"];

export function pasangSemuaLapisan(map: MapLibre) {
  for (const id of URUTAN) PEMASANG[id](map);
  pasangSorot(map);
  // cincin entitas titik terpilih, paling atas
  tambahSourceKosong(map, "pilihan");
  daftar(map, {
    id: "pilihan-cincin",
    type: "circle",
    source: "pilihan",
    paint: {
      "circle-radius": 14,
      "circle-color": "transparent",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
      "circle-stroke-opacity": 0.9,
    },
  }, null);
}

/** Source bertipe garis/poligon yang entitasnya disorot dengan garis tebal saat dipilih (bukan cincin). */
const SUMBER_SOROT: { source: string; lapisan: LayerId; warna: string }[] = [
  { source: "kabel", lapisan: "kabel", warna: "#ffffff" },
  { source: "alki", lapisan: "alki", warna: "#ffffff" },
  { source: "zee", lapisan: "zee", warna: "#ffffff" },
  { source: "radius", lapisan: "radius", warna: "#ffffff" },
  { source: "sipri", lapisan: "sipri", warna: "#ffffff" },
];
const FILTER_KOSONG: FilterSpecification = ["==", ["get", "id"], "__tidak_ada__"];

function pasangSorot(map: MapLibre) {
  for (const s of SUMBER_SOROT) {
    daftar(map, {
      id: `${s.lapisan}-sorot-cahaya`,
      type: "line",
      source: s.source,
      filter: FILTER_KOSONG,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": s.warna, "line-width": 12, "line-opacity": 0.18, "line-blur": 4 },
    }, null);
    daftar(map, {
      id: `${s.lapisan}-sorot`,
      type: "line",
      source: s.source,
      filter: FILTER_KOSONG,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": s.warna, "line-width": 3.5, "line-opacity": 0.95 },
    }, null);
  }
}

/** Lapisan yang entitasnya berupa titik: pilihan ditandai cincin. Selain itu garis/poligon disorot tebal. */
export function pakaiCincin(lapisan: LayerId, id: string): boolean {
  if (lapisan === "kabel") return id.startsWith("landing-");
  return !SUMBER_SOROT.some((s) => s.lapisan === lapisan);
}

/** Sorot entitas terpilih (garis/poligon) atau hapus sorotan bila lapisan/id null. */
export function sorotPilihan(map: MapLibre, lapisan: LayerId | null, id: string | null) {
  for (const s of SUMBER_SOROT) {
    const f: FilterSpecification = lapisan === s.lapisan && id ? ["==", ["get", "id"], id] : FILTER_KOSONG;
    for (const l of [`${s.lapisan}-sorot`, `${s.lapisan}-sorot-cahaya`]) if (map.getLayer(l)) map.setFilter(l, f);
  }
}

export function setVisibilitas(map: MapLibre, id: LayerId, aktif: boolean) {
  const style = map.getStyle();
  if (!style) return;
  for (const l of style.layers) {
    if (l.id.startsWith(`${id}-`)) map.setLayoutProperty(l.id, "visibility", aktif ? "visible" : "none");
  }
}

export function setDataSource(map: MapLibre, id: string, data: GeoJSON.FeatureCollection) {
  const src = map.getSource(id) as GeoJSONSource | undefined;
  if (src) src.setData(data);
}

export const SEMUA_ID = LAPISAN.map((l) => l.id);
