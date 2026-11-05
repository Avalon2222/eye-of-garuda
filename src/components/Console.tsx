"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Map as MapLibre, setWorkerUrl, type MapMouseEvent } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { bangunStyle, ID_LAYER_SAT, layerBasemapTersembunyiSaatSat } from "@/lib/mapStyle";
import { pasangSemuaLapisan, setVisibilitas, setDataSource, LAYER_INTERAKTIF } from "@/lib/mapLayers";
import { LAPISAN, type LayerId } from "@/lib/layers";
import { bacaUrl, tulisUrl, TAMPILAN_AWAL, type Tampilan } from "@/lib/urlState";
import { terjemah, bacaLangTersimpan, simpanLang, type Lang } from "@/lib/i18n";
import { TOUR } from "@/lib/tour";
import { PelacakPesawat, type CakupanPesawat } from "@/lib/live/pesawat";
import { PelacakSatelit } from "@/lib/live/satelit";
import { PelacakKapal } from "@/lib/live/kapal";
import { muatAnalisis } from "@/lib/analisis";
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

const TAMPILAN_JAUH = { center: [118, -2] as [number, number], zoom: 1.3, pitch: 0, bearing: 0 };
const KOSONG: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

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
  const sub = String(p.jenis ?? p.operator ?? p.kategori ?? p.kelompok ?? p.tanggal ?? p.pesawat ?? "");
  return { id: String(p.id ?? `${lapisan}-${nama}`), lapisan, nama, sub, lon, lat, props: p };
}

export default function Console() {
  const awalUrl = useMemo(() => bacaUrl(), []);
  const [lang, setLang] = useState<Lang>(() => awalUrl.lang ?? bacaLangTersimpan());
  const [aktif, setAktif] = useState<Set<LayerId>>(() => new Set(awalUrl.lapisan ?? LAPISAN.filter((l) => l.aktifAwal).map((l) => l.id)));
  const [sat, setSat] = useState(Boolean(awalUrl.sat));
  const [datar, setDatar] = useState(Boolean(awalUrl.datar));
  const [boot, setBoot] = useState(true);
  const [siap, setSiap] = useState(false);
  const [pilihan, setPilihan] = useState<Pilihan | null>(null);
  const [panel, setPanel] = useState<PanelId>("none");
  const [tour, setTour] = useState(-1);
  const [jumlah, setJumlah] = useState<Partial<Record<LayerId, number>>>({});
  const [tersedia, setTersedia] = useState<Set<LayerId>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [cakupan, setCakupan] = useState<CakupanPesawat>("kawasan");
  const [live, setLive] = useState<StatusLive>({
    pesawat: { jumlah: 0, totalDunia: 0, galat: null, terakhir: 0 },
    satelit: { jumlah: 0, epoch: "", galat: null },
    kapal: { jumlah: 0, umurMenit: null, galat: null },
  });

  const wadah = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre | null>(null);
  const dataStatis = useRef(new Map<LayerId, GeoJSON.FeatureCollection>());
  const indeks = useRef<EntriCari[]>([]);
  const aktifRef = useRef(aktif);
  aktifRef.current = aktif;
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const pesawat = useRef<PelacakPesawat | null>(null);
  const satelit = useRef<PelacakSatelit | null>(null);
  const kapal = useRef<PelacakKapal | null>(null);
  const pilihanRef = useRef(pilihan);
  pilihanRef.current = pilihan;
  const layerSatTersembunyi = useRef<string[]>([]);
  const bootRef = useRef(boot);
  bootRef.current = boot;
  const petaSiapCallback = useRef<(() => void) | null>(null);
  const petaSudahLoad = useRef(false);

  const tampilkanToast = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1800);
  }, []);

  // ---------- URL ----------
  const simpanUrl = useCallback(() => {
    const m = mapRef.current;
    if (!m || bootRef.current) return;
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

  // ---------- pilih entitas ----------
  const pilih = useCallback((p: Pilihan | null, terbang = false) => {
    setPilihan(p);
    const m = mapRef.current;
    if (!m) return;
    setDataSource(m, "pilihan", p ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lon, p.lat] } }] } : KOSONG);
    if (p?.lapisan === "satelit" && satelit.current) {
      setDataSource(m, "satelit-lintasan", satelit.current.lintasan(Number(p.props.norad), new Date()));
    } else if (m.getSource("satelit-lintasan")) {
      setDataSource(m, "satelit-lintasan", KOSONG);
    }
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
      const an = await muatAnalisis(m, dataStatis.current.get("tni") ?? KOSONG);
      for (const [id, fc] of Object.entries(an)) {
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
        s.muat().then(() => {
          setLive((st) => ({ ...st, satelit: { jumlah: s.jumlah, epoch: s.katalog?.epoch_tle ?? "", galat: s.galat } }));
          setJumlah((j) => ({ ...j, satelit: s.jumlah }));
        });
      }
      if (id === "kapal" && !kapal.current) {
        const k = new PelacakKapal();
        kapal.current = k;
        const muat = () =>
          k.muat().then(() => {
            setLive((st) => ({ ...st, kapal: { jumlah: k.jumlah, umurMenit: k.umurMenit(Date.now()), galat: k.galat } }));
            setJumlah((j) => ({ ...j, kapal: k.jumlah }));
          });
        muat();
        const idInt = setInterval(muat, 5 * 60_000);
        (k as unknown as { stop: () => void }).stop = () => clearInterval(idInt);
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

  // loop animasi: pesawat tiap frame, satelit tiap 250 ms, kapal tiap 2 s
  useEffect(() => {
    let raf = 0;
    let tSat = 0, tKapal = 0, tStatus = 0;
    const tik = () => {
      const m = mapRef.current;
      const now = Date.now();
      if (m && m.isStyleLoaded()) {
        const a = aktifRef.current;
        if (a.has("pesawat") && pesawat.current) {
          const { titik, jejak } = pesawat.current.hitung(now);
          setDataSource(m, "pesawat", titik);
          setDataSource(m, "pesawat-jejak", jejak);
        }
        if (a.has("satelit") && satelit.current && now - tSat > 250) {
          tSat = now;
          setDataSource(m, "satelit", satelit.current.hitung(new Date(now)));
        }
        if (a.has("kapal") && kapal.current && now - tKapal > 2000) {
          tKapal = now;
          setDataSource(m, "kapal", kapal.current.hitung(now));
        }
        if (now - tStatus > 30_000 && kapal.current) {
          tStatus = now;
          const k = kapal.current;
          setLive((s) => ({ ...s, kapal: { ...s.kapal, umurMenit: k.umurMenit(now) } }));
        }
      }
      raf = requestAnimationFrame(tik);
    };
    raf = requestAnimationFrame(tik);
    return () => cancelAnimationFrame(raf);
  }, []);

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
        canvasContextAttributes: { antialias: true },
      });
      mapRef.current = m;
      (window as unknown as { __eog?: MapLibre }).__eog = m;
      m.on("load", () => {
        petaSudahLoad.current = true;
        pasangSemuaLapisan(m);
        for (const l of LAPISAN) setVisibilitas(m, l.id, aktifRef.current.has(l.id));
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
      m.on("dragstart", () => {
        if (tourRef.current >= 0) setTour(-1);
      });
      m.on("click", (e: MapMouseEvent) => {
        const ids = Object.keys(LAYER_INTERAKTIF).filter((id) => m.getLayer(id));
        const f = m.queryRenderedFeatures(e.point, { layers: ids })[0];
        if (!f) {
          pilih(null);
          return;
        }
        const lapisan = LAYER_INTERAKTIF[f.layer.id];
        const g = f.geometry;
        const [lon, lat] = g.type === "Point" ? (g.coordinates as [number, number]) : [e.lngLat.lng, e.lngLat.lat];
        pilih({ lapisan, props: f.properties as Record<string, unknown>, lon, lat });
      });
      m.on("mousemove", (e: MapMouseEvent) => {
        const ids = Object.keys(LAYER_INTERAKTIF).filter((id) => m.getLayer(id));
        const ada = m.queryRenderedFeatures(e.point, { layers: ids }).length > 0;
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

  // boot selesai -> terbang ke tampilan awal / URL
  const selesaiBoot = useCallback(() => {
    if (!bootRef.current) return;
    setBoot(false);
    const m = mapRef.current;
    const t: Tampilan = awalUrl.tampilan ?? TAMPILAN_AWAL;
    const terbang = () => {
      mapRef.current?.flyTo({ center: [t.lon, t.lat], zoom: t.zoom, bearing: t.bearing, pitch: t.pitch, duration: 4200, essential: true, curve: 1.3 });
    };
    if (m && petaSudahLoad.current) terbang();
    else petaSiapCallback.current = terbang;
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
      setAktif((a) => {
        const b = new Set(a);
        if (b.has(id)) b.delete(id);
        else b.add(id);
        const m = mapRef.current;
        if (m?.isStyleLoaded()) setVisibilitas(m, id, b.has(id));
        if (b.has(id) && LAPISAN.find((l) => l.id === id)?.jenis === "live") mulaiLive(id);
        return b;
      });
    },
    [mulaiLive],
  );

  const toggleSat = useCallback(() => {
    setSat((s) => {
      const m = mapRef.current;
      if (m) terapkanSat(m, !s);
      return !s;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const reset = useCallback(() => {
    pilih(null);
    mapRef.current?.flyTo({ center: [TAMPILAN_AWAL.lon, TAMPILAN_AWAL.lat], zoom: TAMPILAN_AWAL.zoom, pitch: 0, bearing: 0, duration: 2500, essential: true });
  }, [pilih]);

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

  const toggleTour = useCallback(() => setTour((t) => (t >= 0 ? -1 : 0)), []);

  // jalankan langkah tour
  useEffect(() => {
    if (tour < 0) return;
    const m = mapRef.current;
    const l = TOUR[tour];
    if (!m || !l) {
      setTour(-1);
      return;
    }
    pilih(null);
    setPanel("none");
    if (l.nyalakan) {
      setAktif((a) => {
        const b = new Set(a);
        for (const id of l.nyalakan!) {
          if (!tersedia.has(id) && LAPISAN.find((x) => x.id === id)?.jenis !== "live") continue;
          if (!b.has(id)) {
            b.add(id);
            setVisibilitas(m, id, true);
            if (LAPISAN.find((x) => x.id === id)?.jenis === "live") mulaiLive(id);
          }
        }
        return b;
      });
    }
    m.flyTo({ center: l.center, zoom: l.zoom, pitch: l.pitch, bearing: l.bearing, duration: l.durasiTerbang, essential: true, curve: 1.2 });
    const id = setTimeout(() => setTour((t) => (t === tour ? (tour + 1 < TOUR.length ? tour + 1 : -1) : t)), l.durasiTerbang + l.tahan);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour]);

  // keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        if (e.key === "Escape") setPanel("none");
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
          else if (panel !== "none") setPanel("none");
          else if (tourRef.current >= 0) setTour(-1);
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
        default: {
          const l = LAPISAN.find((x) => x.tombol === e.key);
          if (l && tersedia.has(l.id)) toggleLapisan(l.id);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [panel, tersedia, selesaiBoot, pilih, fullscreen, reset, toggleTour, toggleLang, toggleSat, toggleDatar, toggleLapisan]);

  // ---------- turunan ----------
  const jumlahEntitas = useMemo(() => [...aktif].reduce((n, id) => n + (jumlah[id] ?? 0), 0), [aktif, jumlah]);
  const tickerItem = useMemo(() => {
    const t: string[] = [];
    if (jumlah.tni != null) t.push(terjemah(lang, "ticker_bases", { n: jumlah.tni, m: jumlah.asing ?? 0 }));
    if (aktif.has("pesawat")) t.push(terjemah(lang, "ticker_aircraft", { n: live.pesawat.jumlah }) + (live.pesawat.galat ? ` (${live.pesawat.galat})` : ""));
    if (aktif.has("satelit")) t.push(terjemah(lang, "ticker_sats", { n: live.satelit.jumlah }));
    if (aktif.has("kapal")) {
      const umur = live.kapal.umurMenit;
      t.push(terjemah(lang, "ticker_ships", { n: live.kapal.jumlah }) + (umur != null ? ` · ${umur === 0 ? terjemah(lang, "updated_now") : terjemah(lang, "updated_ago", { n: umur })}` : ` · ${terjemah(lang, "no_snapshot")}`));
    }
    if (jumlah.kabel != null) t.push(terjemah(lang, "ticker_cables", { n: jumlah.kabel }));
    t.push(terjemah(lang, "aircraft_caveat"));
    t.push(terjemah(lang, "disclaimer"));
    return t;
  }, [lang, jumlah, aktif, live]);

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
      />

      <LayerRail lang={lang} aktif={aktif} jumlah={jumlah} onToggle={toggleLapisan} tersedia={tersedia} />
      <LayerChips lang={lang} aktif={aktif} onToggle={toggleLapisan} tersedia={tersedia} />

      {/* jam untuk layar kecil */}
      <div className="glass pointer-events-auto absolute left-2 top-[62px] z-20 px-2 py-1 md:hidden">
        <JamZulu lang={lang} />
      </div>

      {/* opsi cakupan pesawat */}
      {aktif.has("pesawat") && (
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

      {pilihan && tour < 0 && <DetailPanel lang={lang} pilihan={pilihan} onTutup={() => pilih(null)} onTerbang={(lon, lat) => mapRef.current?.flyTo({ center: [lon, lat], zoom: Math.max(mapRef.current.getZoom(), 7), duration: 1500 })} />}

      {tour >= 0 && <TourOverlay lang={lang} langkah={tour} onStop={() => setTour(-1)} onLanjut={() => setTour((t) => (t + 1 < TOUR.length ? t + 1 : -1))} />}

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
      {panel === "bantuan" && <HelpOverlay lang={lang} onTutup={() => setPanel("none")} />}
      {panel === "data" && <DataPanel lang={lang} onTutup={() => setPanel("none")} />}

      {toast && <div className="glass muncul pointer-events-none absolute left-1/2 top-[120px] z-50 -translate-x-1/2 px-4 py-2 text-[12px] text-text">{toast}</div>}
    </div>
  );
}
