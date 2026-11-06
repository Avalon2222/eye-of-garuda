/**
 * Pengetahuan dasar tentang Eye of Garuda untuk asisten obrolan: dipakai sebagai system prompt di server
 * dan sebagai FAQ cadangan di browser kalau layanan AI tidak tersedia (kunci belum dipasang / kuota habis).
 */

import { LAPISAN } from "./layers";
import type { Lang } from "./i18n";

export const PINTASAN_TEKS = [
  ["Ctrl K", "cari entitas / search"],
  ["T", "briefing tur / guided tour"],
  ["W", "simulasi skenario / scenario simulation"],
  ["R", "kembali ke Indonesia / reset view"],
  ["F", "layar penuh / fullscreen"],
  ["L", "ganti bahasa / language"],
  ["S", "peta ↔ citra satelit / map ↔ imagery"],
  ["G", "globe 3D ↔ datar 2D"],
  ["D", "panel data & anggaran / data panel"],
  ["C", "buka asisten ini / open this assistant"],
  ["1-9 0 - = [ ]", "nyalakan/matikan lapisan / toggle layers"],
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

DATA SOURCES: Wikipedia and official unit pages (TNI bases, ~200 points incl. all Kodam, Korem, Lantamal, Lanal, Lanud), Wikidata + CSIS AMTI (~210 foreign bases: US, Australia, China incl. Spratly outposts, India, ASEAN neighbours), OurAirports (airports), Wikidata (ports), TeleGeography via cut-the-cable (118 cables), Marine Regions (EEZ), CelesTrak TLE + GCAT (satellites, SGP4 propagated in the browser), adsb.lol/airplanes.live (military ADS-B, 10 s), aisstream.io snapshot every 30 min (ships), SIPRI Arms Transfers (TIV), Keppres 6/2017 (outer islands).

HONESTY: coordinates are approximate public locations, never operational data. Korem/Lanal points use city/port centres. Only military aircraft broadcasting ADS-B are visible; warships often switch AIS off. The nine-dash line and ALKI are drawn illustratively. Combat radius = plain geometry from public figures. SIPRI TIV is a volume indicator, not money. The scenario (key W, "North Natuna Sea crisis") is fictional and educational.

UI: left rail = layers (click to toggle), top = Zulu clock + counters + 3D/2D, map/satellite, language; top-right icons = reset, search, tour, scenario, data panel, share, fullscreen, help. Click any object for a detail panel (satellites show orbit class, speed, period, full orbit line). Lines/areas get highlighted when clicked. URL hash stores camera, layers, language, selection, so views are shareable.
SHORTCUTS: ${pintasan}.`;
  }
  return `Eye of Garuda adalah globe 3D interaktif open-source (MapLibre GL + Next.js) yang memvisualkan postur pertahanan Indonesia dari data PUBLIK saja. Live di https://eye-of-garuda.vercel.app, kode di https://github.com/Avalon2222/eye-of-garuda (MIT).

LAPISAN (tombol keyboard dalam kurung):
${lapisan}

SUMBER DATA: Wikipedia & situs resmi satuan (markas TNI, ~200 titik termasuk semua Kodam, Korem, Lantamal, Lanal, Lanud), Wikidata + CSIS AMTI (~210 pangkalan asing: AS, Australia, China termasuk pos di Spratly, India, tetangga ASEAN), OurAirports (bandara), Wikidata (pelabuhan), TeleGeography lewat cut-the-cable (118 kabel), Marine Regions (ZEE), TLE CelesTrak + GCAT (satelit, dipropagasi SGP4 di browser), adsb.lol/airplanes.live (ADS-B militer, 10 detik), snapshot aisstream.io tiap 30 menit (kapal), SIPRI Arms Transfers (TIV), Keppres 6/2017 (pulau terluar).

KEJUJURAN: koordinat adalah perkiraan lokasi umum, bukan data operasional. Titik Korem/Lanal memakai pusat kota/pelabuhan. Hanya pesawat militer yang memancarkan ADS-B yang terlihat; kapal perang sering mematikan AIS. Sembilan garis putus dan ALKI digambar ilustratif. Radius tempur = geometri polos dari angka publik. TIV SIPRI indikator volume, bukan uang. Skenario (tombol W, "Krisis Laut Natuna Utara") fiktif dan edukatif.

UI: rel kiri = lapisan (klik untuk nyala/mati), atas = jam Zulu + penghitung + 3D/2D, peta/satelit, bahasa; ikon kanan atas = reset, cari, tur, skenario, panel data, bagikan, layar penuh, bantuan. Klik objek apa pun untuk panel detail (satelit menampilkan kelas orbit, kecepatan, periode, garis orbit penuh). Garis/area disorot saat diklik. Hash URL menyimpan kamera, lapisan, bahasa, pilihan, jadi tampilan bisa dibagikan.
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
    kunci: ["pesawat", "aircraft", "ads-b", "adsb", "plane", "jet"],
    jawab: {
      id: "Lapisan pesawat (tombol 7) memakai ADS-B militer dari adsb.lol dan airplanes.live, diperbarui tiap 10 detik dan diekstrapolasi tiap frame. Catatan: hanya pesawat yang memancarkan ADS-B yang terlihat; banyak jet tempur terbang gelap.",
      en: "The aircraft layer (key 7) uses military ADS-B from adsb.lol and airplanes.live, refreshed every 10 s and extrapolated every frame. Note: only aircraft broadcasting ADS-B are visible; many fighters fly dark.",
    },
    lapisan: "pesawat",
  },
  {
    kunci: ["kapal", "ship", "ais", "vessel", "tanker"],
    jawab: {
      id: "Lapisan kapal (tombol 6) adalah snapshot AIS dari aisstream.io yang diambil tiap 30 menit oleh GitHub Actions, lalu posisinya diekstrapolasi dari haluan dan kecepatan. Cakupan tipis di luar Singapura/Batam, dan kapal perang sering mematikan AIS.",
      en: "The ships layer (key 6) is an AIS snapshot from aisstream.io taken every 30 minutes by GitHub Actions, with positions extrapolated from course and speed. Coverage is thin outside Singapore/Batam, and warships often switch AIS off.",
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
    kunci: ["skenario", "scenario", "simulasi", "simulation", "perang", "war", "rudal", "missile"],
    jawab: {
      id: "Tekan W (atau ikon pedang di kanan atas) untuk simulasi \"Krisis Laut Natuna Utara\": 5 fase dengan animasi kapal, pesawat, dan rudal, lengkap dengan jarak, waktu tempuh, kesimpulan, dan saran. Semuanya fiktif dan edukatif; posisi pangkalan dari data publik.",
      en: "Press W (or the swords icon, top right) for the \"North Natuna Sea crisis\" simulation: 5 phases with animated ships, aircraft and missiles, plus distances, travel times, conclusions and recommendations. Entirely fictional and educational; base positions from public data.",
    },
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
      id: "Lapisan Markas TNI (tombol 1) memuat sekitar 200 titik: Mabes, Kogabwilhan, semua Kodam dan Korem, Lantamal dan Lanal, Koarmada, Lanud, Kopassus, Kostrad, Marinir, dan lainnya. Koordinat Korem/Lanal memakai pusat kota/pelabuhan (perkiraan). Gunakan Ctrl K untuk mencari nama satuan.",
      en: "The TNI bases layer (key 1) holds about 200 points: HQ, joint commands, all Kodam and Korem, Lantamal and Lanal, fleets, air bases, special forces, Kostrad, Marines and more. Korem/Lanal coordinates use city/port centres (approximate). Use Ctrl K to search a unit by name.",
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
      id: "Lapisan SIPRI (tombol -) menggambar busur dari negara pemasok senjata ke Indonesia, 2000–2024, dari SIPRI Arms Transfers Database. Angkanya TIV (indikator volume), bukan harga, dan dibulatkan.",
      en: "The SIPRI layer (key -) draws arcs from arms suppliers to Indonesia, 2000–2024, from the SIPRI Arms Transfers Database. Values are TIV (a volume indicator), not prices, and rounded.",
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
      id: "Pintasan: Ctrl K cari, T tur, W skenario, R kembali ke Indonesia, F layar penuh, L bahasa, S peta/satelit, G 3D/2D, D panel data, C asisten, 1-9 0 - = [ ] lapisan, ? bantuan, Esc tutup. Klik objek apa pun untuk detailnya.",
      en: "Shortcuts: Ctrl K search, T tour, W scenario, R reset to Indonesia, F fullscreen, L language, S map/imagery, G 3D/2D, D data panel, C assistant, 1-9 0 - = [ ] layers, ? help, Esc close. Click any object for details.",
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
