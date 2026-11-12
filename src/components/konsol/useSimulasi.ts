import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import { sinkronVisibilitas, sorotKabelPutus } from "@/lib/mapLayers";
import type { LayerId } from "@/lib/layers";
import { tampilanAwal, type Tampilan } from "@/lib/urlState";
import { terjemah, type Lang } from "@/lib/i18n";
import { TOUR } from "@/lib/tour";
import { skenarioDariId, TAHAN_KESIMPULAN_MS } from "@/lib/skenario";
import type { KanvasLive } from "@/lib/kanvasLive";
import type { Pilihan, PanelId } from "@/lib/types";
import { layarKecil, lapisanLive, tampilanPeta, type StatusSimulasi } from "./jenis";
import { useTerbaru } from "./useTerbaru";

export type AlasanBerhenti = "selesai" | "stop" | "interupsi";

interface Opsi {
  mapRef: RefObject<MapLibre | null>;
  kanvasRef: RefObject<KanvasLive | null>;
  aktifRef: RefObject<Set<LayerId>>;
  /** lapisan pengguna sebelum simulasi/briefing, dipulihkan saat selesai atau diinterupsi */
  lapisanSebelumRef: RefObject<Set<LayerId> | null>;
  setAktif: Dispatch<SetStateAction<Set<LayerId>>>;
  tersedia: Set<LayerId>;
  langRef: RefObject<Lang>;
  mulaiLive: (id: LayerId) => void;
  pilih: (p: Pilihan | null, terbang?: boolean) => void;
  setPanel: Dispatch<SetStateAction<PanelId>>;
  setObrolan: Dispatch<SetStateAction<boolean>>;
  tampilkanToast: (t: string) => void;
  /** dipanggil saat simulasi berhenti supaya rekaman yang masih jalan ikut disimpan */
  hentikanRekam: (idSimulasi: string) => void;
}

/**
 * Simulasi War Room dan briefing (tour): keduanya "meminjam" layar. Lapisan dan kamera pengguna
 * disimpan dulu, lalu dipulihkan saat selesai, dihentikan, atau diinterupsi oleh interaksi.
 */
export function useSimulasi({ mapRef, kanvasRef, aktifRef, lapisanSebelumRef, setAktif, tersedia, langRef, mulaiLive, pilih, setPanel, setObrolan, tampilkanToast, hentikanRekam }: Opsi) {
  const [simulasi, setSimulasi] = useState<StatusSimulasi | null>(null);
  const [tour, setTour] = useState(-1);
  const [pilihSkenario, setPilihSkenario] = useState(false);
  const simulasiRef = useTerbaru(simulasi);
  const tourRef = useTerbaru(tour);
  const tampilanSebelumRef = useRef<Tampilan | null>(null);

  const hentikanSimulasi = useCallback(
    (alasan: AlasanBerhenti) => {
      const m = mapRef.current;
      if (simulasiRef.current) {
        hentikanRekam(simulasiRef.current.id);
        setSimulasi(null);
        if (kanvasRef.current) kanvasRef.current.skenario = null;
        if (m) sorotKabelPutus(m, []);
      }
      if (tourRef.current >= 0) setTour(-1);
      if (lapisanSebelumRef.current) {
        const pulih = lapisanSebelumRef.current;
        lapisanSebelumRef.current = null;
        setAktif(pulih);
        if (m) sinkronVisibilitas(m, pulih);
        if (alasan === "interupsi") tampilkanToast(terjemah(langRef.current, "scenario_interrupted"));
      }
      if (alasan === "selesai" && m) {
        const awal = tampilanAwal();
        m.flyTo({ center: [awal.lon, awal.lat], zoom: awal.zoom, pitch: 0, bearing: 0, duration: 2600, essential: true });
      } else if (alasan === "stop" && m && tampilanSebelumRef.current) {
        const t = tampilanSebelumRef.current;
        m.flyTo({ center: [t.lon, t.lat], zoom: t.zoom, pitch: t.pitch, bearing: t.bearing, duration: 2000, essential: true });
      }
      tampilanSebelumRef.current = null;
    },
    [mapRef, kanvasRef, simulasiRef, tourRef, langRef, lapisanSebelumRef, setAktif, tampilkanToast, hentikanRekam],
  );

  const simpanKeadaan = useCallback(() => {
    if (lapisanSebelumRef.current) return;
    lapisanSebelumRef.current = new Set(aktifRef.current);
    const m = mapRef.current;
    if (m) tampilanSebelumRef.current = tampilanPeta(m);
  }, [aktifRef, mapRef, lapisanSebelumRef]);

  const mulaiSimulasi = useCallback(
    (id: string) => {
      setPilihSkenario(false);
      if (tourRef.current >= 0) setTour(-1);
      simpanKeadaan();
      pilih(null);
      setPanel("none");
      setObrolan(false);
      setSimulasi({ id, fase: 0, mulaiFase: Date.now() });
    },
    [tourRef, simpanKeadaan, pilih, setPanel, setObrolan],
  );

  // jalankan fase simulasi
  useEffect(() => {
    const k = kanvasRef.current;
    if (!simulasi) {
      if (k) k.skenario = null;
      return;
    }
    const m = mapRef.current;
    const sk = skenarioDariId(simulasi.id);
    const f = sk?.fase[simulasi.fase];
    if (!m || !sk || !f) {
      hentikanSimulasi("stop");
      return;
    }
    // hanya lapisan yang dibutuhkan skenario + tambahan fase ini
    const fokus = new Set<LayerId>([...sk.lapisan, ...(f.nyalakan ?? [])]);
    setAktif(fokus);
    sinkronVisibilitas(m, fokus);
    for (const id of fokus) if (lapisanLive(id)) mulaiLive(id);
    sorotKabelPutus(m, f.kabelPutus ?? []);
    // di HP, panel menutup bagian bawah: beri padding supaya aksi tetap terlihat
    const kecil = layarKecil();
    m.flyTo({
      center: f.kamera.center,
      zoom: kecil ? f.kamera.zoom - 0.5 : f.kamera.zoom,
      pitch: f.kamera.pitch,
      bearing: f.kamera.bearing,
      duration: f.kamera.durasi,
      essential: true,
      curve: 1.2,
      padding: kecil ? { top: 120, bottom: Math.round(window.innerHeight * 0.4), left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 0 },
    });
    if (k) k.skenario = { fase: f, mulai: Date.now() + Math.min(1200, f.kamera.durasi * 0.4) };
    const terakhir = simulasi.fase >= sk.fase.length - 1;
    const tahan = terakhir ? TAHAN_KESIMPULAN_MS : f.kamera.durasi + f.tahan;
    const id = window.setTimeout(() => {
      if (simulasiRef.current?.id !== simulasi.id || simulasiRef.current.fase !== simulasi.fase) return;
      if (terakhir) hentikanSimulasi("selesai");
      else setSimulasi({ id: simulasi.id, fase: simulasi.fase + 1, mulaiFase: Date.now() });
    }, tahan);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulasi?.id, simulasi?.fase]);

  const toggleTour = useCallback(() => {
    if (tourRef.current >= 0) {
      hentikanSimulasi("stop");
      return;
    }
    if (simulasiRef.current) hentikanSimulasi("stop");
    simpanKeadaan();
    setAktif(new Set());
    setTour(0);
  }, [tourRef, simulasiRef, hentikanSimulasi, simpanKeadaan, setAktif]);

  const toggleSkenario = useCallback(() => {
    if (simulasiRef.current) hentikanSimulasi("stop");
    else setPilihSkenario((p) => !p);
  }, [simulasiRef, hentikanSimulasi]);

  // jalankan langkah briefing (lapisan kumulatif per langkah)
  useEffect(() => {
    if (tour < 0) return;
    const m = mapRef.current;
    const l = TOUR[tour];
    if (!m || !l) {
      hentikanSimulasi("selesai");
      return;
    }
    pilih(null);
    setPanel("none");
    if (l.nyalakan) {
      setAktif((a) => {
        const b = new Set(a);
        for (const id of l.nyalakan!) {
          if (!tersedia.has(id) && !lapisanLive(id)) continue;
          b.add(id);
          if (lapisanLive(id)) mulaiLive(id);
        }
        sinkronVisibilitas(m, b);
        return b;
      });
    }
    m.flyTo({ center: l.center, zoom: layarKecil() ? l.zoom - 0.4 : l.zoom, pitch: l.pitch, bearing: l.bearing, duration: l.durasiTerbang, essential: true, curve: 1.2, padding: layarKecil() ? { top: 60, bottom: 220, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 0 } });
    const id = setTimeout(() => {
      if (tourRef.current !== tour) return;
      if (tour + 1 < TOUR.length) setTour(tour + 1);
      else hentikanSimulasi("selesai");
    }, l.durasiTerbang + l.tahan);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  /** true selama simulasi atau briefing memegang layar */
  const sibuk = useCallback(() => tourRef.current >= 0 || simulasiRef.current !== null, [tourRef, simulasiRef]);

  /** Interaksi pengguna (geser, zoom, klik) saat simulasi/briefing: hentikan dan pulihkan. */
  const interupsi = useCallback(() => {
    if (!sibuk()) return false;
    hentikanSimulasi("interupsi");
    return true;
  }, [sibuk, hentikanSimulasi]);

  return {
    simulasi,
    setSimulasi,
    simulasiRef,
    tour,
    setTour,
    tourRef,
    pilihSkenario,
    setPilihSkenario,
    hentikanSimulasi,
    mulaiSimulasi,
    toggleTour,
    toggleSkenario,
    sibuk,
    interupsi,
  };
}
