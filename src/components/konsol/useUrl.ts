import { useCallback, useEffect, type RefObject } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import { tulisUrl } from "@/lib/urlState";
import type { LayerId } from "@/lib/layers";
import type { Lang } from "@/lib/i18n";
import type { Pilihan } from "@/lib/types";
import { tampilanPeta, type StatusSimulasi } from "./jenis";

interface Opsi {
  mapRef: RefObject<MapLibre | null>;
  bootRef: RefObject<boolean>;
  simulasiRef: RefObject<StatusSimulasi | null>;
  tourRef: RefObject<number>;
  aktifRef: RefObject<Set<LayerId>>;
  pilihanRef: RefObject<Pilihan | null>;
  aktif: Set<LayerId>;
  pilihan: Pilihan | null;
  lang: Lang;
  sat: boolean;
  datar: boolean;
}

/** Menyalin keadaan konsol (kamera, lapisan, bahasa, pilihan) ke hash URL supaya bisa dibagikan. */
export function useUrl({ mapRef, bootRef, simulasiRef, tourRef, aktifRef, pilihanRef, aktif, pilihan, lang, sat, datar }: Opsi) {
  const simpanUrl = useCallback(() => {
    const m = mapRef.current;
    if (!m || bootRef.current || simulasiRef.current || tourRef.current >= 0) return;
    tulisUrl({
      tampilan: tampilanPeta(m),
      lapisan: [...aktifRef.current],
      lang,
      sat,
      datar,
      pilih: pilihanRef.current ? String(pilihanRef.current.props.id ?? "") : undefined,
    });
  }, [mapRef, bootRef, simulasiRef, tourRef, aktifRef, pilihanRef, lang, sat, datar]);

  useEffect(() => {
    simpanUrl();
  }, [aktif, lang, sat, datar, pilihan, simpanUrl]);

  return simpanUrl;
}
