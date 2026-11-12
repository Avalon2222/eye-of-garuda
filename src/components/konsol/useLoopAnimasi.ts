import { useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import { setDataSource } from "@/lib/mapLayers";
import type { LayerId } from "@/lib/layers";
import type { KanvasLive } from "@/lib/kanvasLive";
import type { PelacakPesawat } from "@/lib/live/pesawat";
import type { PelacakSatelit } from "@/lib/live/satelit";
import type { PelacakKapal } from "@/lib/live/kapal";
import type { Pilihan, StatusLive } from "@/lib/types";

interface Opsi {
  mapRef: RefObject<MapLibre | null>;
  kanvasRef: RefObject<KanvasLive | null>;
  petaSudahLoadRef: RefObject<boolean>;
  aktifRef: RefObject<Set<LayerId>>;
  pilihanRef: RefObject<Pilihan | null>;
  pesawatRef: RefObject<PelacakPesawat | null>;
  satelitRef: RefObject<PelacakSatelit | null>;
  kapalRef: RefObject<PelacakKapal | null>;
  setPilihan: Dispatch<SetStateAction<Pilihan | null>>;
  setLive: Dispatch<SetStateAction<StatusLive>>;
}

/**
 * Loop animasi: kanvas (satelit + pesawat + komet SIPRI + skenario) tiap frame, posisi kapal tiap 2 s,
 * panel detail objek bergerak tiap 1 s, umur snapshot kapal tiap 30 s.
 */
export function useLoopAnimasi({ mapRef, kanvasRef, petaSudahLoadRef, aktifRef, pilihanRef, pesawatRef, satelitRef, kapalRef, setPilihan, setLive }: Opsi) {
  useEffect(() => {
    let raf = 0;
    let tKapal = 0, tStatus = 0, tDetail = 0;
    const tik = () => {
      const m = mapRef.current;
      const now = Date.now();
      const k = kanvasRef.current;
      if (m && k && petaSudahLoadRef.current) {
        const a = aktifRef.current;
        k.tampilPesawat = a.has("pesawat");
        k.tampilSatelit = a.has("satelit");
        k.tampilSipri = a.has("sipri");
        k.gambar(now);
        if (a.has("kapal") && kapalRef.current && now - tKapal > 2000) {
          tKapal = now;
          const fc = kapalRef.current.hitung(now);
          setDataSource(m, "kapal", fc);
          const pl = pilihanRef.current;
          if (pl?.lapisan === "kapal") {
            const f = fc.features.find((x) => x.properties?.id === pl.props.id);
            if (f && f.geometry.type === "Point") setDataSource(m, "pilihan", { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: f.geometry }] });
          }
        }
        // panel detail satelit/pesawat ikut bergerak: segarkan props tiap detik
        const pl = pilihanRef.current;
        if (pl && (pl.lapisan === "satelit" || pl.lapisan === "pesawat") && now - tDetail > 1000) {
          tDetail = now;
          if (pl.lapisan === "satelit" && satelitRef.current) {
            const sat = satelitRef.current.cari(Number(pl.props.norad));
            if (sat?.pos) setPilihan({ ...pl, props: satelitRef.current.info(sat), lon: sat.pos.lon, lat: sat.pos.lat });
          } else if (pl.lapisan === "pesawat" && pesawatRef.current) {
            const ps = pesawatRef.current.daftar(now).find((x) => x.hex === pl.props.hex);
            if (ps) setPilihan({ ...pl, props: ps.props, lon: ps.lon, lat: ps.lat });
          }
        }
        if (now - tStatus > 30_000 && kapalRef.current) {
          tStatus = now;
          const kp = kapalRef.current;
          setLive((st) => ({ ...st, kapalRef: { ...st.kapal, umurMenit: kp.umurMenit(now), live: kp.jumlahLive } }));
        }
      }
      raf = requestAnimationFrame(tik);
    };
    raf = requestAnimationFrame(tik);
    return () => cancelAnimationFrame(raf);
  }, [mapRef, kanvasRef, petaSudahLoadRef, aktifRef, pilihanRef, pesawatRef, satelitRef, kapalRef, setPilihan, setLive]);
}
