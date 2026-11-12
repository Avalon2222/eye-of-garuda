/**
 * Sepuluh pertanyaan uji asisten. Jawaban yang benar dihitung ulang di sini langsung dari GeoJSON
 * (tanpa lewat alat chatbot), lalu dibandingkan dengan fakta yang disiapkan server untuk model.
 */

import { describe, expect, it } from "vitest";
import { siapkanFakta } from "@/lib/chat/fakta";
import { jarakKm } from "@/lib/geo";
import { bacaData, indeksAsli } from "./bantu";

interface Fitur {
  properties: Record<string, string | number | boolean | null>;
  geometry: { type: string; coordinates: [number, number] };
}
const muat = (berkas: string) => bacaData<{ features: Fitur[] }>(berkas).features;

const indeks = indeksAsli();
const tni = muat("markas_tni.geojson");
const asing = muat("pangkalan_asing.geojson");
const kapalSelam = muat("kapal_selam.geojson");
const kabel = muat("kabel.geojson");

const NATUNA: [number, number] = [108.39, 3.94];
const SELAT_MALAKA: [number, number] = [100.5, 3.5];
const DARWIN: [number, number] = [130.84, -12.46];

function palingDekat(daftar: Fitur[], dari: [number, number]): { nama: string; km: number } {
  let terbaik = { nama: "", km: Infinity };
  for (const f of daftar) {
    const km = jarakKm(dari[0], dari[1], f.geometry.coordinates[0], f.geometry.coordinates[1]);
    if (km < terbaik.km) terbaik = { nama: String(f.properties.nama), km };
  }
  return terbaik;
}

/** Baris pertama daftar bernomor di teks fakta. */
function barisPertama(teks: string): string {
  return teks.split("\n").find((b) => b.startsWith("1. ")) ?? "";
}

const km = (n: number) => `${Math.round(n).toLocaleString("en-US")} km`;

describe("10 pertanyaan uji asisten", () => {
  it("1. Pangkalan asing terdekat dari Natuna: tetangga dekat, bukan Guam atau Darwin", () => {
    const f = siapkanFakta(indeks, "Pangkalan asing terdekat dari Natuna apa?", "id")!;
    const benar = palingDekat(asing, NATUNA);
    expect(barisPertama(f.teks)).toContain(benar.nama);
    expect(barisPertama(f.teks)).toContain(km(benar.km));
    expect(benar.km).toBeLessThan(1000);
    expect(f.teks).not.toMatch(/Guam|Darwin/);
    expect(f).toMatchObject({ terbang: benar.nama, lapisan: "asing", alat: ["terdekat"] });
  });

  it("2. Ada berapa markas TNI di Papua: semua provinsi Papua dijumlah", () => {
    const f = siapkanFakta(indeks, "Ada berapa markas TNI di Papua?", "id")!;
    const jumlah = tni.filter((x) => String(x.properties.provinsi).includes("Papua")).length;
    expect(f.teks).toContain(`: ${jumlah}.`);
    expect(f.teks).toMatch(/Papua Barat Daya \d+/);
    expect(f.alat).toEqual(["hitung"]);
  });

  it("3. Lanud Ranai di mana: Lanud yang ada di Ranai, lengkap dengan koordinat", () => {
    const f = siapkanFakta(indeks, "Lanud Ranai di mana?", "id")!;
    const lanud = tni.find((x) => x.properties.jenis === "Lanud" && x.properties.kota === "Ranai")!;
    expect(f.terbang).toBe(lanud.properties.nama);
    expect(f.teks.split("\n")[1]).toContain(String(lanud.properties.nama));
    expect(f.teks).toContain("Kepulauan Riau");
    expect(f.teks).toMatch(/@ 3\.9\d*, 108\.3\d*/);
  });

  it("4. Jarak Lanud Raden Sadjad ke Fiery Cross Reef", () => {
    const f = siapkanFakta(indeks, "Berapa jarak Lanud Raden Sadjad ke Fiery Cross Reef?", "id")!;
    const a = tni.find((x) => x.properties.nama === "Lanud Raden Sadjad")!.geometry.coordinates;
    const b = asing.find((x) => x.properties.nama === "Fiery Cross Reef")!.geometry.coordinates;
    expect(f.teks).toContain(km(jarakKm(a[0], a[1], b[0], b[1])));
    expect(f.teks).toContain("timur laut");
    expect(f.alat).toEqual(["jarak"]);
  });

  it("5. Negara dengan pangkalan terbanyak di kawasan", () => {
    const f = siapkanFakta(indeks, "Negara mana yang paling banyak punya pangkalan asing di kawasan? Berapa jumlahnya?", "id")!;
    const hitungan = new Map<string, number>();
    for (const x of asing) hitungan.set(String(x.properties.operator_utama), (hitungan.get(String(x.properties.operator_utama)) ?? 0) + 1);
    const [negara, n] = [...hitungan.entries()].sort((p, q) => q[1] - p[1])[0];
    expect(f.teks).toContain(`: ${asing.length}.`);
    expect(f.teks).toContain(`Per negara: ${negara} ${n},`);
  });

  it("6. Ada berapa Lanud di Indonesia", () => {
    const f = siapkanFakta(indeks, "Ada berapa Lanud di Indonesia?", "id")!;
    expect(f.teks).toContain(`: ${tni.filter((x) => x.properties.jenis === "Lanud").length}.`);
  });

  it("7. Pangkalan kapal selam terdekat dari Selat Malaka", () => {
    const f = siapkanFakta(indeks, "Pangkalan kapal selam terdekat dari Selat Malaka?", "id")!;
    const benar = palingDekat(kapalSelam, SELAT_MALAKA);
    expect(barisPertama(f.teks)).toContain(benar.nama);
    expect(barisPertama(f.teks)).toContain(km(benar.km));
    expect(f.lapisan).toBe("kapalselam");
  });

  it("8. Pangkalan China terdekat dari Natuna: saringan negara dipakai", () => {
    const f = siapkanFakta(indeks, "Pangkalan China terdekat dari Natuna?", "id")!;
    const benar = palingDekat(
      asing.filter((x) => x.properties.operator_utama === "China"),
      NATUNA,
    );
    expect(barisPertama(f.teks)).toContain(benar.nama);
    expect(barisPertama(f.teks)).toContain(km(benar.km));
    expect(f.teks).not.toContain("Singapura");
  });

  it("9. Which TNI base is closest to Darwin (bahasa Inggris)", () => {
    const f = siapkanFakta(indeks, "Which TNI base is closest to Darwin?", "en")!;
    const benar = palingDekat(tni, DARWIN);
    expect(f.teks.split("\n")[0]).toBe("Nearest TNI bases to Darwin (great-circle distance):");
    expect(barisPertama(f.teks)).toContain(benar.nama);
    expect(barisPertama(f.teks)).toContain(km(benar.km));
    expect(barisPertama(f.teks)).toMatch(/to the (north|north-east|north-west)/);
  });

  it("10. How many undersea cables are in the data", () => {
    const f = siapkanFakta(indeks, "How many undersea cables are in the data?", "en")!;
    expect(f.teks).toContain(`Count of undersea cables in the map data: ${kabel.length}.`);
    expect(f.teks).toContain("By type:");
  });
});

describe("fakta: kasus lain", () => {
  it("pertanyaan umum tanpa objek tidak dipaksa punya fakta", () => {
    for (const q of ["Ini apa sih?", "Kenapa satelit ada yang lebih tinggi?", "Lapisan mana yang live?", ""]) expect(siapkanFakta(indeks, q, "id")).toBeNull();
  });

  it("kata lapisan di frasa asal tidak dianggap lapisan yang ditanyakan", () => {
    const f = siapkanFakta(indeks, "Bandara terdekat dari Lanal Tarempa", "id")!;
    expect(f.lapisan).toBe("bandara");
    expect(f.teks).not.toMatch(/Markas TNI/);
  });

  it("'A from B' dalam bahasa Inggris dibaca sebagai dua tempat", () => {
    const f = siapkanFakta(indeks, "How far is Jakarta from Guam?", "en")!;
    expect(f.alat).toEqual(["jarak"]);
    expect(f.teks).toMatch(/Jakarta → Guam: 4,7\d\d km/);
  });

  it("singkatan AS dibaca sebagai Amerika Serikat, termasuk lokasi akses bersama", () => {
    const f = siapkanFakta(indeks, "Pangkalan AS terdekat dari Jakarta?", "id")!;
    expect(f.teks.split("\n")[0]).toContain("Amerika Serikat");
    for (const baris of f.teks.split("\n").slice(1)) expect(baris).toMatch(/AS|Amerika Serikat/);
  });
});
