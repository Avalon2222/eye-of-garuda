/**
 * Fakta siap pakai untuk asisten. Sebelum pertanyaan dikirim ke model bahasa, server menebak maksudnya
 * (yang terdekat, berapa jumlahnya, berapa jaraknya, di mana letaknya) lalu menghitung jawabannya langsung
 * dari data peta. Hasilnya ditempel ke pertanyaan sebagai DATA, jadi model tinggal merangkai kalimat.
 * Kalau semua model sedang tidak bisa dipakai, teks ini juga yang dikirim sebagai jawaban.
 */

import { cariObjek, hitung, jarak, selesaikanTempat, terdekat, type HasilCari, type Kelompok, type Tempat } from "./alat";
import { NAMA_LAPISAN_CHAT, normal, normalNegara, type LapisanChat, type ObjekPeta } from "./indeks";
import { GAZETIR } from "./tempat";

type Lang = "id" | "en";

export interface Fakta {
  /** baris-baris fakta, sudah dalam bahasa pengguna */
  teks: string;
  /** alat yang dipakai untuk menghitungnya (untuk log) */
  alat: string[];
  /** nama objek yang layak didatangi globe */
  terbang?: string;
  /** lapisan chat yang relevan */
  lapisan?: LapisanChat;
  /** nama dan angka kunci yang harus muncul di jawaban model; kalau tidak ada, jawaban model tidak dipakai */
  wajib: string[];
}

/** Koordinat dengan belahan bumi yang ditulis jelas, supaya model tidak salah membaca tanda minus. */
export function teksKoordinat(lat: number, lon: number, lang: Lang): string {
  const ns = lat >= 0 ? (lang === "en" ? "N" : "LU") : lang === "en" ? "S" : "LS";
  const ew = lon >= 0 ? (lang === "en" ? "E" : "BT") : lang === "en" ? "W" : "BB";
  const a = Math.abs(lat);
  const b = Math.abs(lon);
  return lang === "en" ? `${a}°${ns}, ${b}°${ew}` : `${a}° ${ns}, ${b}° ${ew}`;
}

/** Benar kalau semua nama dan angka kunci dari fakta muncul di jawaban. */
export function jawabanSesuai(jawaban: string, wajib: string[]): boolean {
  // "1.018 km" atau "1,018 km" disamakan jadi "1018"
  const rapat = normal(jawaban.replace(/(\d)[.,\s](?=\d{3}(?!\d))/g, "$1"));
  return wajib.every((w) => {
    const dicari = /^[\d.,]+$/.test(w) ? w.replace(/[.,]/g, "") : normal(w.replace(/\(.*?\)/g, " "));
    return !dicari || ` ${rapat} `.includes(/^\d+$/.test(dicari) ? dicari : ` ${dicari} `);
  });
}

const ARAH_EN: Record<string, string> = {
  utara: "north",
  "timur laut": "north-east",
  timur: "east",
  tenggara: "south-east",
  selatan: "south",
  "barat daya": "south-west",
  barat: "west",
  "barat laut": "north-west",
};

interface PetunjukLapisan {
  lapisan: LapisanChat;
  kata: string[];
  /** saringan jenis yang ikut dipakai kalau kata ini yang kena */
  jenis?: string;
}

/** Urutan penting: yang lebih spesifik dulu ("kapal selam" sebelum "pangkalan"). */
const PETUNJUK: PetunjukLapisan[] = [
  { lapisan: "kapalselam", kata: ["kapal selam", "submarine", "submarines", "kapalselam"] },
  { lapisan: "landing", kata: ["landing station", "landing stations", "landing", "stasiun kabel", "titik pendaratan"] },
  { lapisan: "kabel", kata: ["kabel", "cable", "cables"] },
  { lapisan: "bandara", kata: ["bandara militer", "military airport", "military airfield"], jenis: "militer" },
  { lapisan: "bandara", kata: ["bandara", "bandar udara", "airport", "airports", "lapangan udara", "airfield", "airfields"] },
  { lapisan: "pelabuhan", kata: ["pelabuhan", "port", "ports", "harbor", "harbour", "dermaga"] },
  { lapisan: "batas", kata: ["pulau terluar", "pulau terdepan", "perbatasan", "plbn", "outer island", "outer islands", "border post", "border posts"] },
  { lapisan: "insiden", kata: ["insiden", "incident", "incidents", "latihan", "exercise", "exercises"] },
  { lapisan: "asing", kata: ["pangkalan asing", "pangkalan militer asing", "foreign base", "foreign bases", "foreign military", "asing"] },
  { lapisan: "tni", kata: ["lanud"], jenis: "Lanud" },
  { lapisan: "tni", kata: ["lanal"], jenis: "Lanal" },
  { lapisan: "tni", kata: ["lantamal"], jenis: "Lantamal" },
  { lapisan: "tni", kata: ["korem"], jenis: "Korem" },
  { lapisan: "tni", kata: ["kodam"], jenis: "Kodam" },
  { lapisan: "tni", kata: ["koarmada"], jenis: "Koarmada" },
  { lapisan: "tni", kata: ["markas tni", "pangkalan tni", "tni", "kogabwilhan", "kostrad", "kopassus", "marinir", "indonesian base", "indonesian bases", "indonesian military"] },
];

const KATA_PANGKALAN = ["pangkalan", "markas", "base", "bases"];

const RE_TERDEKAT = /\b(terdekat|paling dekat|nearest|closest|dekat dari|dekat dengan|close to)\b/;
const RE_JARAK = /\b(jarak|berapa km|berapa kilometer|berapa jauh|seberapa jauh|how far|distance)\b/;
const RE_HITUNG = /\b(berapa|jumlah|how many|number of|banyaknya|total|terbanyak|paling banyak|most|tersedikit|paling sedikit|fewest)\b/;
const RE_LETAK = /\b(di mana|dimana|where|letak|lokasi|located|apa itu|what is|siapa|tunjukkan|show me)\b/;

const WILAYAH_TAMBAHAN = ["papua", "jawa", "sumatera", "kalimantan", "sulawesi", "maluku", "nusa tenggara", "kepulauan riau", "riau"];

function ada(q: string, frasa: string): boolean {
  return ` ${q} `.includes(` ${frasa} `);
}

function tebakLapisan(mentah: string): { lapisan: LapisanChat; jenis?: string }[] {
  // akhiran -nya dilepas supaya "pangkalannya" tetap terbaca "pangkalan"
  const q = mentah.replace(/([a-z]{4,})nya\b/g, "$1");
  const hasil: { lapisan: LapisanChat; jenis?: string }[] = [];
  for (const p of PETUNJUK) {
    if (hasil.some((h) => h.lapisan === p.lapisan)) continue;
    if (p.kata.some((k) => ada(q, k))) hasil.push({ lapisan: p.lapisan, jenis: p.jenis });
  }
  // "kabel terdekat" maksudnya titik daratnya, dan satu lapisan saja cukup untuk kabel
  if (hasil.some((h) => h.lapisan === "landing")) return hasil.filter((h) => h.lapisan !== "kabel");
  return hasil;
}

/** Negara yang disebut di pertanyaan (di luar frasa tempat asal). */
function tebakNegara(indeks: ObjekPeta[], mentah: string, q: string): string | undefined {
  if (/\b(AS|US|USA)\b/.test(mentah)) return "Amerika Serikat";
  const dikenal = new Map<string, string>();
  for (const o of indeks) if (o.negara) dikenal.set(normalNegara(o.negara), o.negara);
  let terbaik: string | undefined;
  let panjang = 0;
  const kata = q.split(" ");
  for (let n = 3; n >= 1; n--) {
    for (let i = 0; i + n <= kata.length; i++) {
      const frasa = kata.slice(i, i + n).join(" ");
      if (frasa.length < 4) continue;
      const nama = dikenal.get(normalNegara(frasa));
      if (nama && frasa.length > panjang) {
        terbaik = nama;
        panjang = frasa.length;
      }
    }
  }
  return terbaik;
}

function tebakWilayah(indeks: ObjekPeta[], q: string): string | undefined {
  const kandidat = new Set<string>(WILAYAH_TAMBAHAN);
  for (const o of indeks) if ((o.lapisan === "tni" || o.lapisan === "batas") && o.wilayah) kandidat.add(normal(o.wilayah));
  let terbaik: string | undefined;
  for (const w of kandidat) if (ada(q.replace(/\bsumatra\b/g, "sumatera"), w) && (!terbaik || w.length > terbaik.length)) terbaik = w;
  return terbaik;
}

/** Selesaikan frasa jadi tempat; kalau gagal, buang kata dari belakang satu per satu. */
function tempatDariFrasa(indeks: ObjekPeta[], frasa: string): Tempat | null {
  const kata = frasa.trim().split(/\s+/).slice(0, 6);
  for (let n = kata.length; n >= 1; n--) {
    const t = selesaikanTempat(indeks, kata.slice(0, n).join(" "), { ketat: true });
    if (t) return t;
  }
  return null;
}

/** Tempat yang disebut di mana pun dalam kalimat: nama tempat umum, atau nama lengkap objek di peta. */
function tempatDalamKalimat(indeks: ObjekPeta[], q: string): Tempat | null {
  let terbaik: Tempat | null = null;
  let panjang = 0;
  for (const g of GAZETIR) {
    for (const k of g.kunci) {
      if (k.length > panjang && ada(q, k)) {
        terbaik = { nama: g.nama, lon: g.lon, lat: g.lat, asal: "tempat" };
        panjang = k.length;
      }
    }
  }
  for (const o of indeks) {
    if (o.lon == null || o.lat == null) continue;
    const pendek = normal(o.nama.replace(/\(.*?\)/g, " "));
    if (pendek.length >= 6 && pendek.includes(" ") && pendek.length > panjang && ada(q, pendek)) {
      terbaik = { nama: o.nama, lon: o.lon, lat: o.lat, asal: "objek", id: o.id };
      panjang = pendek.length;
    }
  }
  return terbaik;
}

const RE_ASAL = /\b(?:dari|from|dengan|near|sekitar|around|close to|to|ke)\s+([^?.,;!]+)/gi;

function tebakAsal(indeks: ObjekPeta[], mentah: string, q: string): Tempat | null {
  for (const m of mentah.matchAll(RE_ASAL)) {
    const t = tempatDariFrasa(indeks, m[1]);
    if (t) return t;
  }
  return tempatDalamKalimat(indeks, q);
}

function barisObjek(o: HasilCari, lang: Lang): string {
  const bagian = [o.negara && o.negara !== "Indonesia" ? o.negara : "", o.matra, o.jenis, o.wilayah && o.wilayah !== o.negara ? o.wilayah : ""].filter(Boolean);
  const koordinat = o.lat != null && o.lon != null ? ` @ ${teksKoordinat(o.lat, o.lon, lang)}` : "";
  const catatan = o.catatan ? ` (${o.catatan})` : "";
  return `${o.nama} [${NAMA_LAPISAN_CHAT[o.lapisan][lang]}${bagian.length ? `; ${bagian.join(", ")}` : ""}]${koordinat}${catatan}`;
}

function faktaTerdekat(indeks: ObjekPeta[], asal: Tempat, lapisan: LapisanChat, lang: Lang, saring: { negara?: string; jenis?: string }): { teks: string; pertama: string; km: number } | null {
  const lap: LapisanChat = lapisan === "kabel" ? "landing" : lapisan;
  // tempat asal sudah berupa koordinat, jadi dikirim sebagai "lat, lon" supaya tidak diselesaikan dua kali
  const r = terdekat(indeks, { dari: `${asal.lat}, ${asal.lon}`, lapisan: lap, jumlah: 5, negara: saring.negara, jenis: saring.jenis });
  const hasil = r.hasil.filter((h) => !(asal.asal === "objek" && h.nama === asal.nama));
  if (hasil.length === 0) return null;
  const apa = [NAMA_LAPISAN_CHAT[lap][lang], saring.jenis, saring.negara].filter(Boolean).join(" · ");
  const kepala = lang === "en" ? `Nearest ${apa} to ${asal.nama} (great-circle distance):` : `${apa[0].toUpperCase()}${apa.slice(1)} terdekat dari ${asal.nama} (jarak garis lurus):`;
  const baris = hasil.map((h, i) => {
    // pangkalan asing: tampilkan operator lengkap, mis. "Singapura (+ AS akses)"
    const operator = h.catatan.match(/^operator: ([^;]+)/)?.[1];
    const negara = operator ?? (h.negara && h.negara !== "Indonesia" ? h.negara : "");
    const pemilik = [negara, h.jenis, h.wilayah && h.wilayah !== h.negara ? h.wilayah : ""].filter(Boolean).join(", ");
    const arah = lang === "en" ? `to the ${ARAH_EN[h.arah] ?? h.arah}` : `ke arah ${h.arah}`;
    return `${i + 1}. ${h.nama}${pemilik ? ` (${pemilik})` : ""}: ${h.km.toLocaleString("en-US")} km ${arah}`;
  });
  return { teks: [kepala, ...baris].join("\n"), pertama: hasil[0].nama, km: hasil[0].km };
}

function faktaHitung(indeks: ObjekPeta[], lapisan: LapisanChat, lang: Lang, saring: string | undefined, kelompok: Kelompok[]): { teks: string; total: number } {
  const nama = NAMA_LAPISAN_CHAT[lapisan][lang];
  const total = hitung(indeks, { lapisan, saring });
  const dengan = saring ? (lang === "en" ? ` matching "${saring}"` : ` yang cocok dengan "${saring}"`) : "";
  const baris = [lang === "en" ? `Count of ${nama}${dengan} in the map data: ${total.total}.` : `Jumlah ${nama}${dengan} di data peta: ${total.total}.`];
  if (total.total > 0) {
    for (const k of kelompok) {
      const r = hitung(indeks, { lapisan, saring, kelompok: k });
      if (!r.rincian || r.rincian.length < 2) continue;
      const label = { jenis: lang === "en" ? "By type" : "Per jenis", negara: lang === "en" ? "By country" : "Per negara", wilayah: lang === "en" ? "By region" : "Per wilayah", matra: lang === "en" ? "By service" : "Per matra" }[k];
      baris.push(`${label}: ${r.rincian.slice(0, 20).map(([n, j]) => `${n} ${j}`).join(", ")}.`);
    }
  }
  return { teks: baris.join("\n"), total: total.total };
}

/** Pisahkan "A ke B" / "between A and B" / "A from B" jadi dua tempat. */
function duaTempat(indeks: ObjekPeta[], mentah: string): [Tempat, Tempat] | null {
  const bersih = mentah.replace(/[?!]/g, " ").replace(/\b(berapa|jarak|jauh|seberapa|km|kilometer|how far|distance|is it|is|the|antara|between)\b/gi, " ");
  const m = bersih.match(/^(.*?)\s+(?:ke|to|dan|and|dengan|sampai|hingga|dari|from)\s+(.+)$/i);
  if (!m) return null;
  const kiri = m[1].replace(/\b(dari|from)\b/gi, " ").trim();
  const a = tempatDariFrasa(indeks, kiri.split(/\s+/).slice(-5).join(" ")) ?? tempatDalamKalimat(indeks, normal(kiri));
  const b = tempatDariFrasa(indeks, m[2]) ?? tempatDalamKalimat(indeks, normal(m[2]));
  return a && b ? [a, b] : null;
}

/** Tebak maksud pertanyaan dan hitung jawabannya dari data. Null kalau tidak ada yang bisa dihitung. */
export function siapkanFakta(indeks: ObjekPeta[], pertanyaan: string, lang: Lang): Fakta | null {
  const mentah = pertanyaan.slice(0, 500);
  const q = normal(mentah);
  if (!q) return null;
  const blok: string[] = [];
  const alat: string[] = [];
  const wajib: string[] = [];
  let terbang: string | undefined;
  // kata lapisan di dalam frasa tempat asal ("terdekat dari Lanal Tarempa") bukan lapisan yang ditanyakan
  const tanpaAsal = tebakLapisan(normal(mentah.replace(RE_ASAL, " ")));
  const lapisan = tanpaAsal.length ? tanpaAsal : tebakLapisan(q);
  let lapisanUtama: LapisanChat | undefined = lapisan[0]?.lapisan;

  if (RE_JARAK.test(q)) {
    const dua = duaTempat(indeks, mentah);
    if (dua) {
      const r = jarak(indeks, `${dua[0].lat}, ${dua[0].lon}`, `${dua[1].lat}, ${dua[1].lon}`);
      if (r.km != null) {
        const arah = lang === "en" ? (ARAH_EN[r.arah ?? ""] ?? r.arah) : r.arah;
        blok.push(
          lang === "en"
            ? `Great-circle distance ${dua[0].nama} → ${dua[1].nama}: ${r.km.toLocaleString("en-US")} km (${r.mil_laut?.toLocaleString("en-US")} nautical miles), heading ${arah}.`
            : `Jarak garis lurus ${dua[0].nama} → ${dua[1].nama}: ${r.km.toLocaleString("en-US")} km (${r.mil_laut?.toLocaleString("en-US")} mil laut), ke arah ${arah}.`,
        );
        alat.push("jarak");
        wajib.push(String(r.km));
        terbang = dua[1].asal === "objek" ? dua[1].nama : dua[0].asal === "objek" ? dua[0].nama : undefined;
      }
    }
  }

  if (blok.length === 0 && RE_TERDEKAT.test(q)) {
    const asal = tebakAsal(indeks, mentah, q);
    if (asal) {
      const negara = tebakNegara(indeks, mentah, normal(mentah.replace(RE_ASAL, " ")));
      let target = lapisan.slice(0, 2);
      const sebutPangkalan = KATA_PANGKALAN.some((k) => ada(q, k));
      if (negara && negara !== "Indonesia" && sebutPangkalan && !target.some((t) => t.lapisan === "asing")) target = [{ lapisan: "asing" }];
      if (target.length === 0) target = [{ lapisan: "tni" }, { lapisan: "asing" }];
      for (const t of target) {
        const pakaiNegara = t.lapisan === "tni" || t.lapisan === "batas" || negara === "Indonesia" ? undefined : negara;
        const f = faktaTerdekat(indeks, asal, t.lapisan, lang, { negara: pakaiNegara, jenis: t.jenis });
        if (!f) continue;
        // yang wajib disebut cukup jawaban utama (blok pertama)
        if (blok.length === 0) wajib.push(f.pertama, String(f.km));
        blok.push(f.teks);
        terbang = terbang ?? f.pertama;
        lapisanUtama = lapisanUtama ?? t.lapisan;
      }
      if (blok.length) alat.push("terdekat");
    }
  }

  // "negara mana yang pangkalannya paling banyak": pangkalan per negara berarti lapisan pangkalan asing
  const qDasar = q.replace(/([a-z]{4,})nya\b/g, "$1");
  const lapisanHitung = lapisan.length || !/\b(negara|country|countries)\b/.test(q) || !KATA_PANGKALAN.some((k) => ada(qDasar, k)) ? lapisan : [{ lapisan: "asing" as LapisanChat }];
  if (blok.length === 0 && RE_HITUNG.test(q) && lapisanHitung.length) {
    lapisanUtama ??= lapisanHitung[0].lapisan;
    for (const t of lapisanHitung.slice(0, 2)) {
      const negara = t.lapisan === "tni" || t.lapisan === "batas" || t.lapisan === "kabel" || t.lapisan === "insiden" ? undefined : tebakNegara(indeks, mentah, q);
      const wilayah = t.lapisan === "tni" || t.lapisan === "batas" ? tebakWilayah(indeks, q) : undefined;
      const saring = wilayah ?? negara ?? t.jenis;
      const kelompok: Kelompok[] =
        t.lapisan === "tni" ? (wilayah ? ["wilayah", "jenis"] : t.jenis ? ["wilayah"] : ["matra", "jenis"]) : t.lapisan === "asing" ? (negara ? ["wilayah", "jenis"] : ["negara"]) : t.lapisan === "batas" || t.lapisan === "kabel" || t.lapisan === "insiden" ? ["jenis"] : negara ? ["jenis"] : ["negara"];
      const f = faktaHitung(indeks, t.lapisan, lang, saring, kelompok);
      if (wajib.length === 0) wajib.push(String(f.total));
      blok.push(f.teks);
    }
    alat.push("hitung");
  }

  // objek yang namanya disebut: selalu berguna sebagai pegangan, dan jadi jawaban untuk "X di mana?"
  if (blok.length === 0 || RE_LETAK.test(q)) {
    const kueri = mentah.replace(/[?!.,]/g, " ").replace(/\b(di mana|dimana|where is|where|letak|lokasi|apa itu|what is|tunjukkan|show me|tolong|please|itu|the|ada|berada|located)\b/gi, " ");
    const cocok = cariObjek(indeks, kueri, { batas: 4 });
    const kuat = cocok.filter((c) => normal(kueri).split(" ").some((k) => k.length >= 4 && ` ${normal(c.nama)} `.includes(` ${k} `)));
    if (kuat.length) {
      blok.push([lang === "en" ? "Map objects matching the question:" : "Objek peta yang cocok dengan pertanyaan:", ...kuat.map((c) => `- ${barisObjek(c, lang)}`)].join("\n"));
      alat.push("cari_objek");
      // kalau cuma ditanya letaknya, nama objek yang paling cocok harus disebut apa adanya
      if (blok.length === 1) wajib.push(kuat[0].nama);
      terbang = terbang ?? kuat[0].nama;
      lapisanUtama = lapisanUtama ?? kuat[0].lapisan;
    }
  }

  if (blok.length === 0) return null;
  return { teks: blok.join("\n\n"), alat, terbang, lapisan: lapisanUtama, wajib };
}

/** Lapisan chat → id lapisan di antarmuka (landing station ikut lapisan kabel). */
export function lapisanAntarmuka(l: LapisanChat): string {
  return l === "landing" ? "kabel" : l;
}
