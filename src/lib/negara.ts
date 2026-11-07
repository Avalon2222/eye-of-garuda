/**
 * Negara asal untuk objek live: pesawat dari blok alamat ICAO 24-bit (hex), kapal dari MID (3 digit awal MMSI).
 * Dipakai untuk label "CALLSIGN (USA)" supaya setiap alutsista punya negara seperti satelit.
 *
 * Sumber blok ICAO: ICAO Annex 10 Vol III (alokasi per negara), disederhanakan ke blok yang relevan.
 * MID: ITU Maritime Identification Digits.
 */

export interface Negara {
  kode: string;
  nama: { id: string; en: string };
}

const N = (kode: string, id: string, en = id): Negara => ({ kode, nama: { id, en } });

const NEGARA: Record<string, Negara> = {
  USA: N("USA", "Amerika Serikat", "United States"),
  IDN: N("IDN", "Indonesia"),
  AUS: N("AUS", "Australia"),
  CHN: N("CHN", "China"),
  SGP: N("SGP", "Singapura", "Singapore"),
  MYS: N("MYS", "Malaysia"),
  JPN: N("JPN", "Jepang", "Japan"),
  KOR: N("KOR", "Korea Selatan", "South Korea"),
  PRK: N("PRK", "Korea Utara", "North Korea"),
  IND: N("IND", "India"),
  GBR: N("GBR", "Inggris", "United Kingdom"),
  FRA: N("FRA", "Prancis", "France"),
  DEU: N("DEU", "Jerman", "Germany"),
  RUS: N("RUS", "Rusia", "Russia"),
  PHL: N("PHL", "Filipina", "Philippines"),
  THA: N("THA", "Thailand"),
  VNM: N("VNM", "Vietnam"),
  TWN: N("TWN", "Taiwan"),
  BRN: N("BRN", "Brunei"),
  NZL: N("NZL", "Selandia Baru", "New Zealand"),
  PNG: N("PNG", "Papua Nugini", "Papua New Guinea"),
  TLS: N("TLS", "Timor-Leste"),
  MMR: N("MMR", "Myanmar"),
  KHM: N("KHM", "Kamboja", "Cambodia"),
  LAO: N("LAO", "Laos"),
  BGD: N("BGD", "Bangladesh"),
  LKA: N("LKA", "Sri Lanka"),
  PAK: N("PAK", "Pakistan"),
  CAN: N("CAN", "Kanada", "Canada"),
  ITA: N("ITA", "Italia", "Italy"),
  ESP: N("ESP", "Spanyol", "Spain"),
  NLD: N("NLD", "Belanda", "Netherlands"),
  BEL: N("BEL", "Belgia", "Belgium"),
  TUR: N("TUR", "Turki", "Turkey"),
  ISR: N("ISR", "Israel"),
  ARE: N("ARE", "Uni Emirat Arab", "UAE"),
  SAU: N("SAU", "Arab Saudi", "Saudi Arabia"),
  QAT: N("QAT", "Qatar"),
  OMN: N("OMN", "Oman"),
  EGY: N("EGY", "Mesir", "Egypt"),
  BRA: N("BRA", "Brasil", "Brazil"),
  POL: N("POL", "Polandia", "Poland"),
  SWE: N("SWE", "Swedia", "Sweden"),
  NOR: N("NOR", "Norwegia", "Norway"),
  DNK: N("DNK", "Denmark"),
  FIN: N("FIN", "Finlandia", "Finland"),
  GRC: N("GRC", "Yunani", "Greece"),
  PRT: N("PRT", "Portugal"),
  CHE: N("CHE", "Swiss", "Switzerland"),
  AUT: N("AUT", "Austria"),
  CZE: N("CZE", "Ceko", "Czechia"),
  HUN: N("HUN", "Hungaria", "Hungary"),
  ROU: N("ROU", "Rumania", "Romania"),
  UKR: N("UKR", "Ukraina", "Ukraine"),
  IRN: N("IRN", "Iran"),
  IRQ: N("IRQ", "Irak", "Iraq"),
  JOR: N("JOR", "Yordania", "Jordan"),
  KWT: N("KWT", "Kuwait"),
  BHR: N("BHR", "Bahrain"),
  ZAF: N("ZAF", "Afrika Selatan", "South Africa"),
  MEX: N("MEX", "Meksiko", "Mexico"),
  CHL: N("CHL", "Chili", "Chile"),
  ARG: N("ARG", "Argentina"),
  COL: N("COL", "Kolombia", "Colombia"),
  PAN: N("PAN", "Panama"),
  LBR: N("LBR", "Liberia"),
  MHL: N("MHL", "Kepulauan Marshall", "Marshall Islands"),
  BHS: N("BHS", "Bahama", "Bahamas"),
  MLT: N("MLT", "Malta"),
  CYP: N("CYP", "Siprus", "Cyprus"),
  HKG: N("HKG", "Hong Kong"),
  MAC: N("MAC", "Makau", "Macau"),
  MNG: N("MNG", "Mongolia"),
  NATO: N("NATO", "NATO"),
  INT: N("INT", "Internasional", "International"),
};

/** Blok alamat ICAO 24-bit: [awal, akhir, kode]. Diurutkan supaya pencarian biner cepat. */
const BLOK_ICAO: [number, number, string][] = ([
  [0x004000, 0x0043ff, "ZAF"],
  [0x010000, 0x017fff, "EGY"],
  [0x0a0000, 0x0a7fff, "ZAF"], // sebagian Afrika; disederhanakan
  [0x100000, 0x1fffff, "RUS"],
  [0x300000, 0x33ffff, "ITA"],
  [0x340000, 0x37ffff, "ESP"],
  [0x380000, 0x3bffff, "FRA"],
  [0x3c0000, 0x3fffff, "DEU"],
  [0x400000, 0x43ffff, "GBR"],
  [0x440000, 0x447fff, "AUT"],
  [0x448000, 0x44ffff, "BEL"],
  [0x450000, 0x457fff, "BGD"],
  [0x458000, 0x45ffff, "DNK"],
  [0x460000, 0x467fff, "FIN"],
  [0x468000, 0x46ffff, "GRC"],
  [0x470000, 0x477fff, "HUN"],
  [0x478000, 0x47ffff, "NOR"],
  [0x480000, 0x487fff, "NLD"],
  [0x488000, 0x48ffff, "POL"],
  [0x490000, 0x497fff, "PRT"],
  [0x498000, 0x49ffff, "CZE"],
  [0x4a0000, 0x4a7fff, "ROU"],
  [0x4a8000, 0x4affff, "SWE"],
  [0x4b0000, 0x4b7fff, "CHE"],
  [0x4b8000, 0x4bffff, "TUR"],
  [0x4c0000, 0x4c7fff, "UKR"],
  [0x4c8000, 0x4c87ff, "CYP"],
  [0x4d0000, 0x4d03ff, "MLT"],
  [0x508000, 0x50ffff, "UKR"],
  [0x600000, 0x6003ff, "ARG"],
  [0x680000, 0x6803ff, "MNG"],
  [0x700000, 0x700fff, "IRQ"],
  [0x708000, 0x70bfff, "IRN"],
  [0x710000, 0x717fff, "SAU"],
  [0x718000, 0x71bfff, "KOR"],
  [0x720000, 0x727fff, "PRK"],
  [0x728000, 0x72bfff, "IRQ"],
  [0x730000, 0x737fff, "IRN"],
  [0x738000, 0x73bfff, "ISR"],
  [0x740000, 0x743fff, "JOR"],
  [0x748000, 0x74bfff, "LAO"],
  [0x750000, 0x757fff, "MYS"],
  [0x758000, 0x75bfff, "PHL"],
  [0x760000, 0x767fff, "PAK"],
  [0x768000, 0x76bfff, "SGP"],
  [0x770000, 0x777fff, "LKA"],
  [0x778000, 0x77ffff, "ARE"],
  [0x780000, 0x7bffff, "CHN"],
  [0x7c0000, 0x7fffff, "AUS"],
  [0x800000, 0x83ffff, "IND"],
  [0x840000, 0x87ffff, "JPN"],
  [0x880000, 0x887fff, "THA"],
  [0x888000, 0x88ffff, "VNM"],
  [0x890000, 0x890fff, "YEM"],
  [0x894000, 0x894fff, "BHR"],
  [0x895000, 0x8953ff, "BRN"],
  [0x896000, 0x896fff, "ARE"],
  [0x897000, 0x8973ff, "QAT"],
  [0x898000, 0x898fff, "PNG"],
  [0x899000, 0x8993ff, "TWN"],
  [0x899400, 0x8997ff, "KHM"],
  [0x8a0000, 0x8a7fff, "IDN"],
  [0x8a8000, 0x8affff, "MMR"],
  [0x899800, 0x899bff, "TLS"],
  [0x8e0000, 0x8e3fff, "OMN"],
  [0x8f0000, 0x8f3fff, "KWT"],
  [0x900000, 0x9003ff, "MHL"],
  [0xa00000, 0xafffff, "USA"],
  [0xc00000, 0xc3ffff, "CAN"],
  [0xc80000, 0xc87fff, "NZL"],
  [0xe00000, 0xe3ffff, "ARG"],
  [0xe40000, 0xe7ffff, "BRA"],
  [0xe80000, 0xe80fff, "CHL"],
  [0xe90000, 0xe90fff, "COL"],
  [0x0d0000, 0x0d7fff, "MEX"],
  [0xf00000, 0xf07fff, "NATO"],
  [0xf09000, 0xf093ff, "NATO"],
] as [number, number, string][]).sort((a, b) => a[0] - b[0]);

export function negaraDariHex(hex: string): Negara | null {
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n)) return null;
  let lo = 0;
  let hi = BLOK_ICAO.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [a, b, kode] = BLOK_ICAO[mid];
    if (n < a) hi = mid - 1;
    else if (n > b) lo = mid + 1;
    else return NEGARA[kode] ?? N(kode, kode);
  }
  return null;
}

/** MID (3 digit awal MMSI) -> kode negara. */
const MID: Record<string, string> = {
  "201": "ALB", "203": "AUT", "205": "BEL", "209": "CYP", "210": "CYP", "211": "DEU", "212": "CYP", "215": "MLT", "218": "DEU", "219": "DNK", "220": "DNK",
  "224": "ESP", "225": "ESP", "226": "FRA", "227": "FRA", "228": "FRA", "229": "MLT", "230": "FIN", "232": "GBR", "233": "GBR", "234": "GBR", "235": "GBR",
  "236": "GIB", "237": "GRC", "238": "HRV", "239": "GRC", "240": "GRC", "241": "GRC", "244": "NLD", "245": "NLD", "246": "NLD", "247": "ITA", "248": "MLT",
  "249": "MLT", "250": "IRL", "251": "ISL", "255": "PRT", "256": "MLT", "257": "NOR", "258": "NOR", "259": "NOR", "261": "POL", "263": "PRT", "264": "ROU",
  "265": "SWE", "266": "SWE", "269": "CHE", "271": "TUR", "272": "UKR", "273": "RUS", "275": "LVA", "276": "EST", "277": "LTU",
  "303": "USA", "311": "BHS", "312": "BLZ", "316": "CAN", "319": "CYM", "338": "USA", "341": "KNA", "351": "PAN", "352": "PAN", "353": "PAN", "354": "PAN",
  "355": "PAN", "356": "PAN", "357": "PAN", "366": "USA", "367": "USA", "368": "USA", "369": "USA", "370": "PAN", "371": "PAN", "372": "PAN", "373": "PAN",
  "374": "PAN", "375": "VCT", "376": "VCT", "377": "VCT", "378": "CYM",
  "403": "SAU", "405": "BGD", "408": "BHR", "412": "CHN", "413": "CHN", "414": "CHN", "416": "TWN", "417": "LKA", "419": "IND", "422": "IRN", "425": "IRQ",
  "428": "ISR", "431": "JPN", "432": "JPN", "438": "JOR", "440": "KOR", "441": "KOR", "443": "PSE", "445": "PRK", "447": "KWT", "450": "LBN", "453": "MAC",
  "455": "MDV", "457": "MNG", "459": "NPL", "461": "OMN", "463": "PAK", "466": "QAT", "468": "SYR", "470": "ARE", "471": "ARE", "472": "TJK", "473": "YEM",
  "475": "YEM", "477": "HKG", "478": "BIH",
  "501": "ATA", "503": "AUS", "506": "MMR", "508": "BRN", "510": "FSM", "511": "PLW", "512": "NZL", "514": "KHM", "515": "KHM", "516": "CXR", "518": "COK",
  "520": "FJI", "523": "CCK", "525": "IDN", "529": "KIR", "531": "LAO", "533": "MYS", "536": "MNP", "538": "MHL", "540": "NCL", "542": "NIU", "544": "NRU",
  "546": "PYF", "548": "PHL", "550": "TLS", "553": "PNG", "555": "PCN", "557": "SLB", "559": "ASM", "561": "WSM", "563": "SGP", "564": "SGP", "565": "SGP",
  "566": "SGP", "567": "THA", "570": "TON", "572": "TUV", "574": "VNM", "576": "VUT", "577": "VUT", "578": "WLF",
  "601": "ZAF", "603": "AGO", "605": "DZA", "613": "CMR", "620": "COM", "621": "DJI", "622": "EGY", "636": "LBR", "637": "LBR", "657": "NGA", "667": "SLE",
  "671": "TGO", "677": "TZA",
  "710": "BRA", "720": "BOL", "725": "CHL", "730": "COL", "735": "ECU", "760": "PER", "770": "URY", "775": "VEN",
};

export function negaraDariMmsi(mmsi: number | string): Negara | null {
  const kode = MID[String(mmsi).slice(0, 3)];
  if (!kode) return null;
  return NEGARA[kode] ?? N(kode, kode);
}

export function namaNegara(kode: string, lang: "id" | "en"): string {
  return NEGARA[kode]?.nama[lang] ?? kode;
}

// ---------- klasifikasi pesawat dari kode tipe ICAO ----------

export type KategoriPesawat = "tempur" | "helikopter" | "tanker" | "angkut" | "intai" | "pembom" | "latih" | "lain";

const TIPE: Record<KategoriPesawat, RegExp> = {
  tempur: /^(F1[5-8]|F15|F16|F22|F35|FA18|F18[A-Z]?|SU2[4-7]|SU3[0-5]|SU57|MG29|MG31|TYPH|EUFI|RFAL|M200|J10|J11|J15|J16|J20|JF17|GRIP|JAS39|MIR2|MRF1|F5|F4|TOR|A10|AV8B|HAR|HAWK2|FA50|T50|FA18|SU30|SU35)/,
  helikopter: /^(H6[04]|H47|H53|H1|UH1|UH60|AH64|AH1|CH47|CH53|EC[0-9]|EC45|EC35|EC55|EC75|A109|A139|A189|AW1|AW\d|S61|S65|S70|S76|S92|B06|B407|B412|B429|B430|MI8|MI17|MI2[468]|MI35|KA[0-9]|NH90|AS32|AS50|AS55|AS65|H125|H135|H145|H160|H175|H215|H225|R44|R66|LYNX|WLYX|MRLN|PUMA|SPMA|GAZL|TIGR|EH10|V22|MV22|CV22|ALO3|A350H|Z8|Z9|Z10|Z19|Z20)/,
  tanker: /^(K35R|K35E|KC13|K135|KC46|K46|KC10|A332|A3ST|MRTT|KC39|IL78|KC30|A400T)/,
  angkut: /^(C130|C30J|L382|C17|C5M|C5|A400|C295|CN35|C27J|G222|C212|CASA|AN12|AN2[26]|AN30|AN32|AN7[24]|AN12|IL76|Y8|Y9|Y20|KC1|C160|C2|C1|DHC[0-9]|DH8[A-D]|B737|B738|B739|B752|B763|B744|B748|B77[0-9]|A320|A321|A319|A330|A340|C40|C32|C37|C21|C12|U21|B350|BE20|BE30|BE9L|PC12|PC24|CL60|GLF[0-9]|GL5T|GLEX|G280|E135|E145|E190|E35L|E550|F900|FA7X|FA8X|LJ35|LJ45|LJ60|C560|C56X|C680|C750|CN1|M28|SF34|AT72|AT45|AT46|AT76|TWOT|C208|U28A|PC6T|AN24|AN26|Y7|Y12|MA60|L410|C17A|NOMA|SC7)/,
  intai: /^(P8|P8A|P3|P3C|E3TF|E3CF|E767|E737|E7|E2|E2D|E6|E8|R135|RC13|E135|RQ4|MQ4|MQ9|MQ1|MQ4C|EA18|EP3|E2C|WC13|EC13|RC12|RC7|RQ1|U2|TR1|KC13|P1|P-1|P3B|CL60|G550|RJ85|B350|U28|CN2C|Y8Q|Y9Q|KJ2|KJ5|KJ200|KJ500|TU14|TU22|IL20|IL22|A50|RA50|ERJ|E190|HRON|GLOB|SMAH|GRAN|DA42|DA62|TB20|TBM9|PA31|C206|BT67|CN235|CN35|C295|SB20|DO28|DO22|SKYM|DR40)/,
  pembom: /^(B52|B1|B2|B21|TU95|TU16|TU22|TU14|TU16|H6|H6K|H20)/,
  latih: /^(T38|TEX2|T6|T6A|HAWK|HAW|T45|T50|FA50|T7|T7A|PC9|PC21|PC7|T1|T4|T2|KT1|M346|M339|M311|L39|L159|JL8|JL9|JL10|EMB3|TUCA|SF26|G120|TB30|ALX|C101|CM17|T34|T44|T35|A29|YAK1|YAK5|L29)/,
  lain: /^$/,
};

const URUT: KategoriPesawat[] = ["tanker", "pembom", "intai", "helikopter", "tempur", "latih", "angkut"];

export function kategoriPesawat(tipe: string, desc = ""): KategoriPesawat {
  const t = (tipe || "").toUpperCase().trim();
  const d = (desc || "").toLowerCase();
  if (/heli|rotor/.test(d)) return "helikopter";
  if (/tanker/.test(d)) return "tanker";
  if (/bomber/.test(d)) return "pembom";
  if (/awacs|aew|surveillance|reconnaissance|maritime patrol|patrol/.test(d)) return "intai";
  if (!t) return "lain";
  for (const k of URUT) if (TIPE[k].test(t)) return k;
  return "lain";
}

export const WARNA_KATEGORI_PESAWAT: Record<KategoriPesawat, string> = {
  tempur: "#facc15",
  helikopter: "#86efac",
  tanker: "#c084fc",
  angkut: "#fde68a",
  intai: "#38bdf8",
  pembom: "#f87171",
  latih: "#d6d3d1",
  lain: "#fcd34d",
};

export const NAMA_KATEGORI_PESAWAT: Record<KategoriPesawat, { id: string; en: string }> = {
  tempur: { id: "Pesawat tempur", en: "Fighter" },
  helikopter: { id: "Helikopter", en: "Helicopter" },
  tanker: { id: "Tanker udara", en: "Aerial tanker" },
  angkut: { id: "Angkut / VIP", en: "Transport / VIP" },
  intai: { id: "Intai / AEW / patroli maritim", en: "ISR / AEW / maritime patrol" },
  pembom: { id: "Pembom", en: "Bomber" },
  latih: { id: "Latih", en: "Trainer" },
  lain: { id: "Militer lain", en: "Other military" },
};
