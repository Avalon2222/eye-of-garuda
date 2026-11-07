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
  layers: { id: "Layers", en: "Layers" },
  entities: { id: "Objek", en: "Objects" },
  status: { id: "Status", en: "Status" },
  online: { id: "ONLINE", en: "ONLINE" },
  offline: { id: "OFFLINE", en: "OFFLINE" },
  live: { id: "LIVE", en: "LIVE" },
  static: { id: "STATIC", en: "STATIC" },
  search: { id: "Search", en: "Search" },
  search_hint: { id: "Ketik nama markas, pulau, pangkalan, kabel...", en: "Type a base, island, cable name..." },
  no_result: { id: "Tidak ada hasil", en: "No results" },
  help: { id: "Bantuan", en: "Help" },
  shortcuts: { id: "Keyboard shortcuts", en: "Keyboard shortcuts" },
  fullscreen: { id: "Fullscreen", en: "Fullscreen" },
  reset_view: { id: "Reset ke Indonesia", en: "Reset to Indonesia" },
  tour: { id: "Briefing", en: "Briefing" },
  scenario: { id: "War Room: simulasi", en: "War Room: simulations" },
  scenario_fictional: { id: "SIMULASI FIKTIF", en: "FICTIONAL SIMULATION" },
  scenario_pick: { id: "Pilih skenario", en: "Pick a scenario" },
  scenario_pick_sub: { id: "Semua skenario fiktif dan edukatif. Lapisan lain disembunyikan sementara, lalu dipulihkan saat selesai.", en: "All scenarios are fictional and educational. Other layers are hidden for the duration, then restored." },
  scenario_phases: { id: "fase", en: "phases" },
  scenario_start: { id: "Mulai", en: "Start" },
  scenario_finish: { id: "Selesai", en: "Finish" },
  scenario_autoclose: { id: "Menutup otomatis dalam {n} dtk", en: "Closes automatically in {n} s" },
  scenario_minimize: { id: "Kecilkan panel", en: "Minimize panel" },
  scenario_expand: { id: "Buka panel", en: "Expand panel" },
  scenario_interrupted: { id: "Simulasi dihentikan, lapisan dipulihkan", en: "Simulation stopped, layers restored" },
  export: { id: "Export", en: "Export" },
  export_md: { id: "Ringkasan (.md)", en: "Summary (.md)" },
  export_png: { id: "Snapshot (.png)", en: "Snapshot (.png)" },
  export_rec: { id: "Rekam video", en: "Record video" },
  export_rec_stop: { id: "Stop & simpan", en: "Stop & save" },
  export_recording: { id: "REC", en: "REC" },
  scenario_prev: { id: "Fase sebelumnya", en: "Previous phase" },
  scenario_next: { id: "Fase berikutnya", en: "Next phase" },
  scenario_stop: { id: "Hentikan simulasi", en: "Stop simulation" },
  scenario_replay: { id: "Ulangi", en: "Replay" },
  scenario_phase: { id: "Fase", en: "Phase" },
  conclusions: { id: "Kesimpulan", en: "Conclusions" },
  recommendations: { id: "Saran", en: "Recommendations" },
  scenario_disclaimer: {
    id: "Skenario ini fiktif dan edukatif. Posisi pangkalan dari data publik; pergerakan, waktu, dan hasil hanya ilustrasi, bukan prediksi atau data operasional.",
    en: "This scenario is fictional and educational. Base positions come from public data; movements, timings and outcomes are illustrative, not predictions or operational data.",
  },
  help_w: { id: "Mulai / hentikan simulasi skenario", en: "Start / stop scenario simulation" },
  help_c: { id: "Buka / tutup asisten", en: "Open / close assistant" },
  chat_title: { id: "Garuda AI", en: "Garuda AI" },
  chat_button: { id: "Tanya Garuda AI", en: "Ask Garuda AI" },
  chat_hint: { id: "AI helper · tanya apa saja, bisa terbangkan globe", en: "AI helper · ask anything, it can fly the globe" },
  chat_mode_ai: { id: "AI mode · tanya apa saja tentang konsol ini", en: "AI mode · ask anything about this console" },
  chat_mode_faq: { id: "FAQ mode (AI sedang tidak tersedia)", en: "FAQ mode (AI currently unavailable)" },
  chat_intro: {
    id: "Tanya soal lapisan, sumber data, cara pakai, atau minta diantar ke suatu markas, pulau, atau pangkalan. Jawaban bisa membawa globe terbang ke tempatnya.",
    en: "Ask about layers, data sources, how to use the console, or ask to be taken to a base, island or outpost. Answers can fly the globe there.",
  },
  chat_placeholder: { id: "Tulis pertanyaan...", en: "Type a question..." },
  chat_send: { id: "Kirim", en: "Send" },
  chat_caveat: {
    id: "Jawaban dibuat otomatis dari pengetahuan tentang aplikasi ini; bisa keliru. Data publik, bukan operasional.",
    en: "Answers are generated from knowledge about this app and may be wrong. Public data, not operational.",
  },
  chat_faq_miss: {
    id: "Belum ada jawaban siap untuk pertanyaan itu. Coba tanya soal satelit, pesawat, kapal, kabel, markas TNI, pangkalan asing, Natuna, skenario, SIPRI, atau pintasan keyboard.",
    en: "No prepared answer for that yet. Try asking about satellites, aircraft, ships, cables, TNI bases, foreign bases, Natuna, the scenario, SIPRI or keyboard shortcuts.",
  },
  tour_start: { id: "Mulai briefing", en: "Start briefing" },
  tour_stop: { id: "Hentikan briefing", en: "Stop briefing" },
  tour_next: { id: "Lanjut", en: "Next" },
  share: { id: "Share link tampilan ini", en: "Copy link to this view" },
  copied: { id: "Link disalin", en: "Link copied" },
  lang_toggle: { id: "EN", en: "ID" },
  map_mode: { id: "MAP", en: "MAP" },
  sat_mode: { id: "SAT", en: "SAT" },
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
  timeline: { id: "Timeline", en: "Timeline" },
  timeline_play: { id: "Putar lini masa", en: "Play timeline" },
  timeline_pause: { id: "Jeda", en: "Pause" },
  timeline_drag: { id: "Geser untuk menjelajah waktu", en: "Drag to scrub through time" },
  arms_caveat: {
    id: "Nilai TIV SIPRI (indikator volume, bukan harga), diambil langsung dari basis data SIPRI dan dibulatkan.",
    en: "SIPRI TIV values (volume indicator, not price), pulled straight from the SIPRI database and rounded.",
  },
  sipri_title: { id: "Pemasok senjata Indonesia", en: "Indonesia's arms suppliers" },
  sipri_collapse: { id: "Lipat panel", en: "Collapse panel" },
  sipri_expand: { id: "Buka panel SIPRI", en: "Open SIPRI panel" },
  sipri_peak: { id: "puncak", en: "peak" },
  sipri_fetched: { id: "Diambil", en: "Fetched" },
  year: { id: "Tahun", en: "Year" },
  // ticker
  ticker_aircraft: { id: "{n} pesawat & helikopter militer terlacak", en: "{n} military aircraft & helicopters tracked" },
  ticker_ships: { id: "{n} kapal AIS", en: "{n} AIS vessels" },
  ticker_ships_live: { id: "live", en: "live" },
  ticker_subs: { id: "{n} pangkalan kapal selam di kawasan", en: "{n} submarine home ports in the region" },
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
  help_o: { id: "Jadwal lintasan satelit", en: "Satellite pass schedule" },
  help_replay_guide: { id: "Ulangi panduan antarmuka", en: "Replay the interface guide" },
  // onboarding
  guide_title: { id: "Panduan singkat", en: "Quick guide" },
  guide_next: { id: "Lanjut", en: "Next" },
  guide_skip: { id: "Lewati", en: "Skip" },
  guide_done: { id: "Selesai", en: "Done" },
  guide_auto: { id: "Lanjut otomatis", en: "Auto-advance" },
  // satelit: jadwal lintasan
  passes_title: { id: "Satellite passes over Indonesia", en: "Satellite passes over Indonesia" },
  passes_sub: { id: "12 jam ke depan · satelit militer & pengintai LEO · dihitung dari TLE di browser", en: "Next 12 hours · LEO military & spy satellites · computed from TLE in the browser" },
  passes_now: { id: "Di atas Indonesia sekarang", en: "Over Indonesia now" },
  passes_computing: { id: "Menghitung lintasan...", en: "Computing passes..." },
  passes_enter: { id: "Masuk", en: "Enter" },
  passes_duration: { id: "Lama", en: "Duration" },
  passes_dir: { id: "Arah", en: "Direction" },
  passes_alt: { id: "Tinggi", en: "Alt" },
  passes_none: { id: "Tidak ada lintasan (nyalakan lapisan satelit dulu)", en: "No passes (turn on the satellite layer first)" },
  passes_need_layer: { id: "Lapisan satelit dimatikan. Nyalakan untuk menghitung lintasan.", en: "Satellite layer is off. Turn it on to compute passes." },
  // kapal selam
  sub_fleet: { id: "Armada", en: "Fleet" },
  sub_count: { id: "Jumlah kapal selam", en: "Submarines" },
  sub_caveat: {
    id: "Kapal selam tidak memancarkan AIS dan tidak bisa dilacak secara publik. Yang ditampilkan adalah pangkalan dan jumlah armada dari sumber terbuka, bukan posisi nyata.",
    en: "Submarines broadcast no AIS and cannot be tracked publicly. What is shown are home ports and fleet sizes from open sources, not real positions.",
  },
  aircraft_category: { id: "Kategori", en: "Category" },
  ships_live_note: { id: "Live via aisstream.io, diperbarui tiap menit; sisanya dari snapshot 30 menit.", en: "Live via aisstream.io, refreshed every minute; the rest from the 30-minute snapshot." },
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
