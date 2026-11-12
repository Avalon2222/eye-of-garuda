/**
 * Pengurai Markdown kecil untuk jawaban asisten: tebal, miring, kode, tautan, daftar berpoin dan bernomor.
 * Hasilnya struktur data biasa (bukan HTML), jadi dirender sebagai elemen React tanpa innerHTML.
 * Yang tidak dikenali dibiarkan sebagai teks apa adanya.
 */

export type Potongan = { t: "teks" | "tebal" | "miring" | "kode"; isi: string } | { t: "tautan"; isi: string; url: string };

export type Blok = { t: "p"; isi: Potongan[] } | { t: "ul" | "ol"; butir: Potongan[][] };

const RE_INLINE = /\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|`([^`\n]+?)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|\*([^*\s][^*\n]*?)\*|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?])/g;

export function uraiInline(teks: string): Potongan[] {
  const hasil: Potongan[] = [];
  let akhir = 0;
  for (const m of teks.matchAll(RE_INLINE)) {
    const awal = m.index ?? 0;
    if (awal > akhir) hasil.push({ t: "teks", isi: teks.slice(akhir, awal) });
    if (m[1] != null) hasil.push({ t: "tebal", isi: m[1] });
    else if (m[2] != null) hasil.push({ t: "tebal", isi: m[2] });
    else if (m[3] != null) hasil.push({ t: "kode", isi: m[3] });
    else if (m[4] != null) hasil.push({ t: "tautan", isi: m[4], url: m[5] });
    else if (m[6] != null) hasil.push({ t: "miring", isi: m[6] });
    else hasil.push({ t: "tautan", isi: m[7], url: m[7] });
    akhir = awal + m[0].length;
  }
  if (akhir < teks.length) hasil.push({ t: "teks", isi: teks.slice(akhir) });
  return hasil;
}

const RE_POIN = /^\s*[-*•]\s+(.*)$/;
const RE_NOMOR = /^\s*\d{1,2}[.)]\s+(.*)$/;
const RE_JUDUL = /^\s*#{1,6}\s+(.*)$/;

export function uraiMarkdown(teks: string): Blok[] {
  const blok: Blok[] = [];
  let paragraf: string[] = [];
  const tutup = () => {
    if (paragraf.length) blok.push({ t: "p", isi: uraiInline(paragraf.join("\n")) });
    paragraf = [];
  };
  for (const baris of teks.replace(/\r/g, "").split("\n")) {
    const poin = baris.match(RE_POIN);
    const nomor = poin ? null : baris.match(RE_NOMOR);
    if (poin || nomor) {
      tutup();
      const jenis = poin ? "ul" : "ol";
      const isi = uraiInline((poin ?? nomor)![1]);
      const terakhir = blok[blok.length - 1];
      if (terakhir && terakhir.t === jenis) terakhir.butir.push(isi);
      else blok.push({ t: jenis, butir: [isi] });
      continue;
    }
    if (!baris.trim()) {
      tutup();
      continue;
    }
    const judul = baris.match(RE_JUDUL);
    if (judul) {
      tutup();
      blok.push({ t: "p", isi: [{ t: "tebal", isi: judul[1].replace(/\*\*/g, "") }] });
      continue;
    }
    paragraf.push(baris.trim());
  }
  tutup();
  return blok;
}
