import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import type { LayerId } from "@/lib/layers";
import type { KanvasLive } from "@/lib/kanvasLive";
import { PelacakPesawat, type CakupanPesawat } from "@/lib/live/pesawat";
import { PelacakSatelit } from "@/lib/live/satelit";
import { PelacakKapal } from "@/lib/live/kapal";
import type { StatusLive } from "@/lib/types";

interface Opsi {
  mapRef: RefObject<MapLibre | null>;
  kanvasRef: RefObject<KanvasLive | null>;
  setJumlah: Dispatch<SetStateAction<Partial<Record<LayerId, number>>>>;
}

/**
 * Pelacak data live (pesawat, satelit, kapal). Tiap pelacak dibuat sekali saat lapisannya pertama
 * dinyalakan dan terus mengambil data di latar; status ringkasnya dipakai ticker dan panel data.
 */
export function useLive({ mapRef, kanvasRef, setJumlah }: Opsi) {
  const pesawatRef = useRef<PelacakPesawat | null>(null);
  const satelitRef = useRef<PelacakSatelit | null>(null);
  const kapalRef = useRef<PelacakKapal | null>(null);
  const [cakupan, setCakupan] = useState<CakupanPesawat>("kawasan");
  const [live, setLive] = useState<StatusLive>({
    pesawat: { jumlah: 0, totalDunia: 0, galat: null, terakhir: 0 },
    satelit: { jumlah: 0, epoch: "", galat: null },
    kapal: { jumlah: 0, umurMenit: null, galat: null, live: 0 },
  });

  const mulaiLive = useCallback(
    (id: LayerId) => {
      const m = mapRef.current;
      if (!m) return;
      if (id === "pesawat" && !pesawatRef.current) {
        const p = new PelacakPesawat();
        p.cakupan = cakupan;
        pesawatRef.current = p;
        if (kanvasRef.current) kanvasRef.current.pesawat = p;
        const ambil = () =>
          p.ambil().then(() => {
            setLive((s) => ({ ...s, pesawatRef: { jumlah: p.jumlah, totalDunia: 0, galat: p.galat, terakhir: p.terakhirAmbil } }));
            setJumlah((j) => ({ ...j, pesawatRef: p.jumlah }));
          });
        ambil();
        const idInt = setInterval(ambil, 10_000);
        (p as unknown as { stop: () => void }).stop = () => clearInterval(idInt);
      }
      if (id === "satelit" && !satelitRef.current) {
        const s = new PelacakSatelit();
        satelitRef.current = s;
        if (kanvasRef.current) kanvasRef.current.satelit = s;
        s.muat().then(() => {
          setLive((st) => ({ ...st, satelitRef: { jumlah: s.jumlah, epoch: s.katalog?.epoch_tle ?? "", galat: s.galat } }));
          setJumlah((j) => ({ ...j, satelitRef: s.jumlah }));
        });
      }
      if (id === "kapal" && !kapalRef.current) {
        const k = new PelacakKapal();
        kapalRef.current = k;
        const laporkan = () => {
          setLive((st) => ({ ...st, kapalRef: { jumlah: k.jumlah, umurMenit: k.umurMenit(Date.now()), galat: k.galat, live: k.jumlahLive } }));
          setJumlah((j) => ({ ...j, kapalRef: k.jumlah }));
        };
        k.muat().then(laporkan);
        k.muatLive().then(laporkan);
        const idSnap = setInterval(() => k.muat().then(laporkan), 5 * 60_000);
        const idLive = setInterval(() => k.muatLive().then(laporkan), 60_000);
        (k as unknown as { stop: () => void }).stop = () => {
          clearInterval(idSnap);
          clearInterval(idLive);
        };
      }
    },
    [cakupan, mapRef, kanvasRef, setJumlah],
  );

  // ganti cakupan pesawat (kawasan/dunia): ambil ulang segera
  useEffect(() => {
    if (pesawatRef.current) {
      pesawatRef.current.cakupan = cakupan;
      pesawatRef.current.ambil().then(() => {
        const p = pesawatRef.current!;
        setJumlah((j) => ({ ...j, pesawatRef: p.jumlah }));
        setLive((s) => ({ ...s, pesawatRef: { ...s.pesawat, jumlah: p.jumlah, galat: p.galat, terakhir: p.terakhirAmbil } }));
      });
    }
  }, [cakupan, setJumlah]);

  return { pesawatRef, satelitRef, kapalRef, live, setLive, cakupan, setCakupan, mulaiLive };
}
