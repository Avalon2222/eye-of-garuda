import { useCallback, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Map as MapLibre, MapMouseEvent } from "maplibre-gl";
import { LAYER_INTERAKTIF } from "@/lib/mapLayers";
import { urutkanCalon, type CalonKlik } from "@/lib/klik";
import type { KanvasLive } from "@/lib/kanvasLive";
import type { PelacakSatelit } from "@/lib/live/satelit";
import type { Pilihan } from "@/lib/types";
import type { PilihanKlik } from "./jenis";
import { TOLERANSI_KLIK } from "./usePeta";

/** maksimal baris di daftar pilihan objek yang numpuk */
const MAKS_PILIHAN_KLIK = 6;

interface Opsi {
  kanvasRef: RefObject<KanvasLive | null>;
  satelitRef: RefObject<PelacakSatelit | null>;
  pilih: (p: Pilihan | null, terbang?: boolean) => void;
  setPilihanKlik: Dispatch<SetStateAction<PilihanKlik | null>>;
}

function dariSentuhan(e: MapMouseEvent): boolean {
  const asli = e.originalEvent as (PointerEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }) | undefined;
  return asli?.pointerType === "touch" || asli?.sourceCapabilities?.firesTouchEvents === true;
}

/**
 * Klik di peta: kumpulkan semua objek titik di sekitar kursor (kanvas: satelit/pesawat; MapLibre:
 * markas, bandara, ...). Satu objek langsung dipilih; lebih dari satu memunculkan daftar pilihan;
 * tidak ada titik berarti garis/poligon (kabel, ALKI, ZEE) yang kena, atau kosong.
 */
export function useKlikPeta({ kanvasRef, satelitRef, pilih, setPilihanKlik }: Opsi) {
  return useCallback(
    (m: MapLibre, e: MapMouseEvent) => {
      setPilihanKlik(null);
      const r = dariSentuhan(e) ? TOLERANSI_KLIK.sentuh : TOLERANSI_KLIK.mouse;
      const calon: CalonKlik[] = [];
      for (const h of kanvasRef.current?.cariSemua(e.point.x, e.point.y, r + 6) ?? []) {
        if (h.jenis === "satelit") {
          const sat = satelitRef.current?.cari(Number((h.props as { norad: number }).norad));
          if (sat && satelitRef.current) calon.push({ pilihan: { lapisan: "satelit", props: satelitRef.current.info(sat), lon: h.lon, lat: h.lat }, d2: h.d2 });
        } else calon.push({ pilihan: { lapisan: h.jenis, props: h.props, lon: h.lon, lat: h.lat }, d2: h.d2 });
      }
      const ids = Object.keys(LAYER_INTERAKTIF).filter((id) => m.getLayer(id));
      // kotak toleransi: titik kecil (3–6 px) tetap bisa diklik tanpa harus tepat
      const kandidat = m.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers: ids });
      for (const c of kandidat) {
        const g = c.geometry;
        if (g.type !== "Point") continue;
        const [lon, lat] = g.coordinates as [number, number];
        const q = m.project([lon, lat]);
        const d2 = (q.x - e.point.x) ** 2 + (q.y - e.point.y) ** 2;
        // label teks punya kotak lebar; yang dihitung tetap jarak ke titiknya
        if (d2 > (r + 4) ** 2) continue;
        calon.push({ pilihan: { lapisan: LAYER_INTERAKTIF[c.layer.id], props: c.properties as Record<string, unknown>, lon, lat }, d2 });
      }
      const urut = urutkanCalon(calon);
      if (urut.length === 1) {
        pilih(urut[0].pilihan);
        return;
      }
      if (urut.length > 1) {
        // objek numpuk: tampilkan daftar pilihan kecil, urut prioritas (markas TNI dulu, kabel terakhir)
        const wadah = m.getContainer();
        setPilihanKlik({ x: e.point.x, y: e.point.y, lebar: wadah.clientWidth || window.innerWidth, tinggi: wadah.clientHeight || window.innerHeight, daftar: urut.slice(0, MAKS_PILIHAN_KLIK).map((c) => c.pilihan), sisa: Math.max(0, urut.length - MAKS_PILIHAN_KLIK) });
        return;
      }
      // tidak ada titik: garis/poligon (kabel, ALKI, ZEE, ...) yang kena
      const f = kandidat[0];
      if (!f) {
        pilih(null);
        return;
      }
      pilih({ lapisan: LAYER_INTERAKTIF[f.layer.id], props: f.properties as Record<string, unknown>, lon: e.lngLat.lng, lat: e.lngLat.lat });
    },
    [kanvasRef, satelitRef, pilih, setPilihanKlik],
  );
}
