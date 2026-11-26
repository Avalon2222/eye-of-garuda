/**
 * Pengurai Markdown kecil untuk jawaban asisten: tebal, miring, kode, tautan, daftar berpoin dan bernomor.
 * Hasilnya struktur data biasa (bukan HTML), jadi dirender sebagai elemen React tanpa innerHTML.
 * Yang tidak dikenali dibiarkan sebagai teks apa adanya.
 */

export type Potongan = { t: "teks" | "tebal" | "miring" | "kode"; isi: string } | { t: "tautan"; isi: string; url: string };

// `mulai` hanya diisi kalau daftar bernomor tidak dimulai dari 1 ("3. ..." setelah paragraf penjelas).
export type Blok = { t: "p"; isi: Potongan[] } | { t: "ul"; butir: Potongan[][] } | { t: "ol"; butir: Potongan[][]; mulai?: number };

// URL boleh memuat satu tingkat kurung berpasangan, seperti tautan Wikipedia ".../KRI_Nanggala_(402)".
const RE_INLINE =
  /\*\*([^*\n]+?)\*\*|__([^_\n]+?)__|`([^`\n]+?)`|\[([^\]\n]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)|\*([^*\s][^*\n]*?)\*|(https?:\/\/(?:[^\s<>()]|\([^\s<>()]*\))*(?:[^\s<>().,;:!?]|\([^\s<>()]*\)))/g;

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
const RE_NOMOR = /^\s*(\d{1,2})[.)]\s+(.*)$/;
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
      const isi = uraiInline(poin ? poin[1] : nomor![2]);
      const terakhir = blok[blok.length - 1];
      if (poin) {
        if (terakhir && terakhir.t === "ul") terakhir.butir.push(isi);
        else blok.push({ t: "ul", butir: [isi] });
      } else if (terakhir && terakhir.t === "ol") {
        terakhir.butir.push(isi);
      } else {
        // Daftar yang dipotong paragraf ("1. ..." lalu teks lalu "2. ...") dulu mulai lagi dari 1.
        const mulai = Number(nomor![1]);
        blok.push(mulai === 1 ? { t: "ol", butir: [isi] } : { t: "ol", butir: [isi], mulai });
      }
      continue;
    }
    if (!baris.trim()) {
      tutup();
      continue;
    }
    const judul = baris.match(RE_JUDUL);
    if (judul) {
      tutup();
      // "## " tanpa isi (atau hanya "**") jangan jadi paragraf tebal kosong.
      const isiJudul = judul[1].replace(/\*\*/g, "").trim();
      if (isiJudul) blok.push({ t: "p", isi: [{ t: "tebal", isi: isiJudul }] });
      continue;
    }
    paragraf.push(baris.trim());
  }
  tutup();
  return blok;
}
