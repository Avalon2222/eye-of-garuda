"use client";

import { X, ExternalLink, Crosshair } from "lucide-react";
import { lapisanDariId, type LayerId } from "@/lib/layers";
import { terjemah, type Lang, type KunciKamus } from "@/lib/i18n";
import { formatKoordinat } from "@/lib/geo";
import type { Pilihan } from "@/lib/types";
import { NAMA_KATEGORI_PESAWAT, type KategoriPesawat } from "@/lib/negara";

type Baris = [string, string];

function s(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

function barisUntuk(p: Pilihan, lang: Lang): { judul: string; sub: string; baris: Baris[]; catatan?: KunciKamus; url?: string } {
  const t = (k: KunciKamus) => terjemah(lang, k);
  const pr = p.props;
  const url = s(pr.url) || undefined;
  switch (p.lapisan) {
    case "tni":
      return {
        judul: s(pr.nama),
        sub: `${s(pr.jenis)} · TNI ${s(pr.matra)}`,
        baris: [
          [t("detail_type"), s(pr.jenis)],
          [t("detail_branch"), s(pr.matra)],
          [t("detail_city"), s(pr.kota)],
          [t("detail_province"), s(pr.provinsi)],
          [t("detail_notes"), s(pr.keterangan)],
          [t("source"), s(pr.sumber)],
        ],
        url,
      };
    case "asing":
      return {
        judul: s(pr.nama),
        sub: `${s(pr.operator)} · ${s(pr.jenis)}`,
        baris: [
          [t("detail_operator"), s(pr.operator)],
          [t("detail_host"), s(pr.tuan_rumah)],
          [t("detail_type"), s(pr.jenis)],
          [t("detail_status"), s(pr.status)],
          [t("detail_notes"), s(pr.keterangan)],
          [t("source"), s(pr.sumber)],
        ],
        url,
      };
    case "batas":
      return {
        judul: s(pr.nama),
        sub: s(pr.jenis).replace(/_/g, " "),
        baris: [
          [t("detail_type"), s(pr.jenis).replace(/_/g, " ")],
          [t("detail_province"), s(pr.provinsi)],
          [t("detail_border"), s(pr.berbatasan)],
          [t("detail_notes"), s(pr.keterangan)],
          [t("source"), s(pr.sumber)],
        ],
        url,
      };
    case "alki":
      return { judul: s(pr.nama), sub: "Alur Laut Kepulauan Indonesia", baris: [[t("detail_route"), s(pr.rute)], [t("source"), s(pr.sumber)]], url };
    case "kabel":
      if (s(pr.id).startsWith("landing-")) {
        return {
          judul: s(pr.nama),
          sub: "Landing station",
          baris: [
            [t("detail_country"), s(pr.negara)],
            [t("detail_cables"), `${s(pr.n_kabel_aktif)} / ${s(pr.n_kabel)}`],
            [t("source"), "TeleGeography Submarine Cable Map"],
          ],
          url,
        };
      }
      return {
        judul: s(pr.nama),
        sub: `${s(pr.kategori)} · ${s(pr.status)}`,
        baris: [
          [t("detail_category"), s(pr.kategori)],
          [t("detail_status"), s(pr.status)],
          [t("detail_rfs"), s(pr.rfs)],
          [t("detail_length"), pr.panjang_km ? `${Number(pr.panjang_km).toLocaleString("en-US")} km` : ""],
          [t("detail_owner"), s(pr.pemilik)],
          [t("detail_landings"), s(pr.n_landing)],
          [t("source"), "TeleGeography Submarine Cable Map"],
        ],
        url,
      };
    case "pesawat": {
      const alt = pr.alt != null ? `${Number(pr.alt).toLocaleString("en-US")} ft (${Math.round(Number(pr.alt) * 0.3048).toLocaleString("en-US")} m)` : "";
      const gs = pr.gs != null ? `${Math.round(Number(pr.gs))} kt (${Math.round(Number(pr.gs) * 1.852)} km/h)` : "";
      const umur = pr.dilihat ? Math.max(0, Math.round((Date.now() - Number(pr.dilihat)) / 1000)) : null;
      const kategori = NAMA_KATEGORI_PESAWAT[(s(pr.kategori) || "lain") as KategoriPesawat]?.[lang] ?? "";
      const negara = lang === "en" ? s(pr.negara_en) : s(pr.negara_id);
      return {
        judul: s(pr.label) || s(pr.callsign) || s(pr.hex).toUpperCase(),
        sub: `${s(pr.desc) || s(pr.tipe) || "?"} · ${negara || s(pr.negara)}`,
        baris: [
          [t("callsign"), s(pr.callsign)],
          [t("detail_country"), negara ? `${negara} (${s(pr.negara)})` : s(pr.negara)],
          [t("aircraft_category"), kategori],
          [t("detail_operator"), s(pr.operator)],
          [t("registration"), s(pr.reg)],
          [t("aircraft_type"), [s(pr.tipe), s(pr.desc)].filter(Boolean).join(" · ")],
          ["ICAO hex", s(pr.hex).toUpperCase()],
          [t("altitude"), alt],
          [t("speed"), gs],
          [t("heading"), pr.track != null ? `${Math.round(Number(pr.track))}°` : ""],
          [t("squawk"), s(pr.squawk)],
          [t("last_seen"), umur != null ? `${umur} s` : ""],
          [t("source"), "adsb.lol / airplanes.live (ADS-B)"],
        ],
        catatan: "aircraft_caveat",
        url: pr.hex ? `https://globe.adsb.lol/?icao=${s(pr.hex)}` : undefined,
      };
    }
    case "kapal": {
      const sog = pr.sog != null ? `${Number(pr.sog).toFixed(1)} kt` : "";
      return {
        judul: s(pr.label) || s(pr.nama),
        sub: `${s(pr.kelas)}${s(pr.sumber) === "live" ? " · LIVE" : ""}${pr.tersanksi ? " · " + t("sanctioned") : ""}`,
        baris: [
          [t("mmsi"), s(pr.mmsi)],
          [t("ship_type"), `${s(pr.kelas)}${pr.tipe != null ? ` (AIS ${s(pr.tipe)})` : ""}`],
          [t("flag"), s(pr.bendera)],
          [t("speed"), sog],
          [t("heading"), pr.cog != null ? `${Math.round(Number(pr.cog))}°` : ""],
          [t("destination"), s(pr.tujuan)],
          [t("last_seen"), pr.waktu ? new Date(s(pr.waktu)).toUTCString().replace("GMT", "Z") : ""],
          ...(pr.tersanksi ? ([["Program", s(pr.program)]] as Baris[]) : []),
          [t("source"), "aisstream.io (AIS) · OpenSanctions"],
        ],
        catatan: s(pr.sumber) === "live" ? "ships_live_note" : "ships_caveat",
        url: pr.mmsi ? `https://www.marinetraffic.com/en/ais/details/ships/mmsi:${s(pr.mmsi)}` : undefined,
      };
    }
    case "kapalselam":
      return {
        judul: s(pr.nama),
        sub: `${s(pr.negara)} · ${s(pr.status)}`,
        baris: [
          [t("detail_country"), s(pr.negara)],
          [t("sub_count"), s(pr.jumlah)],
          [t("sub_fleet"), s(pr.kelas)],
          [t("detail_status"), s(pr.status)],
          [t("detail_notes"), s(pr.keterangan)],
          [t("source"), s(pr.sumber)],
        ],
        catatan: "sub_caveat",
        url,
      };
    case "satelit": {
      const kelas = s(pr.kelas_orbit);
      const kelasTeks = kelas === "LEO" ? t("orbit_leo") : kelas === "MEO" ? t("orbit_meo") : kelas === "GEO" ? t("orbit_geo") : kelas === "HEO" ? t("orbit_heo") : "";
      const kec = pr.kecepatan != null ? `${Number(pr.kecepatan).toFixed(2)} km/s (${Math.round(Number(pr.kecepatan) * 3600).toLocaleString("en-US")} km/h)` : "";
      const periode = pr.periode_menit != null ? `${Number(pr.periode_menit).toFixed(1)} ${lang === "id" ? "menit" : "min"}` : "";
      return {
        judul: s(pr.nama),
        sub: `${kelas ? kelas + " · " : ""}${s(pr.kelompok)} · ${s(pr.negara)}`,
        baris: [
          [t("norad"), s(pr.norad)],
          [t("detail_country"), s(pr.negara)],
          [t("detail_operator"), s(pr.operator)],
          [t("mission"), s(pr.misi)],
          [t("orbit_class"), kelasTeks],
          [t("orbit_alt"), pr.alt != null ? `${Number(pr.alt).toLocaleString("en-US")} km` : ""],
          [t("speed"), kec],
          [t("orbit_period"), periode],
          [t("inclination"), pr.inklinasi != null ? `${s(pr.inklinasi)}°` : ""],
          [t("apogee_perigee"), pr.apogee != null ? `${Number(pr.apogee).toLocaleString("en-US")} / ${Number(pr.perigee).toLocaleString("en-US")} km` : ""],
          [t("eccentricity"), s(pr.eksentrisitas)],
          [t("launched"), s(pr.diluncurkan)],
          [t("tle_epoch"), s(pr.epoch)],
          [t("source"), "CelesTrak (TLE) · GCAT"],
        ],
        catatan: "sat_caveat",
        url: pr.norad ? `https://www.n2yo.com/satellite/?s=${s(pr.norad)}` : undefined,
      };
    }
    case "zee":
      return {
        judul: s(pr.nama),
        sub: s(pr.tipe_garis) || s(pr.jenis).replace(/_/g, " "),
        baris: [
          ...(pr.tetangga ? ([[t("detail_border"), s(pr.tetangga)]] as Baris[]) : []),
          [t("detail_notes"), s(pr.keterangan)],
          [t("source"), s(pr.sumber)],
        ],
        catatan: "eez_caveat",
        url,
      };
    case "radius":
      return {
        judul: s(pr.nama),
        sub: s(pr.pesawat),
        baris: [
          ["Lanud", s(pr.lanud)],
          [t("detail_notes"), s(pr.keterangan)],
          [t("source"), s(pr.sumber)],
        ],
        catatan: "radius_caveat",
        url,
      };
    case "sipri":
      return {
        judul: s(pr.nama),
        sub: s(pr.sub),
        baris: [[t("detail_notes"), s(pr.keterangan)], [t("source"), s(pr.sumber)]],
        catatan: "arms_caveat",
        url,
      };
    case "insiden":
      return {
        judul: s(pr.judul),
        sub: `${s(pr.tanggal)} · ${s(pr.kategori)}`,
        baris: [
          [t("year"), s(pr.tanggal)],
          [t("detail_notes"), s(pr.keterangan)],
          [t("source"), s(pr.sumber)],
        ],
        url,
      };
    case "bandara": {
      const kelas = s(pr.kelas) === "besar" ? t("airport_large") : s(pr.kelas) === "sedang" ? t("airport_medium") : t("airport_military");
      return {
        judul: s(pr.nama),
        sub: `${[s(pr.iata), s(pr.icao)].filter(Boolean).join(" / ")}${pr.iata || pr.icao ? " · " : ""}${s(pr.negara)}`,
        baris: [
          [t("airport_class"), kelas],
          ["ICAO / IATA", [s(pr.icao), s(pr.iata)].filter(Boolean).join(" / ")],
          [t("detail_city"), s(pr.kota)],
          [t("detail_country"), s(pr.negara)],
          [t("military_use"), pr.militer ? (lang === "id" ? "Ya (berdasarkan nama)" : "Yes (by name)") : ""],
          [t("source"), "OurAirports (public domain)"],
        ],
        url,
      };
    }
    case "pelabuhan":
      return {
        judul: s(pr.nama),
        sub: s(pr.negara),
        baris: [
          [t("detail_country"), s(pr.negara)],
          [t("source"), "Wikidata (CC0)"],
        ],
        url,
      };
    default:
      return { judul: s(pr.nama), sub: "", baris: [], url };
  }
}

interface Props {
  lang: Lang;
  pilihan: Pilihan;
  onTutup: () => void;
  onTerbang: (lon: number, lat: number) => void;
}

export default function DetailPanel({ lang, pilihan, onTutup, onTerbang }: Props) {
  const def = lapisanDariId(pilihan.lapisan);
  const d = barisUntuk(pilihan, lang);
  return (
    <section className="glass braket geser-kanan pointer-events-auto absolute right-2 top-[120px] z-20 flex max-h-[calc(100%-180px)] w-[calc(100%-16px)] flex-col sm:right-3 sm:top-[132px] sm:w-[340px] max-sm:top-auto max-sm:bottom-[88px] max-sm:max-h-[48vh]">
      <div className="flex items-start gap-3 border-b border-white/10 px-3 py-2.5">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: def?.warna }} />
        <div className="min-w-0 flex-1">
          <div className="label-kecil text-[9px]" style={{ color: def?.warna }}>
            {def?.nama[lang]}
          </div>
          <h2 className="truncate text-[14px] font-semibold text-text">{d.judul}</h2>
          {d.sub && <div className="truncate text-[11px] text-muted">{d.sub}</div>}
        </div>
        <button className="tombol-ikon !h-7 !w-7 !border-0" onClick={onTutup} title="Esc">
          <X size={15} />
        </button>
      </div>
      <div className="gulir flex-1 overflow-y-auto px-3 py-2">
        <dl className="space-y-1.5">
          {d.baris
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="grid grid-cols-[96px_1fr] gap-2 text-[11.5px]">
                <dt className="text-dim">{k}</dt>
                <dd className="break-words text-text">{v}</dd>
              </div>
            ))}
          <div className="grid grid-cols-[96px_1fr] gap-2 text-[11.5px]">
            <dt className="text-dim">{terjemah(lang, "detail_coords")}</dt>
            <dd className="tabular-nums text-text">{formatKoordinat(pilihan.lon, pilihan.lat)}</dd>
          </div>
        </dl>
        {d.catatan && <p className="mt-3 border-l-2 border-warn/60 pl-2 text-[10.5px] leading-snug text-muted">{terjemah(lang, d.catatan)}</p>}
      </div>
      <div className="flex gap-1 border-t border-white/10 p-2">
        <button className="tombol-hud flex-1 justify-center" onClick={() => onTerbang(pilihan.lon, pilihan.lat)}>
          <Crosshair size={13} /> {terjemah(lang, "detail_fly")}
        </button>
        {d.url && (
          <a className="tombol-hud flex-1 justify-center" href={d.url} target="_blank" rel="noreferrer">
            <ExternalLink size={13} /> {terjemah(lang, "open_source")}
          </a>
        )}
      </div>
    </section>
  );
}

export { barisUntuk };
export type { LayerId };
