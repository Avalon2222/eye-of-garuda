/**
 * Kamus antarmuka dua bahasa (ID/EN). Bahasa aktif disimpan di URL (?lang=en) dan localStorage.
 */

export type Lang = "id" | "en";

type Kamus = Record<string, { id: string; en: string }>;

const KAMUS = {
  // umum
  app_name: { id: "Eye of Garuda", en: "Eye of Garuda" },
  tagline: { id: "Nusantara tidak pernah tidur. Begitu juga sang mata.", en: "The archipelago never sleeps. Neither does the eye." },
  loading: { id: "Memuat", en: "Loading" },
  close: { id: "Tutup", en: "Close" },
  source: { id: "Sumber", en: "Source" },
  open_source: { id: "Buka sumber", en: "Open source" },
  layers: { id: "Lapisan", en: "Layers" },
  entities: { id: "Entitas", en: "Entities" },
  status: { id: "Status", en: "Status" },
  online: { id: "TERHUBUNG", en: "ONLINE" },
  offline: { id: "TERPUTUS", en: "OFFLINE" },
  live: { id: "LIVE", en: "LIVE" },
  static: { id: "STATIS", en: "STATIC" },
  search: { id: "Cari entitas", en: "Search entities" },
  search_hint: { id: "Ketik nama markas, pulau, pangkalan, kabel...", en: "Type a base, island, cable name..." },
  no_result: { id: "Tidak ada hasil", en: "No results" },
  help: { id: "Bantuan", en: "Help" },
  shortcuts: { id: "Pintasan keyboard", en: "Keyboard shortcuts" },
  fullscreen: { id: "Layar penuh", en: "Fullscreen" },
  reset_view: { id: "Kembali ke Indonesia", en: "Reset to Indonesia" },
  tour: { id: "Briefing", en: "Briefing" },
  tour_start: { id: "Mulai briefing", en: "Start briefing" },
  tour_stop: { id: "Hentikan briefing", en: "Stop briefing" },
  tour_next: { id: "Lanjut", en: "Next" },
  share: { id: "Salin tautan tampilan ini", en: "Copy link to this view" },
  copied: { id: "Tautan disalin", en: "Link copied" },
  lang_toggle: { id: "EN", en: "ID" },
  map_mode: { id: "PETA", en: "MAP" },
  sat_mode: { id: "SATELIT", en: "SAT" },
  globe_mode: { id: "3D", en: "3D" },
  flat_mode: { id: "2D", en: "2D" },
  data_panel: { id: "Data & anggaran", en: "Data & budget" },
  about: { id: "Tentang", en: "About" },
  utc: { id: "ZULU", en: "ZULU" },
  wib: { id: "WIB", en: "WIB" },
  boot_1: { id: "MEMBANGUN KONEKSI AMAN", en: "ESTABLISHING SECURE CONNECTION" },
  boot_2: { id: "MEMUAT LAPISAN PERTAHANAN", en: "LOADING DEFENSE LAYERS" },
  boot_3: { id: "MENYELARASKAN JAM ZULU", en: "SYNCING ZULU CLOCK" },
  boot_4: { id: "MATA GARUDA AKTIF", en: "GARUDA EYE ONLINE" },
  boot_skip: { id: "Lewati", en: "Skip" },
  disclaimer: {
    id: "Data publik (Wikipedia, situs resmi, media, think tank). Koordinat adalah perkiraan lokasi umum, bukan data operasional.",
    en: "Public data only (Wikipedia, official sites, media, think tanks). Coordinates are approximate, not operational data.",
  },
  // kelompok lapisan
  group_darat: { id: "Darat & pangkalan", en: "Land & bases" },
  group_laut: { id: "Laut", en: "Sea" },
  group_udara: { id: "Udara & antariksa", en: "Air & space" },
  group_analisis: { id: "Analisis", en: "Analysis" },
  // detail
  detail_type: { id: "Jenis", en: "Type" },
  detail_branch: { id: "Matra", en: "Branch" },
  detail_city: { id: "Kota", en: "City" },
  detail_province: { id: "Provinsi", en: "Province" },
  detail_notes: { id: "Keterangan", en: "Notes" },
  detail_operator: { id: "Operator", en: "Operator" },
  detail_host: { id: "Negara tuan rumah", en: "Host country" },
  detail_status: { id: "Status", en: "Status" },
  detail_border: { id: "Berbatasan dengan", en: "Borders" },
  detail_route: { id: "Rute", en: "Route" },
  detail_category: { id: "Kategori", en: "Category" },
  detail_rfs: { id: "Beroperasi", en: "In service" },
  detail_length: { id: "Panjang", en: "Length" },
  detail_owner: { id: "Pemilik", en: "Owner" },
  detail_landings: { id: "Landing station", en: "Landing stations" },
  detail_country: { id: "Negara", en: "Country" },
  airport_class: { id: "Kelas", en: "Class" },
  airport_large: { id: "Bandara besar", en: "Large airport" },
  airport_medium: { id: "Bandara sedang", en: "Medium airport" },
  airport_military: { id: "Lapangan udara militer", en: "Military airfield" },
  military_use: { id: "Dipakai militer", en: "Military use" },
  data_precision: { id: "Presisi", en: "Precision" },
  detail_cables: { id: "Kabel", en: "Cables" },
  detail_coords: { id: "Koordinat", en: "Coordinates" },
  detail_fly: { id: "Terbang ke sini", en: "Fly here" },
  // live
  aircraft_caveat: {
    id: "Hanya pesawat militer yang memancarkan ADS-B. Banyak jet tempur terbang gelap.",
    en: "Only military aircraft broadcasting ADS-B. Many combat jets fly dark.",
  },
  ships_caveat: {
    id: "Snapshot AIS tiap ~30 menit; posisi diekstrapolasi dari haluan & kecepatan. Cakupan tipis di luar Singapura/Batam.",
    en: "AIS snapshot every ~30 min; positions extrapolated from course & speed. Thin coverage outside Singapore/Batam.",
  },
  sat_caveat: {
    id: "Posisi dihitung dari TLE (SGP4) di browser; akurasi beberapa km.",
    en: "Positions propagated from TLE (SGP4) in the browser; accuracy within a few km.",
  },
  updated_ago: { id: "diperbarui {n} menit lalu", en: "updated {n} min ago" },
  updated_now: { id: "baru diperbarui", en: "just updated" },
  no_snapshot: { id: "Belum ada snapshot", en: "No snapshot yet" },
  scope_region: { id: "Indo-Pasifik", en: "Indo-Pacific" },
  scope_world: { id: "Dunia", en: "World" },
  aircraft_scope: { id: "Cakupan pesawat", en: "Aircraft scope" },
  altitude: { id: "Ketinggian", en: "Altitude" },
  speed: { id: "Kecepatan", en: "Speed" },
  heading: { id: "Haluan", en: "Heading" },
  callsign: { id: "Callsign", en: "Callsign" },
  registration: { id: "Registrasi", en: "Registration" },
  aircraft_type: { id: "Tipe", en: "Type" },
  squawk: { id: "Squawk", en: "Squawk" },
  last_seen: { id: "Terakhir terlihat", en: "Last seen" },
  mmsi: { id: "MMSI", en: "MMSI" },
  ship_type: { id: "Jenis kapal", en: "Ship type" },
  flag: { id: "Bendera", en: "Flag" },
  destination: { id: "Tujuan", en: "Destination" },
  sanctioned: { id: "TERSANKSI", en: "SANCTIONED" },
  norad: { id: "NORAD", en: "NORAD" },
  mission: { id: "Misi", en: "Mission" },
  orbit_alt: { id: "Ketinggian orbit", en: "Orbit altitude" },
  orbit_class: { id: "Kelas orbit", en: "Orbit class" },
  orbit_period: { id: "Periode orbit", en: "Orbital period" },
  inclination: { id: "Inklinasi", en: "Inclination" },
  apogee_perigee: { id: "Apogee / perigee", en: "Apogee / perigee" },
  eccentricity: { id: "Eksentrisitas", en: "Eccentricity" },
  tle_epoch: { id: "Epoch TLE", en: "TLE epoch" },
  orbit_leo: { id: "LEO · orbit rendah (< 2.000 km)", en: "LEO · low Earth orbit (< 2,000 km)" },
  orbit_meo: { id: "MEO · orbit menengah", en: "MEO · medium Earth orbit" },
  orbit_geo: { id: "GEO · geostasioner (~35.786 km)", en: "GEO · geostationary (~35,786 km)" },
  orbit_heo: { id: "HEO · orbit eliptis tinggi", en: "HEO · highly elliptical orbit" },
  sat_height_note: {
    id: "Di globe, ketinggian satelit dikompresi agar tetap terlihat: LEO rendah, MEO/GEO lebih tinggi, tetapi bukan skala sebenarnya.",
    en: "On the globe, satellite altitude is compressed so it stays in view: LEO low, MEO/GEO higher, but not to true scale.",
  },
  launched: { id: "Diluncurkan", en: "Launched" },
  // analisis
  radius_caveat: {
    id: "Radius tempur = angka publik (Wikipedia/produsen), tanpa tanker, tanpa profil misi. Hanya gambaran.",
    en: "Combat radius = public figures (Wikipedia/manufacturer), no tanker, no mission profile. Illustrative only.",
  },
  eez_caveat: {
    id: "Batas ZEE dari Marine Regions (Flanders Marine Institute). Sembilan garis putus digambar ilustratif.",
    en: "EEZ boundaries from Marine Regions (Flanders Marine Institute). Nine-dash line drawn illustratively.",
  },
  overlap: { id: "Tumpang tindih klaim di Natuna Utara", en: "Overlapping claims off North Natuna" },
  timeline: { id: "Lini masa", en: "Timeline" },
  arms_caveat: {
    id: "Nilai TIV SIPRI (indikator volume, bukan harga). Dibulatkan.",
    en: "SIPRI TIV values (volume indicator, not price). Rounded.",
  },
  year: { id: "Tahun", en: "Year" },
  // ticker
  ticker_aircraft: { id: "{n} pesawat militer terlacak", en: "{n} military aircraft tracked" },
  ticker_ships: { id: "{n} kapal dalam snapshot AIS", en: "{n} vessels in AIS snapshot" },
  ticker_sats: { id: "{n} satelit dipropagasi", en: "{n} satellites propagated" },
  ticker_bases: { id: "{n} markas TNI · {m} pangkalan asing di kawasan", en: "{n} TNI bases · {m} foreign bases in the region" },
  ticker_cables: { id: "{n} kabel bawah laut", en: "{n} undersea cables" },
  // help text
  help_q: { id: "Buka bantuan ini", en: "Open this help" },
  help_f: { id: "Layar penuh", en: "Fullscreen" },
  help_r: { id: "Kembali ke Indonesia", en: "Reset to Indonesia" },
  help_t: { id: "Mulai / hentikan briefing", en: "Start / stop briefing" },
  help_k: { id: "Cari entitas", en: "Search entities" },
  help_l: { id: "Ganti bahasa", en: "Switch language" },
  help_s: { id: "Peta / citra satelit", en: "Map / satellite imagery" },
  help_g: { id: "Globe 3D / datar 2D", en: "3D globe / 2D flat" },
  help_num: { id: "Nyalakan / matikan lapisan ke-n", en: "Toggle layer n" },
  help_esc: { id: "Tutup panel", en: "Close panels" },
} satisfies Kamus;

export type KunciKamus = keyof typeof KAMUS;

export function terjemah(lang: Lang, kunci: KunciKamus, ganti?: Record<string, string | number>): string {
  let teks: string = KAMUS[kunci]?.[lang] ?? kunci;
  if (ganti) {
    for (const [k, v] of Object.entries(ganti)) teks = teks.replace(`{${k}}`, String(v));
  }
  return teks;
}

export function bacaLangTersimpan(): Lang {
  if (typeof window === "undefined") return "id";
  try {
    const v = window.localStorage.getItem("eog-lang");
    if (v === "en" || v === "id") return v;
  } catch {
    /* localStorage bisa diblokir */
  }
  return "id";
}

export function simpanLang(lang: Lang): void {
  try {
    window.localStorage.setItem("eog-lang", lang);
  } catch {
    /* abaikan */
  }
}
