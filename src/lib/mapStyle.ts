/**
 * Gaya peta: basemap vektor gelap dari OpenFreeMap (gratis, tanpa kunci) + citra satelit Esri sebagai mode SAT.
 * Proyeksi globe dan atmosfer diaktifkan langsung di style.
 */

import type { StyleSpecification, LayerSpecification } from "maplibre-gl";

export const URL_STYLE_GELAP = "https://tiles.openfreemap.org/styles/dark";
export const URL_CITRA_ESRI = "https://server.arcgisonline.com/ArcGis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const ID_LAYER_SAT = "basemap-sat";
export const FONT = ["Noto Sans Regular"];
export const FONT_TEBAL = ["Noto Sans Bold"];

const WARNA_LATAR = "#121a2c"; // daratan
const WARNA_AIR = "#04070e";

export async function bangunStyle(): Promise<StyleSpecification> {
  const res = await fetch(URL_STYLE_GELAP);
  const dasar = (await res.json()) as StyleSpecification;

  const layers: LayerSpecification[] = dasar.layers.map((l) => {
    if (l.id === "background" && l.type === "background") {
      return { ...l, paint: { ...l.paint, "background-color": WARNA_LATAR } };
    }
    if (l.id === "water" && l.type === "fill") {
      return { ...l, paint: { ...l.paint, "fill-color": WARNA_AIR } };
    }
    if (l.id === "waterway" && l.type === "line") {
      return { ...l, paint: { ...l.paint, "line-color": WARNA_AIR } };
    }
    if (/^boundary_country/.test(l.id) && l.type === "line") {
      return { ...l, paint: { ...l.paint, "line-color": "#3b4a66", "line-width": 1.2 } };
    }
    if (l.id === "boundary_state" && l.type === "line") {
      return { ...l, paint: { ...l.paint, "line-color": "#1f2a40" } };
    }
    if (l.id === "landcover_wood" && l.type === "fill") {
      return { ...l, paint: { ...l.paint, "fill-color": "#15213a", "fill-opacity": 0.5 } };
    }
    // sembunyikan jalan kecil / bangunan: console ini soal kawasan, bukan kota
    if (/^(highway_minor|highway_path|building|railway_minor|railway_minor_dashline|road_oneway|road_oneway_opposite|place_suburb|place_village|place_other|place_state)$/.test(l.id)) {
      return { ...l, layout: { ...(l.layout ?? {}), visibility: "none" } } as LayerSpecification;
    }
    return l;
  });

  // citra satelit di bawah semua lapisan basemap, mati secara default
  const idxBg = layers.findIndex((l) => l.id === "background");
  layers.splice(idxBg + 1, 0, {
    id: ID_LAYER_SAT,
    type: "raster",
    source: "esri-citra",
    layout: { visibility: "none" },
    paint: { "raster-saturation": -0.35, "raster-brightness-max": 0.85, "raster-fade-duration": 200 },
  });

  return {
    ...dasar,
    sources: {
      ...dasar.sources,
      "esri-citra": {
        type: "raster",
        tiles: [URL_CITRA_ESRI],
        tileSize: 256,
        maxzoom: 18,
        attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      },
    },
    layers,
    projection: { type: "globe" },
    sky: {
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 7, 0],
      "sky-color": "#0b1224",
      "horizon-color": "#1b2a4a",
      "fog-color": "#05080f",
      "fog-ground-blend": 0.6,
      "horizon-fog-blend": 0.8,
      "sky-horizon-blend": 0.8,
    },
  } as StyleSpecification;
}

/** Layer basemap vektor yang perlu disembunyikan saat mode SAT (kecuali label & batas negara). */
export function layerBasemapTersembunyiSaatSat(style: StyleSpecification): string[] {
  return style.layers
    .filter((l) => l.id !== ID_LAYER_SAT && l.id !== "background" && !/^(place_|boundary_|water_name)/.test(l.id))
    .map((l) => l.id);
}
