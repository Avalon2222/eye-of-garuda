import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Map as MapLibre, setWorkerUrl, type MapMouseEvent } from "maplibre-gl";
import { bangunStyle, ID_LAYER_SAT, layerBasemapTersembunyiSaatSat } from "@/lib/mapStyle";
import { pasangSemuaLapisan, setVisibilitas, sinkronVisibilitas, LAYER_INTERAKTIF } from "@/lib/mapLayers";
import { KanvasLive } from "@/lib/kanvasLive";
import { LAPISAN, type LayerId } from "@/lib/layers";
import type { Lang } from "@/lib/i18n";
import type { PelacakPesawat } from "@/lib/live/pesawat";
import type { PelacakSatelit } from "@/lib/live/satelit";
import { workerPetaSekali } from "@/lib/workerPeta";
import { TAMPILAN_JAUH } from "./jenis";

/** toleransi klik (px) untuk titik kecil: jari di HP butuh lebih lebar daripada kursor */
export const TOLERANSI_KLIK = { mouse: 7, sentuh: 14 };

/** Penangan event peta yang logikanya ada di Console; dibaca lewat ref supaya selalu versi terbaru. */
export interface PenanganPeta {
  /** style dan semua layer sudah terpasang: muat data statis, nyalakan pelacak live */
  saatLoad(m: MapLibre): void;
  saatMoveEnd(): void;
  saatMoveStart(): void;
  /** interaksi pengguna (geser/zoom): hentikan simulasi atau briefing bila ada */
  saatInterupsi(): void;
  saatKlik(m: MapLibre, e: MapMouseEvent): void;
}

interface Opsi {
  mapRef: RefObject<MapLibre | null>;
  kanvasRef: RefObject<KanvasLive | null>;
  /** dipanggil sekali saat peta idle pertama kali setelah load (terbang dari layar boot) */
  petaSiapRef: RefObject<(() => void) | null>;
  aktifRef: RefObject<Set<LayerId>>;
  langRef: RefObject<Lang>;
  satRef: RefObject<boolean>;
  datarRef: RefObject<boolean>;
  pesawatRef: RefObject<PelacakPesawat | null>;
  satelitRef: RefObject<PelacakSatelit | null>;
  penanganRef: RefObject<PenanganPeta>;
}

/**
 * Membuat peta MapLibre (globe) sekali, memasang semua layer, kanvas live, pemanasan tile,
 * dan meneruskan event ke penangan di Console.
 */
export function usePeta({ mapRef, kanvasRef, petaSiapRef, aktifRef, langRef, satRef, datarRef, pesawatRef, satelitRef, penanganRef }: Opsi) {
  const wadahRef = useRef<HTMLDivElement>(null);
  const petaSudahLoadRef = useRef(false);
  const layerSatTersembunyi = useRef<string[]>([]);
  const [online, setOnline] = useState(true);

  const terapkanSat = useCallback((m: MapLibre, on: boolean) => {
    if (!m.getLayer(ID_LAYER_SAT)) return;
    m.setLayoutProperty(ID_LAYER_SAT, "visibility", on ? "visible" : "none");
    for (const id of layerSatTersembunyi.current) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", on ? "none" : "visible");
  }, []);

  useEffect(() => {
    if (!wadahRef.current || mapRef.current) return;
    let dibatalkan = false;
    (async () => {
      // worker diambil barengan dengan style, jadi tidak menambah waktu tunggu
      const [style, urlWorker] = await Promise.all([bangunStyle().catch(() => null), workerPetaSekali()]);
      if (dibatalkan || !wadahRef.current) return;
      if (!style) {
        setOnline(false);
        return;
      }
      layerSatTersembunyi.current = layerBasemapTersembunyiSaatSat(style);
      setWorkerUrl(urlWorker);
      const m = new MapLibre({
        container: wadahRef.current,
        style,
        center: TAMPILAN_JAUH.center,
        zoom: TAMPILAN_JAUH.zoom,
        attributionControl: { compact: true },
        maxPitch: 70,
        fadeDuration: 150,
        canvasContextAttributes: { antialias: true, preserveDrawingBuffer: true },
      });
      mapRef.current = m;
      (window as unknown as { __eog?: MapLibre }).__eog = m;
      // sprite OpenFreeMap tidak punya "circle-11" (titik kota); buat sendiri supaya tidak ada warning di console
      m.setMissingStyleImageResolver((id) => {
        if (m.hasImage(id)) return;
        const n = id === "circle-11" ? 11 : 1;
        const data = new Uint8Array(n * n * 4);
        if (n > 1) {
          const c = (n - 1) / 2;
          for (let y = 0; y < n; y++)
            for (let x = 0; x < n; x++) {
              const d = Math.hypot(x - c, y - c);
              const i = (y * n + x) * 4;
              data[i] = 0x8b;
              data[i + 1] = 0x95;
              data[i + 2] = 0xa7;
              data[i + 3] = d <= c - 1.5 ? 230 : d <= c ? 120 : 0;
            }
        }
        m.addImage(id, { width: n, height: n, data });
      });
      m.on("load", () => {
        petaSudahLoadRef.current = true;
        pasangSemuaLapisan(m);
        if (!kanvasRef.current && wadahRef.current?.parentElement) {
          const k = new KanvasLive(m, wadahRef.current.parentElement);
          k.pesawat = pesawatRef.current;
          k.satelit = satelitRef.current;
          k.lang = langRef.current;
          kanvasRef.current = k;
          (window as unknown as { __eogKanvas?: KanvasLive }).__eogKanvas = k;
        }
        // pemanasan: semua lapisan dibuat visible sebentar supaya worker menyiapkan tile tiap source
        // saat layar boot masih tampil; setelah itu visibilitas sebenarnya diterapkan (toggle jadi instan)
        for (const l of LAPISAN) setVisibilitas(m, l.id, true);
        const terapkan = () => {
          if (!mapRef.current) return;
          sinkronVisibilitas(m, aktifRef.current);
        };
        const idPemanasan = setTimeout(terapkan, 2200);
        m.once("idle", () => {
          clearTimeout(idPemanasan);
          terapkan();
        });
        // jaring pengaman: tiap kali peta idle, samakan lagi visibilitas dengan state
        m.on("idle", terapkan);
        if (satRef.current) terapkanSat(m, true);
        if (datarRef.current) m.setProjection({ type: "mercator" });
        penanganRef.current.saatLoad(m);
        m.once("idle", () => {
          petaSiapRef.current?.();
          petaSiapRef.current = null;
        });
      });
      m.on("moveend", () => penanganRef.current.saatMoveEnd());
      m.on("movestart", () => penanganRef.current.saatMoveStart());
      m.on("dragstart", () => penanganRef.current.saatInterupsi());
      m.on("wheel", () => penanganRef.current.saatInterupsi());
      m.on("click", (e: MapMouseEvent) => penanganRef.current.saatKlik(m, e));
      m.on("mousemove", (e: MapMouseEvent) => {
        const ids = Object.keys(LAYER_INTERAKTIF).filter((id) => m.getLayer(id));
        const r = TOLERANSI_KLIK.mouse;
        const ada = Boolean(kanvasRef.current?.cari(e.point.x, e.point.y, 12)) || m.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers: ids }).length > 0;
        m.getCanvas().style.cursor = ada ? "pointer" : "";
      });
      m.on("error", (e) => {
        const pesan = String((e as { error?: { message?: string } }).error?.message ?? "");
        if (/tiles\.openfreemap|fonts/.test(pesan)) setOnline(false);
      });
    })();
    return () => {
      dibatalkan = true;
    };
  }, [mapRef, kanvasRef, petaSiapRef, aktifRef, langRef, satRef, datarRef, pesawatRef, satelitRef, penanganRef, terapkanSat]);

  return { wadahRef, petaSudahLoadRef, online, terapkanSat };
}
