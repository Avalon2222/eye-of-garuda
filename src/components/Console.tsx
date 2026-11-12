"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { setVisibilitas, sinkronVisibilitas, setDataSource, sorotPilihan, pakaiCincin, ZOOM_SATUAN_BAWAH } from "@/lib/mapLayers";
import { LAPISAN, LAPISAN_BAWAAN, type LayerId } from "@/lib/layers";
import { bacaUrl, tampilanAwal, type Tampilan } from "@/lib/urlState";
import { terjemah, bacaLangTersimpan, simpanLang, type Lang } from "@/lib/i18n";
import { TOUR } from "@/lib/tour";
import { skenarioDariId } from "@/lib/skenario";
import { bisaMerekam } from "@/lib/ekspor";
import type { Pilihan, PanelId } from "@/lib/types";
import type { KanvasLive } from "@/lib/kanvasLive";
import BootScreen from "./BootScreen";
import Hud, { JamZulu } from "./Hud";
import LayerRail, { LayerChips } from "./LayerRail";
import DetailPanel from "./DetailPanel";
import Ticker from "./Ticker";
import SearchPalette from "./SearchPalette";
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
import KontrolCakupan from "./konsol/KontrolCakupan";
import { KOSONG, lapisanLive, type PilihanKlik } from "./konsol/jenis";
import { useTerbaru } from "./konsol/useTerbaru";
import { usePeta, type PenanganPeta } from "./konsol/usePeta";
import { useDataStatis } from "./konsol/useDataStatis";
import { useLive } from "./konsol/useLive";
import { useLoopAnimasi } from "./konsol/useLoopAnimasi";
import { useSimulasi } from "./konsol/useSimulasi";
import { useEkspor } from "./konsol/useEkspor";
import { useJadwalSatelit } from "./konsol/useJadwalSatelit";
import { useKlikPeta } from "./konsol/useKlikPeta";
import { useKeyboard } from "./konsol/useKeyboard";
import { useUrl } from "./konsol/useUrl";

/**
 * Konsol utama: merakit peta, lapisan, data live, simulasi, dan semua panel.
 * Logika per bagian ada di hook-hook kecil di ./konsol; komponen ini hanya menyimpan state
 * yang dipakai lintas bagian dan menyusun tampilannya.
 */
export default function Console() {
  const awalUrl = useMemo(() => bacaUrl(), []);
  const [lang, setLang] = useState<Lang>(() => awalUrl.lang ?? bacaLangTersimpan());
  const [aktif, setAktif] = useState<Set<LayerId>>(() => new Set(awalUrl.lapisan ?? LAPISAN_BAWAAN));
  const [sat, setSat] = useState(Boolean(awalUrl.sat));
  const [datar, setDatar] = useState(Boolean(awalUrl.datar));
  const [boot, setBoot] = useState(true);
  const [pilihan, setPilihan] = useState<Pilihan | null>(null);
  const [pilihanKlik, setPilihanKlik] = useState<PilihanKlik | null>(null);
  const [panel, setPanel] = useState<PanelId>("none");
  const [obrolan, setObrolan] = useState(false);
  const [panduan, setPanduan] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const aktifRef = useTerbaru(aktif);
  const langRef = useTerbaru(lang);
  const satRef = useTerbaru(sat);
  const datarRef = useTerbaru(datar);
  const pilihanRef = useTerbaru(pilihan);
  const bootRef = useTerbaru(boot);
  const mapRef = useRef<MapLibre | null>(null);
  const kanvasRef = useRef<KanvasLive | null>(null);
  /** dipanggil sekali saat peta idle pertama kali setelah load (terbang dari layar boot) */
  const petaSiapRef = useRef<(() => void) | null>(null);
  /** lapisan pengguna sebelum simulasi/briefing, dipulihkan saat selesai atau diinterupsi */
  const lapisanSebelumRef = useRef<Set<LayerId> | null>(null);
  const penanganRef = useRef<PenanganPeta>({ saatLoad() {}, saatMoveEnd() {}, saatMoveStart() {}, saatInterupsi() {}, saatKlik() {} });

  const tampilkanToast = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2200);
  }, []);

  // ---------- peta, data, live ----------
  const { indeks, jumlah, setJumlah, tersedia, sipri, insiden, muatLapisanStatis } = useDataStatis(kanvasRef);
  const { pesawatRef, satelitRef, kapalRef, live, setLive, cakupan, setCakupan, mulaiLive } = useLive({ mapRef, kanvasRef, setJumlah });
  const { wadahRef, petaSudahLoadRef, online, terapkanSat } = usePeta({ mapRef, kanvasRef, petaSiapRef, aktifRef, langRef, satRef, datarRef, pesawatRef, satelitRef, penanganRef });
  useLoopAnimasi({ mapRef, kanvasRef, petaSudahLoadRef, aktifRef, pilihanRef, pesawatRef, satelitRef, kapalRef, setPilihan, setLive });

  // visibilitas lapisan: selalu disinkronkan dengan state (anti "bandel")
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !petaSudahLoadRef.current) return;
    sinkronVisibilitas(m, aktif);
  }, [aktif, mapRef, petaSudahLoadRef]);

  useEffect(() => {
    if (kanvasRef.current) kanvasRef.current.lang = lang;
  }, [lang, kanvasRef]);

  // ---------- pilih entitas ----------
  const pilih = useCallback(
    (p: Pilihan | null, terbang = false) => {
      setPilihan(p);
      const m = mapRef.current;
      if (!m) return;
      const id = p ? String(p.props.id ?? "") : "";
      const diKanvas = p?.lapisan === "satelit" || p?.lapisan === "pesawat";
      const cincin = p && !diKanvas && pakaiCincin(p.lapisan, id);
      setDataSource(m, "pilihan", cincin ? { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [p.lon, p.lat] } }] } : KOSONG);
      sorotPilihan(m, p && !cincin && !diKanvas ? p.lapisan : null, id || null);
      if (kanvasRef.current) kanvasRef.current.pilihan = diKanvas && p ? { jenis: p.lapisan as "satelit" | "pesawat", id } : null;
      if (p && terbang) {
        // Kodim/Yonif (peringkat 3) baru kelihatan di zoom dekat, jadi terbang lebih dekat
        const zoomMin = p.lapisan === "satelit" ? 2.5 : p.props.peringkat === 3 ? ZOOM_SATUAN_BAWAH + 1.2 : 6;
        m.flyTo({ center: [p.lon, p.lat], zoom: Math.max(m.getZoom(), zoomMin), duration: 1600, essential: true });
      }
    },
    [mapRef, kanvasRef],
  );

  // ---------- simulasi, briefing, ekspor, jadwal ----------
  const ekspor = useEkspor({ mapRef, kanvasRef, lang, tampilkanToast });
  const sim = useSimulasi({ mapRef, kanvasRef, aktifRef, lapisanSebelumRef, setAktif, tersedia, langRef, mulaiLive, pilih, setPanel, setObrolan, tampilkanToast, hentikanRekam: ekspor.hentikanRekam });
  const { simulasi, setSimulasi, simulasiRef, tour, setTour, tourRef, pilihSkenario, setPilihSkenario, hentikanSimulasi, sibuk } = sim;

  const simpanUrl = useUrl({ mapRef, bootRef, simulasiRef, tourRef, aktifRef, pilihanRef, aktif, pilihan, lang, sat, datar });
  const klikPeta = useKlikPeta({ kanvasRef, satelitRef, pilih, setPilihanKlik });

  // penangan event peta dibaca lewat ref supaya versi terbaru yang dipakai
  useLayoutEffect(() => {
    penanganRef.current = {
      saatLoad(m) {
        muatLapisanStatis(m).then((daftar) => {
          // pilihan dari URL setelah data siap
          if (!awalUrl.pilih) return;
          const e = daftar.find((x) => x.id === awalUrl.pilih);
          if (e) pilih({ lapisan: e.lapisan, props: e.props, lon: e.lon, lat: e.lat });
        });
        for (const id of aktifRef.current) if (lapisanLive(id)) mulaiLive(id);
      },
      saatMoveEnd: simpanUrl,
      saatMoveStart: () => setPilihanKlik(null),
      saatInterupsi: () => void sim.interupsi(),
      saatKlik(m, e) {
        if (sim.interupsi()) return;
        klikPeta(m, e);
      },
    };
  });

  // boot selesai -> terbang ke tampilan awal / URL, lalu panduan singkat (sekali)
  const selesaiBoot = useCallback(() => {
    if (!bootRef.current) return;
    setBoot(false);
    const m = mapRef.current;
    const t: Tampilan = awalUrl.tampilan ?? tampilanAwal();
    const terbang = () => {
      mapRef.current?.flyTo({ center: [t.lon, t.lat], zoom: t.zoom, bearing: t.bearing, pitch: t.pitch, duration: 4200, essential: true, curve: 1.3 });
    };
    if (m && petaSudahLoadRef.current) terbang();
    else petaSiapRef.current = terbang;
    if (!panduanSudahDilihat() && !awalUrl.pilih) setTimeout(() => setPanduan(true), 2600);
  }, [awalUrl, bootRef, mapRef, petaSudahLoadRef]);

  // ---------- aksi ----------
  const toggleLapisan = useCallback(
    (id: LayerId) => {
      // mengubah lapisan saat simulasi = interupsi; tetapi lapisan baru pengguna tetap dihormati
      if (sibuk()) {
        const pulih = lapisanSebelumRef.current ? new Set(lapisanSebelumRef.current) : new Set(aktifRef.current);
        if (pulih.has(id)) pulih.delete(id);
        else pulih.add(id);
        lapisanSebelumRef.current = pulih;
        hentikanSimulasi("interupsi");
        if (pulih.has(id) && lapisanLive(id)) mulaiLive(id);
        return;
      }
      setAktif((a) => {
        const b = new Set(a);
        if (b.has(id)) b.delete(id);
        else b.add(id);
        const m = mapRef.current;
        if (m && petaSudahLoadRef.current) setVisibilitas(m, id, b.has(id));
        if (b.has(id) && lapisanLive(id)) mulaiLive(id);
        return b;
      });
    },
    [sibuk, lapisanSebelumRef, aktifRef, hentikanSimulasi, mulaiLive, mapRef, petaSudahLoadRef],
  );

  const toggleSat = useCallback(() => {
    setSat((s) => {
      const m = mapRef.current;
      if (m) terapkanSat(m, !s);
      return !s;
    });
  }, [mapRef, terapkanSat]);

  const toggleDatar = useCallback(() => {
    setDatar((d) => {
      mapRef.current?.setProjection({ type: d ? "globe" : "mercator" });
      return !d;
    });
  }, [mapRef]);

  const toggleLang = useCallback(() => {
    setLang((l) => {
      const b: Lang = l === "id" ? "en" : "id";
      simpanLang(b);
      return b;
    });
  }, []);

  /** Reset: tampilan awal + lapisan bawaan (ramai tapi ringan), simulasi/briefing dihentikan. */
  const reset = useCallback(() => {
    if (sibuk()) {
      lapisanSebelumRef.current = new Set(LAPISAN_BAWAAN);
      hentikanSimulasi("selesai");
      return;
    }
    pilih(null);
    const bawaan = new Set(LAPISAN_BAWAAN);
    setAktif(bawaan);
    for (const id of bawaan) if (lapisanLive(id)) mulaiLive(id);
    const awal = tampilanAwal();
    mapRef.current?.flyTo({ center: [awal.lon, awal.lat], zoom: awal.zoom, pitch: 0, bearing: 0, duration: 2500, essential: true });
  }, [sibuk, lapisanSebelumRef, pilih, hentikanSimulasi, mulaiLive, mapRef]);

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

  const { jadwal, setJadwal, lintasan, hitungLintasan, hitungJadwal, bukaJadwal } = useJadwalSatelit({ satelitRef, aktifRef, toggleLapisan });

  useKeyboard({
    boot,
    panel,
    panduan,
    pilihSkenario,
    jadwal,
    tersedia,
    sibuk,
    setPanel,
    setPanduan,
    setPilihSkenario,
    setJadwal,
    toggleObrolan: () => setObrolan((o) => !o),
    selesaiBoot,
    batalPilih: () => pilih(null),
    hentikanSimulasi: () => hentikanSimulasi("stop"),
    fullscreen,
    reset,
    toggleTour: sim.toggleTour,
    toggleSkenario: sim.toggleSkenario,
    bukaJadwal,
    toggleLang,
    toggleSat,
    toggleDatar,
    toggleLapisan,
  });

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
        <div ref={wadahRef} className="h-full w-full" />
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
        onTour={sim.toggleTour}
        onBagikan={bagikan}
        onData={() => setPanel("data")}
        onFullscreen={fullscreen}
        onReset={reset}
        onSkenario={sim.toggleSkenario}
        skenarioAktif={simulasi !== null || pilihSkenario}
        onLintasan={bukaJadwal}
      />

      <LayerRail lang={lang} aktif={aktif} jumlah={jumlah} onToggle={toggleLapisan} tersedia={tersedia} />
      {!sibukLayar && <LayerChips lang={lang} aktif={aktif} onToggle={toggleLapisan} tersedia={tersedia} />}

      {/* jam untuk layar kecil */}
      <div className="glass pointer-events-auto absolute left-2 top-[66px] z-20 px-2 py-1 md:hidden">
        <JamZulu lang={lang} />
      </div>

      {aktif.has("pesawat") && !sibukLayar && <KontrolCakupan lang={lang} cakupan={cakupan} onUbah={setCakupan} />}

      {pilihanKlik && !sibukLayar && (
        <PilihObjek
          lang={lang}
          x={pilihanKlik.x}
          y={pilihanKlik.y}
          lebar={pilihanKlik.lebar}
          tinggi={pilihanKlik.tinggi}
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

      {pilihSkenario && <SkenarioPicker lang={lang} onPilih={sim.mulaiSimulasi} onTutup={() => setPilihSkenario(false)} />}

      {simulasi && skenarioAktif && (
        <SkenarioOverlay
          lang={lang}
          skenario={skenarioAktif}
          fase={simulasi.fase}
          mulaiFase={simulasi.mulaiFase}
          merekam={ekspor.merekam}
          bisaRekam={bisaMerekam()}
          onStop={() => hentikanSimulasi("stop")}
          onLanjut={() => setSimulasi((s) => (s ? { ...s, fase: Math.min(skenarioAktif.fase.length - 1, s.fase + 1), mulaiFase: Date.now() } : s))}
          onMundur={() => setSimulasi((s) => (s ? { ...s, fase: Math.max(0, s.fase - 1), mulaiFase: Date.now() } : s))}
          onUlang={() => setSimulasi((s) => (s ? { ...s, fase: 0, mulaiFase: Date.now() } : s))}
          onEksporMd={() => ekspor.eksporMd(skenarioAktif)}
          onEksporPng={() => ekspor.eksporPng(skenarioAktif)}
          onRekam={() => ekspor.toggleRekam(skenarioAktif)}
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
            const e = indeks.find((x) => x.lapisan === "sipri" && x.props.negara === negara);
            if (e) pilih({ lapisan: e.lapisan, props: e.props, lon: e.lon, lat: e.lat }, false);
          }}
        />
      )}

      {!boot && !sibukLayar && (
        <ChatWidget
          lang={lang}
          terbuka={obrolan}
          onToggle={() => setObrolan((o) => !o)}
          indeks={indeks}
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
          indeks={indeks}
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
            const s = satelitRef.current?.cari(norad);
            if (!s || !satelitRef.current) return;
            setJadwal(false);
            pilih({ lapisan: "satelit", props: satelitRef.current.info(s), lon: s.pos?.lon ?? 0, lat: s.pos?.lat ?? 0 }, true);
          }}
        />
      )}

      {panduan && !boot && <Onboarding lang={lang} onSelesai={() => setPanduan(false)} />}

      {toast && <div className="glass muncul pointer-events-none absolute left-1/2 top-[120px] z-50 -translate-x-1/2 px-4 py-2 text-[12px] text-text">{toast}</div>}
    </div>
  );
}
