/**
 * Daftar tempat umum (kota, pulau, selat, laut) yang sering disebut di pertanyaan tetapi bukan objek di peta.
 * Koordinat adalah titik tengah kira-kira, cukup untuk menghitung "yang terdekat dari ...".
 */

import { normal } from "./indeks";

interface TempatUmum {
  nama: string;
  /** nama lain; semuanya sudah dinormalkan saat modul dimuat */
  kunci: string[];
  lon: number;
  lat: number;
}

const MENTAH: [string, string[], number, number][] = [
  // Indonesia
  ["Natuna (Ranai)", ["natuna", "ranai", "natuna besar", "kepulauan natuna"], 108.39, 3.94],
  ["Jakarta", ["jakarta", "dki jakarta", "ibu kota"], 106.83, -6.18],
  ["Surabaya", ["surabaya"], 112.75, -7.25],
  ["Bandung", ["bandung"], 107.61, -6.91],
  ["Semarang", ["semarang"], 110.42, -6.99],
  ["Yogyakarta", ["yogyakarta", "jogja", "jogjakarta"], 110.37, -7.8],
  ["Medan", ["medan"], 98.67, 3.59],
  ["Banda Aceh", ["banda aceh", "aceh"], 95.32, 5.55],
  ["Sabang", ["sabang", "pulau weh"], 95.32, 5.89],
  ["Padang", ["padang"], 100.35, -0.95],
  ["Pekanbaru", ["pekanbaru"], 101.45, 0.51],
  ["Palembang", ["palembang"], 104.75, -2.99],
  ["Batam", ["batam"], 104.03, 1.08],
  ["Tanjungpinang", ["tanjungpinang", "tanjung pinang", "bintan"], 104.45, 0.92],
  ["Pontianak", ["pontianak"], 109.33, -0.03],
  ["Banjarmasin", ["banjarmasin"], 114.59, -3.32],
  ["Balikpapan", ["balikpapan"], 116.83, -1.27],
  ["IKN Nusantara", ["ikn", "nusantara", "ibu kota nusantara", "ikn nusantara"], 116.7, -0.97],
  ["Tarakan", ["tarakan"], 117.63, 3.3],
  ["Makassar", ["makassar", "ujung pandang"], 119.42, -5.14],
  ["Palu", ["palu"], 119.87, -0.9],
  ["Kendari", ["kendari"], 122.51, -3.99],
  ["Manado", ["manado", "bitung"], 124.84, 1.49],
  ["Denpasar (Bali)", ["denpasar", "bali"], 115.22, -8.65],
  ["Mataram (Lombok)", ["mataram", "lombok"], 116.12, -8.58],
  ["Kupang", ["kupang", "timor barat"], 123.58, -10.18],
  ["Ambon", ["ambon"], 128.18, -3.7],
  ["Ternate", ["ternate"], 127.38, 0.79],
  ["Morotai", ["morotai"], 128.4, 2.3],
  ["Saumlaki", ["saumlaki", "tanimbar"], 131.3, -7.98],
  ["Sorong", ["sorong"], 131.25, -0.88],
  ["Biak", ["biak"], 136.08, -1.18],
  ["Timika", ["timika"], 136.89, -4.53],
  ["Jayapura", ["jayapura"], 140.72, -2.53],
  ["Merauke", ["merauke"], 140.4, -8.49],
  ["Papua", ["papua", "tanah papua", "irian"], 138.5, -4.0],
  ["Kalimantan", ["kalimantan", "borneo"], 114.0, 0.0],
  ["Sumatera", ["sumatera", "sumatra"], 101.0, 0.0],
  ["Sulawesi", ["sulawesi", "celebes"], 121.0, -2.0],
  ["Jawa", ["jawa", "java"], 110.0, -7.3],
  ["Maluku", ["maluku", "moluccas"], 129.0, -3.0],
  // selat dan laut
  ["Selat Malaka", ["selat malaka", "malacca strait", "strait of malacca", "malaka", "malacca"], 100.5, 3.5],
  ["Selat Singapura", ["selat singapura", "singapore strait"], 104.0, 1.2],
  ["Selat Sunda", ["selat sunda", "sunda strait"], 105.8, -6.0],
  ["Selat Lombok", ["selat lombok", "lombok strait"], 115.75, -8.6],
  ["Selat Makassar", ["selat makassar", "makassar strait"], 118.5, -1.5],
  ["Laut Natuna Utara", ["laut natuna utara", "north natuna sea", "laut natuna", "natuna sea"], 108.5, 5.0],
  ["Laut China Selatan", ["laut china selatan", "laut cina selatan", "south china sea", "lcs"], 114.0, 12.0],
  ["Laut Sulu", ["laut sulu", "sulu sea"], 120.0, 8.0],
  ["Laut Sulawesi", ["laut sulawesi", "celebes sea"], 122.0, 3.0],
  ["Laut Jawa", ["laut jawa", "java sea"], 111.0, -5.0],
  ["Laut Banda", ["laut banda", "banda sea"], 128.0, -6.0],
  ["Laut Arafura", ["laut arafura", "arafura sea", "arafuru"], 135.0, -9.0],
  ["Blok Ambalat", ["ambalat", "blok ambalat"], 118.3, 4.0],
  // luar negeri
  ["Singapura", ["singapura", "singapore"], 103.82, 1.35],
  ["Kuala Lumpur", ["kuala lumpur"], 101.69, 3.14],
  ["Manila", ["manila"], 120.98, 14.6],
  ["Darwin", ["darwin"], 130.84, -12.46],
  ["Perth", ["perth"], 115.86, -31.95],
  ["Canberra", ["canberra"], 149.13, -35.28],
  ["Port Moresby", ["port moresby"], 147.18, -9.44],
  ["Dili", ["dili", "timor leste"], 125.57, -8.56],
  ["Guam", ["guam"], 144.79, 13.44],
  ["Hainan", ["hainan", "sanya"], 109.7, 18.6],
  ["Kepulauan Spratly", ["spratly", "kepulauan spratly", "spratly islands"], 114.0, 10.0],
  ["Kepulauan Paracel", ["paracel", "kepulauan paracel", "paracel islands"], 112.0, 16.5],
  ["Scarborough Shoal", ["scarborough", "scarborough shoal"], 117.76, 15.15],
  ["Taiwan", ["taiwan"], 121.0, 23.7],
  ["Diego Garcia", ["diego garcia"], 72.41, -7.31],
  ["Kepulauan Cocos", ["cocos", "kepulauan cocos", "cocos islands", "keeling"], 96.83, -12.19],
  ["Pulau Christmas", ["pulau christmas", "christmas island"], 105.63, -10.49],
];

export const GAZETIR: TempatUmum[] = MENTAH.map(([nama, kunci, lon, lat]) => ({ nama, kunci: kunci.map(normal), lon, lat }));
