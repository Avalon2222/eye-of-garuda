/**
 * Pengetahuan dasar tentang Eye of Garuda untuk asisten obrolan: dipakai sebagai system prompt di server
 * dan sebagai FAQ cadangan di browser kalau layanan AI tidak tersedia (kunci belum dipasang / kuota habis).
 */

import { LAPISAN } from "./layers";
import type { Lang } from "./i18n";

export const PINTASAN_TEKS = [
  ["Ctrl K", "cari entitas / search"],
  ["T", "briefing sinematik / cinematic briefing"],
  ["W", "War Room: pilih simulasi (Natuna, Cable Cut, Nuclear) / pick a simulation"],
  ["O", "jadwal lintasan satelit di atas Indonesia / satellite pass schedule"],
  ["R", "kembali ke Indonesia / reset view"],
  ["F", "layar penuh / fullscreen"],
  ["L", "ganti bahasa / language"],
  ["S", "peta ↔ citra satelit / map ↔ imagery"],
  ["G", "globe 3D ↔ datar 2D"],
  ["D", "panel data & anggaran / data panel"],
  ["C", "buka asisten ini / open this assistant"],
  ["1-9 0 - = [ ] ;", "nyalakan/matikan lapisan / toggle layers"],
  ["?", "bantuan / help"],
  ["Esc", "tutup / close"],
];

/** Ringkasan aplikasi yang dibagi ke model bahasa. Dijaga pendek supaya hemat token. */
export function ringkasanAplikasi(lang: Lang): string {
  const lapisan = LAPISAN.map((l) => `- [${l.tombol}] ${l.nama[lang]} (${l.jenis}): ${l.deskripsi[lang]}`).join("\n");
  const pintasan = PINTASAN_TEKS.map(([k, v]) => `${k}: ${v}`).join("; ");
  if (lang === "en") {
    return `Eye of Garuda is an open-source interactive 3D globe (MapLibre GL + Next.js) that visualises Indonesia's defence posture from PUBLIC data only. Live at https://eye-of-garuda.vercel.app, source at https://github.com/Avalon2222/eye-of-garuda (MIT).

LAYERS (keyboard key in brackets):
${lapisan}

DATA SOURCES: Wikipedia and official unit pages (TNI bases, ~200 points incl. all Kodam, Korem, Lantamal, Lanal, Lanud; most points snapped to OpenStreetMap positions via the Photon geocoder), Wikidata + CSIS AMTI (~210 foreign bases: US, Australia, China incl. Spratly outposts, India, ASEAN neighbours), public fleet pages (16 submarine home ports in the region incl. Surabaya and Palu for Indonesia), OurAirports (airports), Wikidata (ports), TeleGeography via cut-the-cable (118 cables), Marine Regions (EEZ), CelesTrak TLE + GCAT (satellites, SGP4 propagated in the browser), adsb.lol/airplanes.live (military ADS-B incl. helicopters, tankers, recon; 10 s; each label shows the country, e.g. "RCH123 (USA)"), aisstream.io (ships: live stream when the key is set, plus a snapshot every 30 min), SIPRI Arms Transfers Database 2000–2025 fetched monthly from SIPRI (TIV), Keppres 6/2017 (outer islands).

HONESTY: coordinates are approximate public locations, never operational data. Submarines cannot be tracked live by anyone with public data; the layer shows home ports and fleet sizes only. Only military aircraft broadcasting ADS-B are visible; warships often switch AIS off. The nine-dash line and ALKI are drawn illustratively. Combat radius = plain geometry from public figures. SIPRI TIV is a volume indicator, not money. The three War Room scenarios (key W: "North Natuna Sea crisis", "Cable Cut: Singapore Strait", "Nuclear exchange and Indonesia") are fictional and educational; each can be exported as Markdown, PNG or a screen recording.

UI: left rail = layers (click to toggle; small details only appear as you zoom in), top = Zulu clock + counters + 3D/2D, map/satellite, language; top-right icons = reset, search, briefing, War Room, satellite passes, data panel, share, fullscreen, help. Click any object for a detail panel (satellites show orbit class, speed, period, full orbit line). Lines/areas get highlighted when clicked. During a simulation only the layers it needs are shown; dragging the map or clicking elsewhere stops it and restores your layers. Incident timeline has a draggable slider and play button. URL hash stores camera, layers, language, selection, so views are shareable. A short onboarding guide runs on first visit (replay from Help).
SHORTCUTS: ${pintasan}.`;
  }
  return `Eye of Garuda adalah globe 3D interaktif open-source (MapLibre GL + Next.js) yang memvisualkan postur pertahanan Indonesia dari data PUBLIK saja. Live di https://eye-of-garuda.vercel.app, kode di https://github.com/Avalon2222/eye-of-garuda (MIT).

LAPISAN (tombol keyboard dalam kurung):
${lapisan}

SUMBER DATA: Wikipedia & situs resmi satuan (markas TNI, ~200 titik termasuk semua Kodam, Korem, Lantamal, Lanal, Lanud; sebagian besar titik dicocokkan ke posisi OpenStreetMap lewat geocoder Photon), Wikidata + CSIS AMTI (~210 pangkalan asing: AS, Australia, China termasuk pos di Spratly, India, tetangga ASEAN), halaman armada publik (16 pangkalan kapal selam di kawasan termasuk Surabaya dan Palu untuk Indonesia), OurAirports (bandara), Wikidata (pelabuhan), TeleGeography lewat cut-the-cable (118 kabel), Marine Regions (ZEE), TLE CelesTrak + GCAT (satelit, dipropagasi SGP4 di browser), adsb.lol/airplanes.live (ADS-B militer termasuk helikopter, tanker, pesawat intai; 10 detik; label memuat negara, mis. "RCH123 (USA)"), aisstream.io (kapal: stream live kalau kunci terpasang, plus snapshot tiap 30 menit), SIPRI Arms Transfers Database 2000–2025 diambil bulanan dari SIPRI (TIV), Keppres 6/2017 (pulau terluar).

KEJUJURAN: koordinat adalah perkiraan lokasi umum, bukan data operasional. Kapal selam tidak bisa dilacak live oleh siapa pun dengan data publik; lapisannya hanya pangkalan induk dan jumlah armada. Hanya pesawat militer yang memancarkan ADS-B yang terlihat; kapal perang sering mematikan AIS. Sembilan garis putus dan ALKI digambar ilustratif. Radius tempur = geometri polos dari angka publik. TIV SIPRI indikator volume, bukan uang. Tiga skenario War Room (tombol W: "Krisis Laut Natuna Utara", "Cable Cut: Selat Singapura", "Perang nuklir dan Indonesia") fiktif dan edukatif; tiap skenario bisa diekspor sebagai Markdown, PNG, atau rekaman layar.

UI: rel kiri = lapisan (klik untuk nyala/mati; detail kecil baru muncul saat zoom), atas = jam Zulu + penghitung + 3D/2D, peta/satelit, bahasa; ikon kanan atas = reset, cari, briefing, War Room, jadwal lintasan satelit, panel data, bagikan, layar penuh, bantuan. Klik objek apa pun untuk panel detail (satelit menampilkan kelas orbit, kecepatan, periode, garis orbit penuh). Garis/area disorot saat diklik. Saat simulasi hanya lapisan yang dibutuhkan yang tampil; menggeser peta atau mengklik hal lain menghentikannya dan mengembalikan lapisan pengguna. Lini masa insiden punya slider yang bisa digeser dan tombol putar. Hash URL menyimpan kamera, lapisan, bahasa, pilihan, jadi tampilan bisa dibagikan. Panduan singkat muncul saat kunjungan pertama (bisa diulang dari Bantuan).
PINTASAN: ${pintasan}.`;
}

export interface Faq {
  kunci: string[];
  jawab: { id: string; en: string };
  terbang?: string;
  lapisan?: string;
}

/** FAQ cadangan tanpa AI. Dicocokkan dengan kata kunci sederhana. */
export const FAQ: Faq[] = [
  {
    kunci: ["apa ini", "what is", "eye of garuda", "tentang", "about", "fungsi", "purpose"],
    jawab: {
      id: "Eye of Garuda adalah globe 3D interaktif yang memetakan postur pertahanan Indonesia dari data publik: markas TNI, pangkalan asing di kawasan, pulau terluar, ALKI, kabel bawah laut, bandara, pelabuhan, pesawat militer live, satelit, kapal AIS, ZEE, radius tempur, dan impor senjata SIPRI.",
      en: "Eye of Garuda is an interactive 3D globe mapping Indonesia's defence posture from public data: TNI bases, foreign bases, outer islands, sea lanes, undersea cables, airports, ports, live military aircraft, satellites, AIS ships, EEZ, combat radius and SIPRI arms imports.",
    },
  },
  {
    kunci: ["satelit", "satellite", "orbit", "leo", "geo", "meo"],
    jawab: {
      id: "Lapisan satelit (tombol 8) memuat satelit militer & pengintai dari TLE CelesTrak, dipropagasi SGP4 langsung di browser. Merah = militer asing, kuning = pengintai sipil/komersial asing, hijau = Indonesia. Tinggi di atas globe dipadatkan agar LEO, MEO, GEO terlihat berbeda. Klik satelit untuk melihat kelas orbit, kecepatan, periode, dan garis orbit penuh.",
      en: "The satellite layer (key 8) loads military & reconnaissance satellites from CelesTrak TLEs, propagated with SGP4 in your browser. Red = foreign military, amber = foreign civilian/commercial recon, green = Indonesian. Heights are compressed so LEO, MEO and GEO look different. Click a satellite for orbit class, speed, period and its full orbit line.",
    },
    lapisan: "satelit",
  },
  {
    kunci: ["pesawat", "aircraft", "ads-b", "adsb", "plane", "jet", "helikopter", "helicopter", "tanker"],
    jawab: {
      id: "Lapisan pesawat & helikopter (tombol 7) memakai ADS-B militer dari adsb.lol dan airplanes.live, diperbarui tiap 10 detik dan diekstrapolasi tiap frame. Ikonnya dibedakan: tempur, helikopter (rotor berputar), tanker, angkut, intai. Labelnya memuat negara operator, misalnya \"RCH123 (USA)\". Catatan: hanya pesawat yang memancarkan ADS-B yang terlihat; banyak jet tempur terbang gelap.",
      en: "The aircraft & helicopter layer (key 7) uses military ADS-B from adsb.lol and airplanes.live, refreshed every 10 s and extrapolated every frame. Icons distinguish fighters, helicopters (spinning rotor), tankers, transports and recon. Labels carry the operator country, e.g. \"RCH123 (USA)\". Note: only aircraft broadcasting ADS-B are visible; many fighters fly dark.",
    },
    lapisan: "pesawat",
  },
  {
    kunci: ["kapal", "ship", "ais", "vessel", "tanker"],
    jawab: {
      id: "Lapisan kapal (tombol 6) menggabungkan stream AIS live dari aisstream.io (kapal dengan cincin LIVE, diperbarui tiap menit saat kunci terpasang) dengan snapshot tiap 30 menit dari GitHub Actions, lalu posisinya diekstrapolasi dari haluan dan kecepatan. Cakupan tipis di luar Singapura/Batam, dan kapal perang sering mematikan AIS.",
      en: "The ships layer (key 6) merges a live AIS stream from aisstream.io (ships with a LIVE ring, refreshed every minute when the key is set) with a 30-minute snapshot from GitHub Actions, extrapolating positions from course and speed. Coverage is thin outside Singapore/Batam, and warships often switch AIS off.",
    },
    lapisan: "kapal",
  },
  {
    kunci: ["natuna", "sembilan garis", "nine-dash", "nine dash", "zee", "eez", "klaim", "claim"],
    jawab: {
      id: "Lapisan ZEE (tombol 9) menampilkan ZEE Indonesia (Marine Regions) dan sembilan garis putus China yang digambar ilustratif. Area tumpang tindih di Laut Natuna Utara disorot. Tekan W untuk simulasi skenario fiktif di area itu.",
      en: "The EEZ layer (key 9) shows Indonesia's EEZ (Marine Regions) and an illustrative nine-dash line. The overlap in the North Natuna Sea is highlighted. Press W for a fictional scenario simulation there.",
    },
    terbang: "Natuna",
    lapisan: "zee",
  },
  {
    kunci: ["skenario", "scenario", "simulasi", "simulation", "perang", "war", "rudal", "missile", "war room"],
    jawab: {
      id: "Tekan W (atau ikon pedang di kanan atas) untuk War Room dengan tiga simulasi: \"Krisis Laut Natuna Utara\" (kapal, pesawat, rudal), \"Cable Cut: Selat Singapura\" (kabel putus, reroute internet, kapal reparasi), dan \"Perang nuklir dan Indonesia\" (ICBM, ledakan, EMP, fallout, dampak pangan & BBM). Tiap fase punya jarak, waktu, kesimpulan, dan saran; bisa diekspor .md/.png/video. Semuanya fiktif dan edukatif.",
      en: "Press W (or the swords icon, top right) for the War Room with three simulations: \"North Natuna Sea crisis\" (ships, aircraft, missiles), \"Cable Cut: Singapore Strait\" (severed cables, internet rerouting, repair ships) and \"Nuclear exchange and Indonesia\" (ICBMs, detonations, EMP, fallout, food & fuel impact). Each phase has distances, timings, conclusions and recommendations; export as .md/.png/video. Entirely fictional and educational.",
    },
  },
  {
    kunci: ["nuklir", "nuclear", "bom", "bomb", "emp", "fallout", "icbm"],
    jawab: {
      id: "Skenario \"Perang nuklir dan Indonesia\" (W, lalu pilih Nuclear) menggambarkan pertukaran nuklir hipotetis antara kekuatan besar di kawasan: peluncuran dari kapal selam dan silo, ledakan dengan cincin bola api/5 psi/luka bakar, EMP ketinggian tinggi yang mengganggu satelit dan jaringan listrik, awan fallout mengikuti angin, lalu dampak pangan dan BBM ke Indonesia yang tidak jadi sasaran. Fiktif, angka dari literatur publik.",
      en: "The \"Nuclear exchange and Indonesia\" scenario (W, then Nuclear) depicts a hypothetical exchange between major powers in the region: submarine and silo launches, detonations with fireball/5 psi/burn rings, a high-altitude EMP disrupting satellites and grids, fallout clouds following the wind, then food and fuel impacts on an Indonesia that was never a target. Fictional, figures from public literature.",
    },
  },
  {
    kunci: ["kapal selam", "submarine", "kapalselam", "nagapasa", "scorpene"],
    jawab: {
      id: "Lapisan kapal selam (tombol ;) menampilkan 16 pangkalan induk kapal selam di kawasan beserta jumlah dan kelasnya: Indonesia (Surabaya, Palu), Singapura, Malaysia, Vietnam, Australia, China (Yulin), India, AS (Guam), Jepang, Korea Selatan, Taiwan, Pakistan, Bangladesh, Myanmar, Thailand (rencana). Posisi kapal selam di laut tidak bisa dilacak live oleh siapa pun dengan data publik.",
      en: "The submarine layer (key ;) shows 16 submarine home ports in the region with fleet size and class: Indonesia (Surabaya, Palu), Singapore, Malaysia, Vietnam, Australia, China (Yulin), India, US (Guam), Japan, South Korea, Taiwan, Pakistan, Bangladesh, Myanmar, Thailand (planned). Submarines at sea cannot be tracked live by anyone with public data.",
    },
    lapisan: "kapalselam",
  },
  {
    kunci: ["lintasan", "pass", "lewat", "overpass", "jadwal", "schedule", "kapan satelit"],
    jawab: {
      id: "Tekan O (atau ikon orbit di kanan atas) untuk jadwal lintasan: satelit militer & pengintai LEO mana yang sedang di atas Indonesia dan yang akan lewat 12 jam ke depan, dengan jam masuk (Z/WIB), lama, ketinggian, dan arah. Dihitung SGP4 di browser dari TLE harian. Klik baris untuk terbang ke satelitnya.",
      en: "Press O (or the orbit icon, top right) for the pass schedule: which LEO military & recon satellites are over Indonesia now and which pass in the next 12 hours, with entry time (Z/WIB), duration, altitude and direction. Computed with SGP4 in the browser from daily TLEs. Click a row to fly to that satellite.",
    },
    lapisan: "satelit",
  },
  {
    kunci: ["kabel", "cable", "internet", "landing"],
    jawab: {
      id: "Lapisan kabel (tombol 5) menampilkan 118 kabel bawah laut yang mendarat di atau melintasi Indonesia beserta landing station, dari TeleGeography lewat proyek cut-the-cable. Klik kabel untuk menyorotnya.",
      en: "The cable layer (key 5) shows 118 undersea cables landing in or crossing Indonesia plus landing stations, from TeleGeography via the cut-the-cable project. Click a cable to highlight it.",
    },
    lapisan: "kabel",
  },
  {
    kunci: ["markas", "tni", "kodam", "lanud", "lanal", "korem", "lantamal", "base"],
    jawab: {
      id: "Lapisan Markas TNI (tombol 1) memuat sekitar 200 titik: Mabes, Kogabwilhan, semua Kodam dan Korem, Lantamal dan Lanal, Koarmada, Lanud, Kopassus, Kostrad, Marinir, dan lainnya. Sebagian besar titik dicocokkan ke lokasi OpenStreetMap lewat geocoder; sisanya memakai pusat kota (ditandai di panel detail). Markas besar tampil dari jauh, Korem/Lanal muncul saat zoom. Gunakan Ctrl K untuk mencari nama satuan.",
      en: "The TNI bases layer (key 1) holds about 200 points: HQ, joint commands, all Kodam and Korem, Lantamal and Lanal, fleets, air bases, special forces, Kostrad, Marines and more. Most points are snapped to OpenStreetMap locations via a geocoder; the rest use city centres (flagged in the detail panel). Major HQs show from afar, Korem/Lanal appear as you zoom. Use Ctrl K to search a unit by name.",
    },
    lapisan: "tni",
  },
  {
    kunci: ["asing", "foreign", "china", "amerika", "us base", "australia", "spratly", "darwin", "changi"],
    jawab: {
      id: "Lapisan pangkalan asing (tombol 2) memuat sekitar 210 pangkalan AS, Australia, China (termasuk pos pulau buatan di Spratly), India, dan negara tetangga, dari Wikidata dan CSIS AMTI. Labelnya sengaja netral: sebagian besar milik negara mitra Indonesia.",
      en: "The foreign bases layer (key 2) holds about 210 US, Australian, Chinese (incl. Spratly outposts), Indian and neighbouring-country bases from Wikidata and CSIS AMTI. The label is deliberately neutral: most belong to Indonesia's partners.",
    },
    lapisan: "asing",
  },
  {
    kunci: ["bandara", "airport", "pelabuhan", "port", "harbour"],
    jawab: {
      id: "Bandara (tombol [) berasal dari OurAirports: bandara besar/sedang di kawasan plus lapangan udara militer. Pelabuhan (tombol ]) berasal dari Wikidata. Keduanya bisa dicari lewat Ctrl K.",
      en: "Airports (key [) come from OurAirports: large/medium airports in the region plus military airfields. Ports (key ]) come from Wikidata. Both are searchable with Ctrl K.",
    },
  },
  {
    kunci: ["sipri", "impor", "import", "senjata", "arms", "busur", "arc"],
    jawab: {
      id: "Lapisan SIPRI (tombol -) menggambar busur dari 25 negara pemasok senjata ke Indonesia, 2000–2025, diambil langsung dari SIPRI Arms Transfers Database dan diperbarui tiap bulan. Angkanya TIV (indikator volume), bukan harga. Panel legenda di kanan atas bisa dilipat.",
      en: "The SIPRI layer (key -) draws arcs from 25 arms suppliers to Indonesia, 2000–2025, pulled straight from the SIPRI Arms Transfers Database and refreshed monthly. Values are TIV (a volume indicator), not prices. The legend panel (top right) can be collapsed.",
    },
    lapisan: "sipri",
  },
  {
    kunci: ["radius", "jangkauan", "range", "rafale", "f-16", "su-30"],
    jawab: {
      id: "Radius tempur (tombol 0) adalah lingkaran jarak geometris Rafale, F-16, dan Su-30 dari tiap Lanud, dari angka publik, tanpa tanker dan tanpa profil misi. Klik lingkaran untuk menyorotnya.",
      en: "Combat radius (key 0) draws plain geometric circles for Rafale, F-16 and Su-30 reach from each air base, from public figures, without tankers or mission profiles. Click a circle to highlight it.",
    },
    lapisan: "radius",
  },
  {
    kunci: ["pintasan", "shortcut", "keyboard", "tombol", "cara pakai", "how to", "bantuan", "help"],
    jawab: {
      id: "Pintasan: Ctrl K cari, T briefing, W War Room, O jadwal satelit, R kembali ke Indonesia, F layar penuh, L bahasa, S peta/satelit, G 3D/2D, D panel data, C asisten, 1-9 0 - = [ ] ; lapisan, ? bantuan, Esc tutup. Klik objek apa pun untuk detailnya. Panduan singkat bisa diulang dari Bantuan.",
      en: "Shortcuts: Ctrl K search, T briefing, W War Room, O satellite passes, R reset to Indonesia, F fullscreen, L language, S map/imagery, G 3D/2D, D data panel, C assistant, 1-9 0 - = [ ] ; layers, ? help, Esc close. Click any object for details. The quick guide can be replayed from Help.",
    },
  },
  {
    kunci: ["sumber", "source", "data dari", "akurat", "accurate", "valid"],
    jawab: {
      id: "Semua data publik: Wikipedia, Wikidata, CSIS AMTI, OurAirports, TeleGeography, Marine Regions, CelesTrak, adsb.lol, aisstream.io, SIPRI. Koordinat adalah perkiraan lokasi umum, bukan data operasional. Rincian ada di data/SUMBER_DATA.md di repositori.",
      en: "All data is public: Wikipedia, Wikidata, CSIS AMTI, OurAirports, TeleGeography, Marine Regions, CelesTrak, adsb.lol, aisstream.io, SIPRI. Coordinates are approximate public locations, not operational data. Details in data/SUMBER_DATA.md in the repository.",
    },
  },
  {
    kunci: ["lambat", "slow", "lag", "hp", "ponsel", "mobile", "phone"],
    jawab: {
      id: "Di HP, matikan beberapa lapisan berat (bandara, pelabuhan, SIPRI) lewat chip di bawah. Satelit dan pesawat digambar di kanvas terpisah supaya ringan. Mode 2D (G) juga lebih ringan dari globe.",
      en: "On phones, switch off heavier layers (airports, ports, SIPRI) via the chips at the bottom. Satellites and aircraft are drawn on a separate canvas to stay light. 2D mode (G) is also lighter than the globe.",
    },
  },
];

export function jawabFaq(q: string, lang: Lang): { teks: string; terbang?: string; lapisan?: string } | null {
  const s = q.toLowerCase();
  let terbaik: Faq | null = null;
  let nilai = 0;
  for (const f of FAQ) {
    const n = f.kunci.filter((k) => s.includes(k)).length;
    if (n > nilai) {
      nilai = n;
      terbaik = f;
    }
  }
  if (!terbaik) return null;
  return { teks: terbaik.jawab[lang], terbang: terbaik.terbang, lapisan: terbaik.lapisan };
}
