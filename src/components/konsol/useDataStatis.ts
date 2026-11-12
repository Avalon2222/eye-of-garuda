import { useCallback, useEffect, useState, type RefObject } from "react";
import type { Map as MapLibre } from "maplibre-gl";
import type { GeoJSON } from "geojson";
import { setDataSource } from "@/lib/mapLayers";
import { LAPISAN, type LayerId } from "@/lib/layers";
import { muatAnalisis, type DataSipri } from "@/lib/analisis";
import type { KanvasLive } from "@/lib/kanvasLive";
import type { EntriCari } from "../SearchPalette";

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

interface BerkasStatis {
  id: LayerId;
  fc: GeoJSON.FeatureCollection;
  /** landing station, cuma untuk lapisan kabel */
  landing?: GeoJSON.FeatureCollection;
}

let janjiBerkas: Promise<BerkasStatis[]> | null = null;

/**
 * Ambil semua GeoJSON statis sekali per kunjungan, tanpa menunggu peta. Basemap baru `load` setelah
 * ubin dari OpenFreeMap datang; kalau CDN ubin lagi lambat, pencarian dulu ikut kosong lama.
 */
function ambilBerkasStatis(): Promise<BerkasStatis[]> {
  janjiBerkas ??= Promise.all(
    LAPISAN.filter((l) => l.jenis === "statis" && l.berkas).map(async (l): Promise<BerkasStatis | null> => {
      try {
        const fc = (await (await fetch(`/data/${l.berkas}`)).json()) as GeoJSON.FeatureCollection;
        const landing =
          l.id === "kabel" ? ((await (await fetch("/data/landing_station.geojson")).json()) as GeoJSON.FeatureCollection) : undefined;
        return { id: l.id, fc, landing };
      } catch (e) {
        console.warn("gagal memuat", l.id, e);
        return null;
      }
    }),
  ).then((daftar) => daftar.filter((b): b is BerkasStatis => b !== null));
  return janjiBerkas;
}

function entriStatis(berkas: BerkasStatis[]): EntriCari[] {
  const daftar: EntriCari[] = [];
  for (const b of berkas)
    for (const f of [...b.fc.features, ...(b.landing?.features ?? [])]) {
      const e = entriDariFitur(b.id, f);
      if (e) daftar.push(e);
    }
  return daftar;
}

/**
 * Memuat semua lapisan statis (GeoJSON di /public/data) + lapisan analisis (SIPRI, insiden) ke peta,
 * sambil membangun indeks pencarian dan jumlah fitur per lapisan. Indeks lapisan statis sudah
 * dipublikasikan begitu berkasnya datang (tanpa menunggu peta); setelah peta siap, indeks lengkap
 * (plus analisis) menggantikannya. Dipakai pencarian, asisten, dan legenda SIPRI.
 */
export function useDataStatis(kanvasRef: RefObject<KanvasLive | null>) {
  /** indeks pencarian: lapisan statis dulu, lalu lengkap setelah peta dan analisis dimuat */
  const [indeks, setIndeks] = useState<EntriCari[]>([]);
  const [jumlah, setJumlah] = useState<Partial<Record<LayerId, number>>>({});
  const [tersedia, setTersedia] = useState<Set<LayerId>>(new Set());
  const [sipri, setSipri] = useState<DataSipri | null>(null);
  const [insiden, setInsiden] = useState<GeoJSON.FeatureCollection | null>(null);

  // pencarian langsung bisa dipakai begitu GeoJSON statis datang, walau basemap belum load
  useEffect(() => {
    let batal = false;
    ambilBerkasStatis().then((berkas) => {
      if (batal) return;
      const awal = entriStatis(berkas);
      // indeks lengkap dari muatLapisanStatis bisa saja sudah lebih dulu masuk: jangan ditimpa
      setIndeks((lama) => (lama.length ? lama : awal));
    });
    return () => {
      batal = true;
    };
  }, []);

  const muatLapisanStatis = useCallback(async (m: MapLibre): Promise<EntriCari[]> => {
    const hasil: Partial<Record<LayerId, number>> = {};
    const ada = new Set<LayerId>();
    const berkas = await ambilBerkasStatis();
    for (const b of berkas) {
      setDataSource(m, b.id, b.fc);
      if (b.landing) setDataSource(m, "kabel-landing", b.landing);
      hasil[b.id] = b.fc.features.length;
      ada.add(b.id);
    }
    const daftar = entriStatis(berkas);
    // lapisan live selalu "tersedia" (datanya datang belakangan)
    for (const l of LAPISAN) if (l.jenis === "live") ada.add(l.id);
    // lapisan analisis fase 3
    try {
      const an = await muatAnalisis(m);
      setSipri(an.sipri);
      setInsiden(an.fitur.insiden ?? null);
      if (kanvasRef.current && an.fitur.sipri) {
        kanvasRef.current.busurSipri = an.fitur.sipri.features
          .filter((f) => f.geometry.type === "LineString")
          .map((f) => ({ id: String(f.properties?.id), koordinat: (f.geometry as GeoJSON.LineString).coordinates as [number, number][], tebal: Number(f.properties?.tebal ?? 1) }));
      }
      for (const [id, fc] of Object.entries(an.fitur)) {
        if (!fc) continue;
        hasil[id as LayerId] = fc.features.length;
        ada.add(id as LayerId);
        for (const f of fc.features) {
          const e = entriDariFitur(id as LayerId, f);
          if (e) daftar.push(e);
        }
      }
    } catch (e) {
      console.warn("analisis belum tersedia", e);
    }
    setJumlah((j) => ({ ...j, ...hasil }));
    setTersedia(ada);
    setIndeks(daftar);
    return daftar;
  }, [kanvasRef]);

  return { indeks, jumlah, setJumlah, tersedia, sipri, insiden, muatLapisanStatis };
}
