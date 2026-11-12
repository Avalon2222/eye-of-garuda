# Changelog

Semua perubahan penting di Eye of Garuda dicatat di sini. Formatnya mengikuti
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versinya [Semantic Versioning](https://semver.org/).
Tiap versi baru di `package.json` otomatis jadi tag + GitHub Release lewat workflow `rilis.yml`.

## [1.0.0] - 2026-11-12

Rilis stabil pertama. Konsolnya sudah dites di HP (360, 390, 412 px) dan desktop (1440 px), punya tes otomatis di CI,
dan data live-nya jalan sendiri.

### Ditambah
- **Garuda AI yang jawab dari data.** Jarak, jumlah, dan objek terdekat dihitung server dari GeoJSON peta, baru
  dirangkum model (Groq tier gratis, tiga model cadangan). Kalau model meleset atau sibuk, hitungan mentahnya tetap
  dikirim.
- **Klik objek yang numpuk** memunculkan daftar pilihan, pencarian mengurutkan nama persis dulu.
- **Gambar preview share** (Open Graph / Twitter) dan font yang di-host sendiri lewat `next/font`.
- **SEO dasar:** `robots.txt`, `sitemap.xml`, dan `h1` yang ikut di HTML server.
- **Vercel Web Analytics** (tanpa cookie) untuk lihat berapa yang mampir.
- Tes unit (Vitest) dan smoke test browser (Playwright, 390 + 1440 px), jalan di CI tiap pull request.
- Header keamanan (CSP, X-Frame-Options, Referrer-Policy) dan rate limit 30 permintaan / 10 menit untuk asisten.
- Pemeriksa link sumber bulanan (`cek-tautan.yml`) dan 17 insiden baru 2019–2026 (total 36).
- Workflow rilis otomatis dan changelog ini.

### Diubah
- **Tampilan HP dirombak:** header Search + War Room + menu ⋮, area sentuh minimal 44 px, panel jadi lembar layar penuh,
  War Room dan tampilan awal pas di layar kecil.
- **Snapshot AIS beneran tiap 30 menit.** Cron GitHub sering telat 4–8 jam, jadi sekarang satu job menyimak terus
  ~5,5 jam lalu memanggil dirinya lagi.
- Label konsol konsisten English di dua bahasa (Search, War Room, Briefing, dll.), sisanya ikut bahasa aktif.
- Lokasi markas TNI dicocokkan ulang (137 dari 198 sudah presisi), pangkalan asing Wikidata disaring (50 dibuang).
- `zee.geojson` dikecilkan jadi 134 KB.
- Worker MapLibre (~520 KB) cuma diunduh sekali per kunjungan, sebelumnya 2–3 kali.
- Halaman boleh di-pinch-zoom (aksesibilitas); peta tetap pakai gesture-nya sendiri.
- Dependabot: versi mayor di-skip, update minor/patch digabung jadi satu PR per bulan.

### Diperbaiki
- Tombol header kepotong di HP, shortcut lapisan yang gak jalan di keyboard non-US, epoch TLE yang susah dibaca.
- Asisten yang nyangkut di mode FAQ karena model Groq lama sudah gak tersedia di tier gratis.

## Sebelum 1.0.0

Belum ada tag; ini ringkasan dari riwayat commit.

- **7 Nov 2026:** War Room 3 skenario (Natuna, kabel putus, nuklir) + export Markdown/PNG/WebM, jadwal lintasan
  satelit, AIS live lewat `/api/kapal`, level of detail per zoom, lapisan kapal selam, SIPRI dari API resmi.
- **6 Nov 2026:** performa kanvas untuk pesawat dan satelit, data markas/bandara/pelabuhan lengkap, skenario Natuna
  pertama, dan asisten obrolan.
- **5 Nov 2026:** versi pertama: globe MapLibre, markas TNI, pangkalan asing, ALKI, kabel, ZEE, radius tempur, impor
  senjata, lini masa insiden, katalog satelit, dan snapshot AIS.

[1.0.0]: https://github.com/Avalon2222/eye-of-garuda/releases/tag/v1.0.0
