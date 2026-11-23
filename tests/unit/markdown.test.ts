import { describe, expect, it } from "vitest";
import { uraiInline, uraiMarkdown } from "@/lib/markdownRingan";

describe("Markdown ringan untuk jawaban asisten", () => {
  it("tebal, miring, kode, dan tautan", () => {
    expect(uraiInline("**Changi** itu *dekat*, lihat `tni` di [repo](https://github.com/x/y).")).toEqual([
      { t: "tebal", isi: "Changi" },
      { t: "teks", isi: " itu " },
      { t: "miring", isi: "dekat" },
      { t: "teks", isi: ", lihat " },
      { t: "kode", isi: "tni" },
      { t: "teks", isi: " di " },
      { t: "tautan", isi: "repo", url: "https://github.com/x/y" },
      { t: "teks", isi: "." },
    ]);
  });

  it("URL polos jadi tautan tanpa menelan titik di akhir kalimat", () => {
    expect(uraiInline("Buka https://eye-of-garuda.vercel.app.")).toEqual([
      { t: "teks", isi: "Buka " },
      { t: "tautan", isi: "https://eye-of-garuda.vercel.app", url: "https://eye-of-garuda.vercel.app" },
      { t: "teks", isi: "." },
    ]);
  });

  it("tanda bintang yang tidak berpasangan dan tautan non-http dibiarkan sebagai teks", () => {
    expect(uraiInline("5 * 3 dan **belum ditutup")).toEqual([{ t: "teks", isi: "5 * 3 dan **belum ditutup" }]);
    expect(uraiInline("[klik](javascript:alert(1))")).toEqual([{ t: "teks", isi: "[klik](javascript:alert(1))" }]);
  });

  it("daftar berpoin dan bernomor dikelompokkan", () => {
    const blok = uraiMarkdown("Terdekat:\n1. **Changi** 566 km\n2. Paya Lebar\n\n- satu\n* dua\n• tiga");
    expect(blok.map((b) => b.t)).toEqual(["p", "ol", "ul"]);
    expect(blok[1]).toMatchObject({ t: "ol", butir: [[{ t: "tebal", isi: "Changi" }, { t: "teks", isi: " 566 km" }], [{ t: "teks", isi: "Paya Lebar" }]] });
    expect(blok[2].t === "ul" && blok[2].butir).toHaveLength(3);
  });

  it("baris kosong memisah paragraf, judul jadi teks tebal", () => {
    const blok = uraiMarkdown("## Ringkasan\nbaris satu\nbaris dua\n\nparagraf dua");
    expect(blok).toEqual([
      { t: "p", isi: [{ t: "tebal", isi: "Ringkasan" }] },
      { t: "p", isi: [{ t: "teks", isi: "baris satu\nbaris dua" }] },
      { t: "p", isi: [{ t: "teks", isi: "paragraf dua" }] },
    ]);
  });

  it("teks kosong menghasilkan nol blok", () => {
    expect(uraiMarkdown("")).toEqual([]);
    expect(uraiMarkdown("\n\n")).toEqual([]);
  });

  it("URL dengan kurung berpasangan (Wikipedia) tidak terpotong", () => {
    const url = "https://en.wikipedia.org/wiki/KRI_Nanggala_(402)";
    expect(uraiInline(`Sumber: [Wikipedia](${url}).`)).toEqual([
      { t: "teks", isi: "Sumber: " },
      { t: "tautan", isi: "Wikipedia", url },
      { t: "teks", isi: "." },
    ]);
    expect(uraiInline(`Lihat ${url}.`)).toEqual([
      { t: "teks", isi: "Lihat " },
      { t: "tautan", isi: url, url },
      { t: "teks", isi: "." },
    ]);
    const tengah = "https://en.wikipedia.org/wiki/Cocos_(Keeling)_Island_International_Airport";
    expect(uraiInline(tengah)).toEqual([{ t: "tautan", isi: tengah, url: tengah }]);
  });

  it("URL polos di dalam kurung tidak menelan kurung tutup", () => {
    expect(uraiInline("(lihat https://contoh.org/a)")).toEqual([
      { t: "teks", isi: "(lihat " },
      { t: "tautan", isi: "https://contoh.org/a", url: "https://contoh.org/a" },
      { t: "teks", isi: ")" },
    ]);
  });
});

describe("judul kosong", () => {
  it("baris '## ' atau '# ****' tidak menghasilkan blok kosong", () => {
    expect(uraiMarkdown("## \nIsi")).toEqual([{ t: "p", isi: [{ t: "teks", isi: "Isi" }] }]);
    expect(uraiMarkdown("# ****")).toEqual([]);
    expect(uraiMarkdown("### **Ringkasan** ")).toEqual([{ t: "p", isi: [{ t: "tebal", isi: "Ringkasan" }] }]);
  });
});
