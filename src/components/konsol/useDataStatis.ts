import { useCallback, useState, type RefObject } from "react";
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

/**
 * Memuat semua lapisan statis (GeoJSON di /public/data) + lapisan analisis (SIPRI, insiden) ke peta,
 * sambil membangun indeks pencarian dan jumlah fitur per lapisan. Indeks baru dipublikasikan
 * setelah semuanya selesai, lalu dipakai pencarian, asisten, dan legenda SIPRI.
 */
export function useDataStatis(kanvasRef: RefObject<KanvasLive | null>) {
  /** indeks pencarian: kosong sampai semua lapisan selesai dimuat */
  const [indeks, setIndeks] = useState<EntriCari[]>([]);
  const [jumlah, setJumlah] = useState<Partial<Record<LayerId, number>>>({});
  const [tersedia, setTersedia] = useState<Set<LayerId>>(new Set());
  const [sipri, setSipri] = useState<DataSipri | null>(null);
  const [insiden, setInsiden] = useState<GeoJSON.FeatureCollection | null>(null);

  const muatLapisanStatis = useCallback(async (m: MapLibre): Promise<EntriCari[]> => {
    const hasil: Partial<Record<LayerId, number>> = {};
    const ada = new Set<LayerId>();
    const daftar: EntriCari[] = [];
    await Promise.all(
      LAPISAN.filter((l) => l.jenis === "statis" && l.berkas).map(async (l) => {
        try {
          const res = await fetch(`/data/${l.berkas}`);
          const fc = (await res.json()) as GeoJSON.FeatureCollection;
          setDataSource(m, l.id, fc);
          hasil[l.id] = fc.features.length;
          ada.add(l.id);
          for (const f of fc.features) {
            const e = entriDariFitur(l.id, f);
            if (e) daftar.push(e);
          }
          if (l.id === "kabel") {
            const r2 = await fetch("/data/landing_station.geojson");
            const fc2 = (await r2.json()) as GeoJSON.FeatureCollection;
            setDataSource(m, "kabel-landing", fc2);
            for (const f of fc2.features) {
              const e = entriDariFitur("kabel", f);
              if (e) daftar.push(e);
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
