"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibre, setWorkerUrl, type MapMouseEvent } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { bangunStyle, ID_LAYER_SAT, layerBasemapTersembunyiSaatSat } from "@/lib/mapStyle";
import { pasangSemuaLapisan, setVisibilitas, sinkronVisibilitas, setDataSource, LAYER_INTERAKTIF, sorotPilihan, pakaiCincin, sorotKabelPutus } from "@/lib/mapLayers";
import { KanvasLive } from "@/lib/kanvasLive";
import { LAPISAN, LAPISAN_BAWAAN, lapisanDariTombol, type LayerId } from "@/lib/layers";
import { bacaUrl, tulisUrl, tampilanAwal, type Tampilan } from "@/lib/urlState";
import { terjemah, bacaLangTersimpan, simpanLang, type Lang } from "@/lib/i18n";
import { TOUR } from "@/lib/tour";
import { PelacakPesawat, type CakupanPesawat } from "@/lib/live/pesawat";
import { PelacakSatelit } from "@/lib/live/satelit";
import { PelacakKapal } from "@/lib/live/kapal";
import { PenjadwalLintasan, type Lintasan } from "@/lib/live/lintasan";
import { muatAnalisis, type DataSipri } from "@/lib/analisis";
import { skenarioDariId, skenarioKeMarkdown, TAHAN_KESIMPULAN_MS } from "@/lib/skenario";
import { fotoPng, unduhTeks, unduhBlob, bisaMerekam, Perekam } from "@/lib/ekspor";
import type { Pilihan, PanelId, StatusLive } from "@/lib/types";
import BootScreen from "./BootScreen";
import Hud, { JamZulu } from "./Hud";
import LayerRail, { LayerChips } from "./LayerRail";
import DetailPanel from "./DetailPanel";
import Ticker from "./Ticker";
import SearchPalette, { type EntriCari } from "./SearchPalette";
import HelpOverlay from "./HelpOverlay";
import TourOverlay from "./TourOverlay";
import DataPanel from "./DataPanel";
import TimelineStrip from "./TimelineStrip";
import SipriLegend from "./SipriLegend";
import SkenarioOverlay, { SkenarioPicker } from "./SkenarioOverlay";
import ChatWidget from "./ChatWidget";
import Onboarding, { panduanSudahDilihat } from "./Onboarding";
import JadwalSatelit from "./JadwalSatelit";
import PilihObjek from "./PilihObjek";
import { urutkanCalon, type CalonKlik } from "@/lib/klik";

const TAMPILAN_JAUH = { center: [118, -2] as [number, number], zoom: 1.3, pitch: 0, bearing: 0 };
const KOSONG: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
/** toleransi klik (px) untuk titik kecil: jari di HP butuh lebih lebar daripada kursor */
const TOLERANSI_KLIK = { mouse: 7, sentuh: 14 };
/** maksimal baris di daftar pilihan objek yang numpuk */
const MAKS_PILIHAN_KLIK = 6;

function entriDariFitur(lapisan: LayerId, f: GeoJSON.Feature): EntriCari | null {
  const p = (f.properties ?? {}) as Record<string, unknown>;
  let lon: number, lat: number;
  const g = f.geometry;
  if (g.type === "Point") [lon, lat] = g.coordinates as [number, number];
  else if (g.type === "LineString") [lon, lat] = g.coordinates[Math.floor(g.coordinates.length / 2)] as [number, number];
  else if (g.type === "MultiLineString") {
    const seg = g.coordinates[0];
    [lon, lat] = seg[Math.floor(seg.length / 2)] as [number, number];
  } else if (g.type === "Polygon") [lon, lat] = g.coordinates[0][0] as [number, number];
  else return null;
  const nama = String(p.nama ?? p.judul ?? p.callsign ?? "");
  if (!nama) return null;
  const sub = String(p.jenis ?? p.operator ?? p.negara ?? p.kategori ?? p.kelompok ?? p.tanggal ?? p.pesawat ?? "");
  return { id: String(p.id ?? `${lapisan}-${nama}`), lapisan, nama, sub, lon, lat, props: p };
}

function layarKecil(): boolean {
  return typeof window !== "undefined" && window.innerWidth < 640;
}

interface StatusSimulasi {
  id: string;
  fase: number;
  /** ms epoch saat fase ini mulai (untuk hitung mundur fase terakhir) */
  mulaiFase: number;
}

export default function Console() {
  const awalUrl = useMemo(() => bacaUrl(), []);
  const [lang, setLang] = useState<Lang>(() => awalUrl.lang ?? bacaLangTersimpan());
  const [aktif, setAktif] = useState<Set<LayerId>>(() => new Set(awalUrl.lapisan ?? LAPISAN_BAWAAN));
  const [sat, setSat] = useState(Boolean(awalUrl.sat));
  const [datar, setDatar] = useState(Boolean(awalUrl.datar));
  const [boot, setBoot] = useState(true);
  const [siap, setSiap] = useState(false);
  const [pilihan, setPilihan] = useState<Pilihan | null>(null);
  const [pilihanKlik, setPilihanKlik] = useState<{ x: number; y: number; daftar: Pilihan[]; sisa: number } | null>(null);
  const [panel, setPanel] = useState<PanelId>("none");
  const [tour, setTour] = useState(-1);
  const [obrolan, setObrolan] = useState(false);
  const [panduan, setPanduan] = useState(false);
  const [pilihSkenario, setPilihSkenario] = useState(false);
  const [simulasi, setSimulasi] = useState<StatusSimulasi | null>(null);
  const [merekam, setMerekam] = useState(false);
  const [jadwal, setJadwal] = useState(false);
  const [lintasan, setLintasan] = useState<{ daftar: Lintasan[]; sekarang: number[]; dihitung: number } | null>(null);
  const [hitungLintasan, setHitungLintasan] = useState(false);
  const [jumlah, setJumlah] = useState<Partial<Record<LayerId, number>>>({});
  const [tersedia, setTersedia] = useState<Set<LayerId>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [cakupan, setCakupan] = useState<CakupanPesawat>("kawasan");
  const [sipri, setSipri] = useState<DataSipri | null>(null);
  const [insiden, setInsiden] = useState<GeoJSON.FeatureCollection | null>(null);
  const [live, setLive] = useState<StatusLive>({
    pesawat: { jumlah: 0, totalDunia: 0, galat: null, terakhir: 0 },
    satelit: { jumlah: 0, epoch: "", galat: null },
    kapal: { jumlah: 0, umurMenit: null, galat: null, live: 0 },
  });

  const wadah = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const dataStatis = useRef(new Map<LayerId, GeoJSON.FeatureCollection>());
  const indeks = useRef<EntriCari[]>([]);
  const aktifRef = useRef(aktif);
  aktifRef.current = aktif;
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const simulasiRef = useRef(simulasi);
  simulasiRef.current = simulasi;
  const langRef = useRef(lang);
  langRef.current = lang;
  const pesawat = useRef<PelacakPesawat | null>(null);
  const satelit = useRef<PelacakSatelit | null>(null);
  const kapal = useRef<PelacakKapal | null>(null);
  const penjadwal = useRef<PenjadwalLintasan | null>(null);
  const pilihanRef = useRef(pilihan);
  pilihanRef.current = pilihan;
  const layerSatTersembunyi = useRef<string[]>([]);
  const bootRef = useRef(boot);
  bootRef.current = boot;
  const petaSiapCallback = useRef<(() => void) | null>(null);
  const petaSudahLoad = useRef(false);
  const kanvas = useRef<KanvasLive | null>(null);
  const perekam = useRef<Perekam | null>(null);
  /** lapisan pengguna sebelum simulasi/briefing, dipulihkan saat selesai atau diinterupsi */
  const lapisanSebelum = useRef<Set<LayerId> | null>(null);
  const tampilanSebelum = useRef<Tampilan | null>(null);

  const tampilkanToast = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // ---------- URL ----------
  const simpanUrl = useCallback(() => {
    const m = mapRef.current;
    if (!m || bootRef.current || simulasiRef.current || tourRef.current >= 0) return;
    const c = m.getCenter();
    tulisUrl({
      tampilan: { lat: c.lat, lon: c.lng, zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() },
      lapisan: [...aktifRef.current],
      lang,
      sat,
      datar,
      pilih: pilihanRef.current ? String(pilihanRef.current.props.id ?? "") : undefined,
    });
  }, [lang, sat, datar]);

  useEffect(() => {
    simpanUrl();
  }, [aktif, lang, sat, datar, pilihan, simpanUrl]);

  // ---------- visibilitas lapisan: selalu disinkronkan dengan state (anti "bandel") ----------
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !petaSudahLoad.current) return;
    sinkronVisibilitas(m, aktif);
  }, [aktif]);

  useEffect(() => {
    if (kanvas.current) kanvas.current.lang = lang;
  }, [lang]);

  // ---------- pilih entitas ----------
  const pilih = useCallback((p: Pilihan | null, terbang = false) => {
    setPilihan(p);
    const m = mapRef.current;
    if (!m) return;
    const id = p ? String(p.props.id ?? "") : "";
    const diKanvas = p?.lapisan === "satelit" || p?.lapisan === "pesawat";
    const cincin = p && !diKanvas && pakaiCincin(p.lapisan, id);
    setDataSource(m, "pilihan", cincin ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lon, p.lat] } }] } : KOSONG);
    sorotPilihan(m, p && !cincin && !diKanvas ? p.lapisan : null, id || null);
    if (kanvas.current) kanvas.current.pilihan = diKanvas && p ? { jenis: p.lapisan as "satelit" | "pesawat", id } : null;
    if (p && terbang) {
      m.flyTo({ center: [p.lon, p.lat], zoom: Math.max(m.getZoom(), p.lapisan === "satelit" ? 2.5 : 6), duration: 1600, essential: true });
    }
  }, []);

  // ---------- muat data statis ----------
  const muatLapisanStatis = useCallback(async (m: MapLibre) => {
    const hasil: Partial<Record<LayerId, number>> = {};
    const ada = new Set<LayerId>();
    await Promise.all(
      LAPISAN.filter((l) => l.jenis === "statis" && l.berkas).map(async (l) => {
        try {
          const res = await fetch(`/data/${l.berkas}`);
          const fc = (await res.json()) as GeoJSON.FeatureCollection;
          dataStatis.current.set(l.id, fc);
          setDataSource(m, l.id, fc);
          hasil[l.id] = fc.features.length;
          ada.add(l.id);
          for (const f of fc.features) {
            const e = entriDariFitur(l.id, f);
            if (e) indeks.current.push(e);
          }
          if (l.id === "kabel") {
            const r2 = await fetch("/data/landing_station.geojson");
            const fc2 = (await r2.json()) as GeoJSON.FeatureCollection;
            setDataSource(m, "kabel-landing", fc2);
            for (const f of fc2.features) {
              const e = entriDariFitur("kabel", f);
              if (e) indeks.current.push(e);
            }
          }
        } catch (e) {
          console.warn("gagal memuat", l.id, e);
        }
      }),
    );
    // lapisan live selalu "tersedia" (datanya datang belakangan)
    for (const l of LAPISAN) if (l.jenis === "live") ada.add(l.id);
    // lapisan analisis fase 3
    try {
      const an = await muatAnalisis(m);
      setSipri(an.sipri);
      setInsiden(an.fitur.insiden ?? null);
      if (kanvas.current && an.fitur.sipri) {
        kanvas.current.busurSipri = an.fitur.sipri.features
          .filter((f) => f.geometry.type === "LineString")
          .map((f) => ({ id: String(f.properties?.id), koordinat: (f.geometry as GeoJSON.LineString).coordinates as [number, number][], tebal: Number(f.properties?.tebal ?? 1) }));
      }
      for (const [id, fc] of Object.entries(an.fitur)) {
        if (!fc) continue;
        hasil[id as LayerId] = fc.features.length;
        ada.add(id as LayerId);
        for (const f of fc.features) {
          const e = entriDariFitur(id as LayerId, f);
          if (e) indeks.current.push(e);
        }
      }
    } catch (e) {
      console.warn("analisis belum tersedia", e);
    }
    setJumlah((j) => ({ ...j, ...hasil }));
    setTersedia(ada);
    setSiap(true);
  }, []);

  // ---------- live ----------
  const mulaiLive = useCallback(
    (id: LayerId) => {
      const m = mapRef.current;
      if (!m) return;
      if (id === "pesawat" && !pesawat.current) {
        const p = new PelacakPesawat();
        p.cakupan = cakupan;
        pesawat.current = p;
        if (kanvas.current) kanvas.current.pesawat = p;
        const ambil = () =>
          p.ambil().then(() => {
            setLive((s) => ({ ...s, pesawat: { jumlah: p.jumlah, totalDunia: 0, galat: p.galat, terakhir: p.terakhirAmbil } }));
            setJumlah((j) => ({ ...j, pesawat: p.jumlah }));
          });
        ambil();
        const idInt = setInterval(ambil, 10_000);
        (p as unknown as { stop: () => void }).stop = () => clearInterval(idInt);
      }
      if (id === "satelit" && !satelit.current) {
        const s = new PelacakSatelit();
        satelit.current = s;
        if (kanvas.current) kanvas.current.satelit = s;
        s.muat().then(() => {
          setLive((st) => ({ ...st, satelit: { jumlah: s.jumlah, epoch: s.katalog?.epoch_tle ?? "", galat: s.galat } }));
          setJumlah((j) => ({ ...j, satelit: s.jumlah }));
        });
      }
      if (id === "kapal" && !kapal.current) {
        const k = new PelacakKapal();
        kapal.current = k;
        const laporkan = () => {
          setLive((st) => ({ ...st, kapal: { jumlah: k.jumlah, umurMenit: k.umurMenit(Date.now()), galat: k.galat, live: k.jumlahLive } }));
          setJumlah((j) => ({ ...j, kapal: k.jumlah }));
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
    [cakupan],
  );

  useEffect(() => {
    if (pesawat.current) {
      pesawat.current.cakupan = cakupan;
      pesawat.current.ambil().then(() => {
        const p = pesawat.current!;
        setJumlah((j) => ({ ...j, pesawat: p.jumlah }));
        setLive((s) => ({ ...s, pesawat: { ...s.pesawat, jumlah: p.jumlah, galat: p.galat, terakhir: p.terakhirAmbil } }));
      });
    }
  }, [cakupan]);

  // loop animasi: kanvas (satelit + pesawat + komet SIPRI + skenario) tiap frame, kapal tiap 2 s
  useEffect(() => {
    let raf = 0;
    let tKapal = 0, tStatus = 0, tDetail = 0;
    const tik = () => {
      const m = mapRef.current;
      const now = Date.now();
      const k = kanvas.current;
      if (m && k && petaSudahLoad.current) {
        const a = aktifRef.current;
        k.tampilPesawat = a.has("pesawat");
        k.tampilSatelit = a.has("satelit");
        k.tampilSipri = a.has("sipri");
        k.gambar(now);
        if (a.has("kapal") && kapal.current && now - tKapal > 2000) {
          tKapal = now;
          const fc = kapal.current.hitung(now);
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
          if (pl.lapisan === "satelit" && satelit.current) {
            const sat = satelit.current.cari(Number(pl.props.norad));
            if (sat?.pos) setPilihan({ ...pl, props: satelit.current.info(sat), lon: sat.pos.lon, lat: sat.pos.lat });
          } else if (pl.lapisan === "pesawat" && pesawat.current) {
            const ps = pesawat.current.daftar(now).find((x) => x.hex === pl.props.hex);
            if (ps) setPilihan({ ...pl, props: ps.props, lon: ps.lon, lat: ps.lat });
          }
        }
        if (now - tStatus > 30_000 && kapal.current) {
          tStatus = now;
          const kp = kapal.current;
          setLive((st) => ({ ...st, kapal: { ...st.kapal, umurMenit: kp.umurMenit(now), live: kp.jumlahLive } }));
        }
      }
      raf = requestAnimationFrame(tik);
    };
    raf = requestAnimationFrame(tik);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---------- simulasi & briefing: fokus lapisan, interupsi, pemulihan ----------
  const hentikanSimulasi = useCallback(
    (alasan: "selesai" | "stop" | "interupsi") => {
      const m = mapRef.current;
      if (simulasiRef.current) {
        setSimulasi(null);
        if (kanvas.current) kanvas.current.skenario = null;
        if (m) sorotKabelPutus(m, []);
        if (perekam.current?.aktif) {
          perekam.current.berhenti().then((b) => {
            if (b && perekam.current) unduhBlob(b, `eye-of-garuda-${simulasiRef.current?.id ?? "simulasi"}.${perekam.current.ekstensi}`);
          });
          setMerekam(false);
        }
      }
      if (tourRef.current >= 0) setTour(-1);
      if (lapisanSebelum.current) {
        const pulih = lapisanSebelum.current;
        lapisanSebelum.current = null;
        setAktif(pulih);
        if (m) sinkronVisibilitas(m, pulih);
        if (alasan === "interupsi") tampilkanToast(terjemah(langRef.current, "scenario_interrupted"));
      }
      if (alasan === "selesai" && m) {
        const awal = tampilanAwal();
        m.flyTo({ center: [awal.lon, awal.lat], zoom: awal.zoom, pitch: 0, bearing: 0, duration: 2600, essential: true });
      } else if (alasan === "stop" && m && tampilanSebelum.current) {
        const t = tampilanSebelum.current;
        m.flyTo({ center: [t.lon, t.lat], zoom: t.zoom, pitch: t.pitch, bearing: t.bearing, duration: 2000, essential: true });
      }
      tampilanSebelum.current = null;
    },
    [tampilkanToast],
  );

  const simpanKeadaan = useCallback(() => {
    if (lapisanSebelum.current) return;
    lapisanSebelum.current = new Set(aktifRef.current);
    const m = mapRef.current;
    if (m) {
      const c = m.getCenter();
      tampilanSebelum.current = { lat: c.lat, lon: c.lng, zoom: m.getZoom(), bearing: m.getBearing(), pitch: m.getPitch() };
    }
  }, []);

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
    [simpanKeadaan, pilih],
  );

  // jalankan fase simulasi
  useEffect(() => {
    const k = kanvas.current;
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
    for (const id of fokus) if (LAPISAN.find((x) => x.id === id)?.jenis === "live") mulaiLive(id);
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
  }, [hentikanSimulasi, simpanKeadaan]);

  const toggleSkenario = useCallback(() => {
    if (simulasiRef.current) hentikanSimulasi("stop");
    else setPilihSkenario((p) => !p);
  }, [hentikanSimulasi]);

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
          if (!tersedia.has(id) && LAPISAN.find((x) => x.id === id)?.jenis !== "live") continue;
          b.add(id);
          if (LAPISAN.find((x) => x.id === id)?.jenis === "live") mulaiLive(id);
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

  // ---------- peta ----------
  useEffect(() => {
    if (!wadah.current || mapRef.current) return;
    let dibatalkan = false;
    (async () => {
      const style = await bangunStyle().catch(() => null);
      if (dibatalkan || !wadah.current) return;
      if (!style) {
        setOnline(false);
        return;
      }
      layerSatTersembunyi.current = layerBasemapTersembunyiSaatSat(style);
      setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const m = new MapLibre({
        container: wadah.current,
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
        petaSudahLoad.current = true;
        pasangSemuaLapisan(m);
        if (!kanvas.current && wadah.current?.parentElement) {
          const k = new KanvasLive(m, wadah.current.parentElement);
          k.pesawat = pesawat.current;
          k.satelit = satelit.current;
          k.lang = langRef.current;
          kanvas.current = k;
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
        if (sat) terapkanSat(m, true);
        if (datar) m.setProjection({ type: "mercator" });
        muatLapisanStatis(m);
        for (const id of aktifRef.current) if (LAPISAN.find((l) => l.id === id)?.jenis === "live") mulaiLive(id);
        m.once("idle", () => {
          petaSiapCallback.current?.();
          petaSiapCallback.current = null;
        });
      });
      m.on("moveend", simpanUrl);
      // interaksi pengguna saat simulasi/briefing: hentikan dan pulihkan
      m.on("movestart", () => setPilihanKlik(null));
      m.on("dragstart", () => {
        if (tourRef.current >= 0 || simulasiRef.current) hentikanSimulasi("interupsi");
      });
      m.on("wheel", () => {
        if (tourRef.current >= 0 || simulasiRef.current) hentikanSimulasi("interupsi");
      });
      m.on("click", (e: MapMouseEvent) => {
        if (tourRef.current >= 0 || simulasiRef.current) {
          hentikanSimulasi("interupsi");
          return;
        }
        setPilihanKlik(null);
        const sentuh = (e.originalEvent as PointerEvent | undefined)?.pointerType === "touch" || (e.originalEvent as { sourceCapabilities?: { firesTouchEvents?: boolean } })?.sourceCapabilities?.firesTouchEvents === true;
        const r = sentuh ? TOLERANSI_KLIK.sentuh : TOLERANSI_KLIK.mouse;
        // kumpulkan semua objek titik di area klik: kanvas (satelit, pesawat) + layer MapLibre
        const calon: CalonKlik[] = [];
        for (const h of kanvas.current?.cariSemua(e.point.x, e.point.y, r + 6) ?? []) {
          if (h.jenis === "satelit") {
            const sat = satelit.current?.cari(Number((h.props as { norad: number }).norad));
            if (sat && satelit.current) calon.push({ pilihan: { lapisan: "satelit", props: satelit.current.info(sat), lon: h.lon, lat: h.lat }, d2: h.d2 });
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
          setPilihanKlik({ x: e.point.x, y: e.point.y, daftar: urut.slice(0, MAKS_PILIHAN_KLIK).map((c) => c.pilihan), sisa: Math.max(0, urut.length - MAKS_PILIHAN_KLIK) });
          return;
        }
        // tidak ada titik: garis/poligon (kabel, ALKI, ZEE, ...) yang kena
        const f = kandidat[0];
        if (!f) {
          pilih(null);
          return;
        }
        pilih({ lapisan: LAYER_INTERAKTIF[f.layer.id], props: f.properties as Record<string, unknown>, lon: e.lngLat.lng, lat: e.lngLat.lat });
      });
      m.on("mousemove", (e: MapMouseEvent) => {
        const ids = Object.keys(LAYER_INTERAKTIF).filter((id) => m.getLayer(id));
        const r = TOLERANSI_KLIK.mouse;
        const ada = Boolean(kanvas.current?.cari(e.point.x, e.point.y, 12)) || m.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers: ids }).length > 0;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function terapkanSat(m: MapLibre, on: boolean) {
    if (!m.getLayer(ID_LAYER_SAT)) return;
    m.setLayoutProperty(ID_LAYER_SAT, "visibility", on ? "visible" : "none");
    for (const id of layerSatTersembunyi.current) if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", on ? "none" : "visible");
  }

  // boot selesai -> terbang ke tampilan awal / URL, lalu panduan singkat (sekali)
  const selesaiBoot = useCallback(() => {
    if (!bootRef.current) return;
    setBoot(false);
    const m = mapRef.current;
    const t: Tampilan = awalUrl.tampilan ?? tampilanAwal();
    const terbang = () => {
      mapRef.current?.flyTo({ center: [t.lon, t.lat], zoom: t.zoom, bearing: t.bearing, pitch: t.pitch, duration: 4200, essential: true, curve: 1.3 });
    };
    if (m && petaSudahLoad.current) terbang();
    else petaSiapCallback.current = terbang;
    if (!panduanSudahDilihat() && !awalUrl.pilih) setTimeout(() => setPanduan(true), 2600);
  }, [awalUrl]);

  // pilihan dari URL setelah data siap
  useEffect(() => {
    if (!siap || !awalUrl.pilih) return;
    const e = indeks.current.find((x) => x.id === awalUrl.pilih);
    if (e) pilih({ lapisan: e.lapisan, props: e.props, lon: e.lon, lat: e.lat });
  }, [siap, awalUrl, pilih]);

  // ---------- aksi ----------
  const toggleLapisan = useCallback(
    (id: LayerId) => {
      // mengubah lapisan saat simulasi = interupsi; tetapi lapisan baru pengguna tetap dihormati
      if (simulasiRef.current || tourRef.current >= 0) {
        const pulih = lapisanSebelum.current ? new Set(lapisanSebelum.current) : new Set(aktifRef.current);
        if (pulih.has(id)) pulih.delete(id);
        else pulih.add(id);
        lapisanSebelum.current = pulih;
        hentikanSimulasi("interupsi");
        if (pulih.has(id) && LAPISAN.find((l) => l.id === id)?.jenis === "live") mulaiLive(id);
        return;
      }
      setAktif((a) => {
        const b = new Set(a);
        if (b.has(id)) b.delete(id);
        else b.add(id);
        const m = mapRef.current;
        if (m && petaSudahLoad.current) setVisibilitas(m, id, b.has(id));
        if (b.has(id) && LAPISAN.find((l) => l.id === id)?.jenis === "live") mulaiLive(id);
        return b;
      });
    },
    [mulaiLive, hentikanSimulasi],
  );

  const toggleSat = useCallback(() => {
    setSat((s) => {
      const m = mapRef.current;
      if (m) terapkanSat(m, !s);
      return !s;
    });
  }, []);

  const toggleDatar = useCallback(() => {
    setDatar((d) => {
      mapRef.current?.setProjection({ type: d ? "globe" : "mercator" });
      return !d;
    });
  }, []);

  const toggleLang = useCallback(() => {
    setLang((l) => {
      const b: Lang = l === "id" ? "en" : "id";
      simpanLang(b);
      return b;
    });
  }, []);

  /** Reset: tampilan awal + lapisan bawaan (ramai tapi ringan), simulasi/briefing dihentikan. */
  const reset = useCallback(() => {
    if (simulasiRef.current || tourRef.current >= 0) {
      lapisanSebelum.current = new Set(LAPISAN_BAWAAN);
      hentikanSimulasi("selesai");
      return;
    }
    pilih(null);
    const bawaan = new Set(LAPISAN_BAWAAN);
    setAktif(bawaan);
    for (const id of bawaan) if (LAPISAN.find((l) => l.id === id)?.jenis === "live") mulaiLive(id);
    const awal = tampilanAwal();
    mapRef.current?.flyTo({ center: [awal.lon, awal.lat], zoom: awal.zoom, pitch: 0, bearing: 0, duration: 2500, essential: true });
  }, [pilih, hentikanSimulasi, mulaiLive]);

  const bagikan = useCallback(async () => {
    simpanUrl();
    try {
      await navigator.clipboard.writeText(window.location.href);
      tampilkanToast(terjemah(lang, "copied"));
    } catch {
      tampilkanToast(window.location.href);
    }
  }, [lang, simpanUrl, tampilkanToast]);

  const fullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }, []);

  // ---------- jadwal lintasan satelit ----------
  const hitungJadwal = useCallback(() => {
    const s = satelit.current;
    if (!s || !s.daftar.length) return;
    if (!penjadwal.current) penjadwal.current = new PenjadwalLintasan();
    setHitungLintasan(true);
    penjadwal.current.hitung(s.daftar.map((a) => a.meta), 12).then((h) => {
      setHitungLintasan(false);
      if (h) setLintasan({ daftar: h.lintasan, sekarang: h.sekarang, dihitung: h.dihitung });
    });
  }, []);

  const bukaJadwal = useCallback(() => {
    setJadwal((j) => {
      if (!j) {
        if (!aktifRef.current.has("satelit")) toggleLapisan("satelit");
        const segar = !lintasan || Date.now() - lintasan.dihitung > 15 * 60_000;
        if (segar) setTimeout(hitungJadwal, satelit.current?.daftar.length ? 0 : 1500);
      }
      return !j;
    });
  }, [lintasan, hitungJadwal, toggleLapisan]);

  // ---------- ekspor ----------
  const eksporMd = useCallback(() => {
    const sk = simulasiRef.current ? skenarioDariId(simulasiRef.current.id) : null;
    if (!sk) return;
    unduhTeks(skenarioKeMarkdown(sk, lang), `eye-of-garuda-${sk.id}-${lang}.md`);
  }, [lang]);

  const eksporPng = useCallback(async () => {
    const m = mapRef.current;
    if (!m) return;
    const sk = simulasiRef.current ? skenarioDariId(simulasiRef.current.id) : null;
    const judul = sk ? `${sk.judul[lang]} · ${terjemah(lang, "scenario_fictional")}` : "EYE OF GARUDA";
    const ok = await fotoPng(m, kanvas.current?.canvas ?? null, `eye-of-garuda-${sk?.id ?? "view"}.png`, `${judul} · eye-of-garuda.vercel.app`);
    if (!ok) tampilkanToast(terjemah(lang, "export_png_failed"));
  }, [lang, tampilkanToast]);

  const toggleRekam = useCallback(async () => {
    const m = mapRef.current;
    if (!m) return;
    if (perekam.current?.aktif) {
      const b = await perekam.current.berhenti();
      setMerekam(false);
      if (b) unduhBlob(b, `eye-of-garuda-${simulasiRef.current?.id ?? "rekaman"}.${perekam.current.ekstensi}`);
      return;
    }
    const sk = simulasiRef.current ? skenarioDariId(simulasiRef.current.id) : null;
    perekam.current = new Perekam(m, kanvas.current?.canvas ?? null, `${sk?.judul[lang] ?? "EYE OF GARUDA"} · ${terjemah(lang, "scenario_fictional")} · eye-of-garuda.vercel.app`);
    if (perekam.current.mulai()) setMerekam(true);
    else tampilkanToast(terjemah(lang, "export_rec_unsupported"));
  }, [lang, tampilkanToast]);

  // keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // hanya kolom teks yang "memakan" pintasan; slider/checkbox yang masih fokus tidak boleh mematikan keyboard
      const mengetik = target && (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && !["range", "checkbox", "radio", "button"].includes((target as HTMLInputElement).type)));
      if (mengetik) {
        if (e.key === "Escape") {
          setPanel("none");
          target.blur();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPanel((p) => (p === "cari" ? "none" : "cari"));
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key) {
        case "Escape":
          if (bootRef.current) selesaiBoot();
          else if (panduan) setPanduan(false);
          else if (pilihSkenario) setPilihSkenario(false);
          else if (jadwal) setJadwal(false);
          else if (panel !== "none") setPanel("none");
          else if (tourRef.current >= 0 || simulasiRef.current) hentikanSimulasi("stop");
          else pilih(null);
          break;
        case "?":
          setPanel((p) => (p === "bantuan" ? "none" : "bantuan"));
          break;
        case "/":
        case "k":
          e.preventDefault();
          setPanel("cari");
          break;
        case "f":
          fullscreen();
          break;
        case "r":
          reset();
          break;
        case "t":
          toggleTour();
          break;
        case "w":
          toggleSkenario();
          break;
        case "o":
          bukaJadwal();
          break;
        case "l":
          toggleLang();
          break;
        case "s":
          toggleSat();
          break;
        case "g":
          toggleDatar();
          break;
        case "d":
          setPanel((p) => (p === "data" ? "none" : "data"));
          break;
        case "c":
          setObrolan((o) => !o);
          break;
        default: {
          const l = lapisanDariTombol(e);
          if (l && tersedia.has(l.id)) toggleLapisan(l.id);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [panel, panduan, pilihSkenario, jadwal, tersedia, selesaiBoot, pilih, fullscreen, reset, toggleTour, toggleSkenario, bukaJadwal, toggleLang, toggleSat, toggleDatar, toggleLapisan, hentikanSimulasi]);

  // ---------- turunan ----------
  const jumlahEntitas = useMemo(() => [...aktif].reduce((n, id) => n + (jumlah[id] ?? 0), 0), [aktif, jumlah]);
  const tickerItem = useMemo(() => {
    const t: string[] = [];
    if (jumlah.tni != null) t.push(terjemah(lang, "ticker_bases", { n: jumlah.tni, m: jumlah.asing ?? 0 }));
    if (aktif.has("pesawat")) t.push(terjemah(lang, "ticker_aircraft", { n: live.pesawat.jumlah }) + (live.pesawat.galat ? ` (${live.pesawat.galat})` : ""));
    if (aktif.has("satelit")) t.push(terjemah(lang, "ticker_sats", { n: live.satelit.jumlah }));
    if (aktif.has("kapal")) {
      const umur = live.kapal.umurMenit;
      t.push(
        terjemah(lang, "ticker_ships", { n: live.kapal.jumlah }) +
          (live.kapal.live ? ` · ${live.kapal.live} ${terjemah(lang, "ticker_ships_live")}` : "") +
          (umur != null ? ` · ${umur === 0 ? terjemah(lang, "updated_now") : terjemah(lang, "updated_ago", { n: umur })}` : ` · ${terjemah(lang, "no_snapshot")}`),
      );
    }
    if (jumlah.kapalselam != null) t.push(terjemah(lang, "ticker_subs", { n: jumlah.kapalselam }));
    if (jumlah.kabel != null) t.push(terjemah(lang, "ticker_cables", { n: jumlah.kabel }));
    t.push(terjemah(lang, "aircraft_caveat"));
    t.push(terjemah(lang, "disclaimer"));
    return t;
  }, [lang, jumlah, aktif, live]);

  const skenarioAktif = simulasi ? skenarioDariId(simulasi.id) ?? null : null;
  const sibukLayar = tour >= 0 || simulasi !== null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <div ref={wadah} className="h-full w-full" />
      </div>
      <div className="vinyet" />
      <div className="pindai" />

      {boot && <BootScreen lang={lang} onSelesai={selesaiBoot} />}

      <Hud
        lang={lang}
        jumlahLapisanAktif={aktif.size}
        jumlahLapisan={LAPISAN.length}
        jumlahEntitas={jumlahEntitas}
        sat={sat}
        datar={datar}
        tourAktif={tour >= 0}
        online={online}
        onToggleSat={toggleSat}
        onToggleDatar={toggleDatar}
        onToggleLang={toggleLang}
        onCari={() => setPanel("cari")}
        onBantuan={() => setPanel("bantuan")}
        onTour={toggleTour}
        onBagikan={bagikan}
        onData={() => setPanel("data")}
        onFullscreen={fullscreen}
        onReset={reset}
        onSkenario={toggleSkenario}
        skenarioAktif={simulasi !== null || pilihSkenario}
        onLintasan={bukaJadwal}
      />

      <LayerRail lang={lang} aktif={aktif} jumlah={jumlah} onToggle={toggleLapisan} tersedia={tersedia} />
      {!sibukLayar && <LayerChips lang={lang} aktif={aktif} onToggle={toggleLapisan} tersedia={tersedia} />}

      {/* jam untuk layar kecil */}
      <div className="glass pointer-events-auto absolute left-2 top-[66px] z-20 px-2 py-1 md:hidden">
        <JamZulu lang={lang} />
      </div>

      {/* opsi cakupan pesawat */}
      {aktif.has("pesawat") && !sibukLayar && (
        <div className="glass pointer-events-auto absolute right-2 top-[82px] z-20 flex items-center gap-1 p-1 sm:right-3 sm:top-[92px] max-sm:hidden">
          <span className="label-kecil px-1">{terjemah(lang, "aircraft_scope")}</span>
          <button className={`tombol-hud ${cakupan === "kawasan" ? "aktif" : ""}`} onClick={() => setCakupan("kawasan")}>
            {terjemah(lang, "scope_region")}
          </button>
          <button className={`tombol-hud ${cakupan === "dunia" ? "aktif" : ""}`} onClick={() => setCakupan("dunia")}>
            {terjemah(lang, "scope_world")}
          </button>
        </div>
      )}

      {pilihanKlik && !sibukLayar && (
        <PilihObjek
          lang={lang}
          x={pilihanKlik.x}
          y={pilihanKlik.y}
          lebar={wadah.current?.clientWidth ?? window.innerWidth}
          tinggi={wadah.current?.clientHeight ?? window.innerHeight}
          daftar={pilihanKlik.daftar}
          sisa={pilihanKlik.sisa}
          onPilih={(p) => {
            setPilihanKlik(null);
            pilih(p);
          }}
          onTutup={() => setPilihanKlik(null)}
        />
      )}

      {pilihan && !sibukLayar && <DetailPanel lang={lang} pilihan={pilihan} onTutup={() => pilih(null)} onTerbang={(lon, lat) => mapRef.current?.flyTo({ center: [lon, lat], zoom: Math.max(mapRef.current.getZoom(), 7), duration: 1500 })} />}

      {pilihSkenario && <SkenarioPicker lang={lang} onPilih={mulaiSimulasi} onTutup={() => setPilihSkenario(false)} />}

      {simulasi && skenarioAktif && (
        <SkenarioOverlay
          lang={lang}
          skenario={skenarioAktif}
          fase={simulasi.fase}
          mulaiFase={simulasi.mulaiFase}
          merekam={merekam}
          bisaRekam={bisaMerekam()}
          onStop={() => hentikanSimulasi("stop")}
          onLanjut={() => setSimulasi((s) => (s ? { ...s, fase: Math.min(skenarioAktif.fase.length - 1, s.fase + 1), mulaiFase: Date.now() } : s))}
          onMundur={() => setSimulasi((s) => (s ? { ...s, fase: Math.max(0, s.fase - 1), mulaiFase: Date.now() } : s))}
          onUlang={() => setSimulasi((s) => (s ? { ...s, fase: 0, mulaiFase: Date.now() } : s))}
          onEksporMd={eksporMd}
          onEksporPng={eksporPng}
          onRekam={toggleRekam}
        />
      )}

      {tour >= 0 && <TourOverlay lang={lang} langkah={tour} onStop={() => hentikanSimulasi("stop")} onLanjut={() => (tour + 1 < TOUR.length ? setTour(tour + 1) : hentikanSimulasi("selesai"))} />}

      {aktif.has("insiden") && insiden && !sibukLayar && (
        <TimelineStrip
          lang={lang}
          data={insiden}
          terpilih={pilihan?.lapisan === "insiden" ? String(pilihan.props.id) : null}
          onPilih={(f) => {
            const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates;
            pilih({ lapisan: "insiden", props: (f.properties ?? {}) as Record<string, unknown>, lon, lat }, true);
          }}
        />
      )}
      {aktif.has("sipri") && sipri && !sibukLayar && !pilihan && !obrolan && (
        <SipriLegend
          lang={lang}
          data={sipri}
          onPilih={(negara) => {
            const e = indeks.current.find((x) => x.lapisan === "sipri" && x.props.negara === negara);
            if (e) pilih({ lapisan: e.lapisan, props: e.props, lon: e.lon, lat: e.lat }, false);
          }}
        />
      )}

      {!boot && !sibukLayar && (
        <ChatWidget
          lang={lang}
          terbuka={obrolan}
          onToggle={() => setObrolan((o) => !o)}
          indeks={indeks.current}
          aktif={aktif}
          jumlah={jumlah}
          pilihan={pilihan}
          onLapisan={(id) => {
            if (!aktif.has(id)) toggleLapisan(id);
          }}
          onTerbang={(e) => {
            if (!aktif.has(e.lapisan)) toggleLapisan(e.lapisan);
            pilih({ lapisan: e.lapisan, props: e.props, lon: e.lon, lat: e.lat }, true);
            setObrolan(false);
          }}
        />
      )}

      <Ticker lang={lang} item={tickerItem} />

      {panel === "cari" && (
        <SearchPalette
          lang={lang}
          indeks={indeks.current}
          onTutup={() => setPanel("none")}
          onPilih={(e) => {
            setPanel("none");
            if (!aktif.has(e.lapisan)) toggleLapisan(e.lapisan);
            pilih({ lapisan: e.lapisan, props: e.props, lon: e.lon, lat: e.lat }, true);
          }}
        />
      )}
      {panel === "bantuan" && (
        <HelpOverlay
          lang={lang}
          onTutup={() => setPanel("none")}
          onPanduan={() => {
            setPanel("none");
            setPanduan(true);
          }}
        />
      )}
      {panel === "data" && <DataPanel lang={lang} onTutup={() => setPanel("none")} />}
      {jadwal && (
        <JadwalSatelit
          lang={lang}
          lintasan={lintasan?.daftar ?? null}
          sekarang={lintasan?.sekarang ?? []}
          dihitung={lintasan?.dihitung ?? null}
          sedangHitung={hitungLintasan}
          lapisanAktif={aktif.has("satelit")}
          onTutup={() => setJadwal(false)}
          onHitung={hitungJadwal}
          onPilih={(norad) => {
            const s = satelit.current?.cari(norad);
            if (!s || !satelit.current) return;
            setJadwal(false);
            pilih({ lapisan: "satelit", props: satelit.current.info(s), lon: s.pos?.lon ?? 0, lat: s.pos?.lat ?? 0 }, true);
          }}
        />
      )}

      {panduan && !boot && <Onboarding lang={lang} onSelesai={() => setPanduan(false)} />}

      {toast && <div className="glass muncul pointer-events-none absolute left-1/2 top-[120px] z-50 -translate-x-1/2 px-4 py-2 text-[12px] text-text">{toast}</div>}
    </div>
  );
}

