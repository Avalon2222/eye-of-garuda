# Sumber data & catatan metodologi

Semua data berasal dari sumber publik. Koordinat adalah perkiraan lokasi umum, cukup untuk peta skala
kawasan, bukan data operasional. Tiap baris data statis menyimpan kolom `sumber` dan `url_sumber`.

## Lapisan statis (`data/*.csv` → `public/data/*.geojson` lewat `scripts/bangun_data.py`)

| Berkas | Isi | Sumber |
|---|---|---|
| `markas_tni.csv` | 198 markas: Mabes TNI/AD/AU/AL, Kogabwilhan, semua Kodam & Korem, Lantamal & Lanal, Koarmada, Lanud, Kopassus, Kostrad, Marinir, Puspenerbad/Puspenerbal, akademi. Kolom `presisi`: `osm` = koordinat dicocokkan ke objek OpenStreetMap lewat geocoder Photon (`scripts/koreksi_lokasi.py`, 81 titik), `kota` = masih pusat kota/pelabuhan | Wikipedia ID/EN per satuan, Wikidata, OurAirports (Lanud), OpenStreetMap (ODbL) lewat Photon |
| `kapal_selam.csv` | 16 pangkalan induk kapal selam di kawasan dengan jumlah, kelas, dan status (aktif/rencana). Bukan posisi kapal: kapal selam tidak bisa dilacak dengan data publik | Wikipedia, halaman armada resmi, liputan media |
| `pulau_terluar_perbatasan.csv` | 15 pulau terluar, 6 PLBN, 3 wilayah rawan (titik tengah ilustratif) | Keppres 6/2017, Wikipedia |
| `pangkalan_asing.csv` + `sumber/wikidata_militer.json` | 211 pangkalan/pos negara lain di kawasan: 37 kurasi manual (kolom `kurasi=1`) + instalasi militer dari Wikidata (pangkalan udara/laut, markas; benteng dan situs bersejarah dibuang; belum diverifikasi satu per satu) | Wikipedia, CSIS AMTI, RAAF, US Navy, liputan ABC/Reuters; Wikidata (CC0) |
| `sumber/ourairports_kawasan.csv` → `bandara.geojson` | 507 bandara besar/sedang di kawasan + lapangan udara militer berdasarkan nama (`scripts/bangun_fasilitas.py`) | OurAirports (public domain) |
| `sumber/wikidata_pelabuhan.json` → `pelabuhan.geojson` | 606 pelabuhan laut per negara di kawasan (`scripts/bangun_fasilitas.py`) | Wikidata (CC0) |
| `alki.csv` | ALKI I/II/III sebagai garis tengah ilustratif 6 titik | PP No. 37 Tahun 2002 |
| `anggaran_indonesia.csv` | Pagu APBN Kemhan 2015–2026 (bukan realisasi) | Kemenkeu / Nota Keuangan, Kompas, CNBC Indonesia |
| `anggaran_kawasan.csv` | Belanja militer 2024 negara kawasan | SIPRI Milex 2024, IISS Military Balance |
| `alutsista.csv` | Alutsista utama (perkiraan) | Wikipedia, liputan media |
| `sumber/kabel_geo.json`, `sumber/kabel.csv`, `sumber/landing_station.csv` | 118 kabel bawah laut yang mendarat di/melintasi Indonesia + 361 landing station | TeleGeography Submarine Cable Map (CC BY-NC-SA 3.0), lewat proyek cut-the-cable |
| `kapal_tersanksi.csv` | 1.533 MMSI kapal tersanksi | OpenSanctions (CC BY-NC 4.0), lewat proyek gotham-lite |

Label "pangkalan asing di kawasan" sengaja netral; sebagian besar milik negara mitra Indonesia.

## Lapisan live

| Lapisan | Sumber | Mekanisme |
|---|---|---|
| Pesawat militer | `api.adsb.lol/v2/mil` (cadangan `api.airplanes.live/v2/mil`), gratis tanpa kunci | Proxy `app/api/pesawat`, cache 8 detik; browser mengambil tiap 10 detik dan mengekstrapolasi posisi dari kecepatan + haluan |
| Satelit | TLE CelesTrak (snapshot harian proyek who-watches-indonesia) + katalog GCAT (CC BY 4.0) | `scripts/bangun_satelit.py` memilih satelit militer/pengintai dan Indonesia; posisi dipropagasi SGP4 (satellite.js) di browser |
| Kapal | aisstream.io (AIS) | Dua jalur digabung: (1) `scripts/ambil_ais.py` menyimak ~90 detik tiap 30 menit lewat GitHub Actions, menyimpan snapshot ke cabang `data`; (2) `app/api/kapal` membuka stream ~7 detik per permintaan (cache 45 detik) kalau `AISSTREAM_API_KEY` terpasang di Vercel, browser memintanya tiap 60 detik. Kapal dari stream diberi cincin LIVE. Browser mengekstrapolasi posisi dari COG/SOG |
| Jadwal lintasan satelit | TLE yang sama dengan lapisan satelit | Web Worker mempropagasi satelit LEO 12 jam ke depan (langkah 60 detik) dan mencatat waktu masuk/keluar kotak 94–142° BT, 12° LS–7° LU |

Catatan jujur: hanya pesawat militer yang memancarkan ADS-B yang terlihat (banyak jet tempur terbang gelap);
cakupan AIS tipis di luar Singapura/Batam; kapal perang sering mematikan AIS.

## Lapisan analisis

| Lapisan | Sumber | Catatan |
|---|---|---|
| ZEE Indonesia | Marine Regions, Flanders Marine Institute, Maritime Boundaries v12 | Disederhanakan untuk web; bukan batas resmi |
| Sembilan garis putus | Digambar ilustratif dari koordinat yang lazim dikutip | Bukan dokumen resmi; hanya untuk menunjukkan tumpang tindih di Natuna Utara |
| Radius tempur | Angka publik (Wikipedia/produsen) per tipe pesawat | Tanpa tanker, tanpa profil misi; hanya jarak geometris |
| Impor senjata | SIPRI Arms Transfers Database, 2000–2025, diambil dari API publik SIPRI oleh `scripts/ambil_sipri.py` (workflow bulanan ke cabang `data`; salinan di `public/data/sipri.json` dan ringkasan `data/sipri_impor.csv`) | TIV adalah indikator volume pengiriman, bukan harga kontrak; angka tahun berjalan masih bisa berubah |
| Insiden & latihan | Liputan media, Wikipedia | Daftar kurasi, bukan daftar lengkap |

## Skenario War Room

Tiga skenario fiktif dan edukatif (`src/lib/skenario/`): Krisis Laut Natuna Utara, Cable Cut di Selat Singapura, dan
Perang nuklir dilihat dari Indonesia. Geometri jarak dihitung dari koordinat publik; waktu tempuh dari kecepatan
tipikal yang dipublikasikan; efek ledakan nuklir (radius bola api, 5 psi, luka bakar, EMP ketinggian tinggi) dibulatkan
dari literatur publik (Glasstone & Dolan, *The Effects of Nuclear Weapons*; NUKEMAP). Tidak ada yang merupakan prediksi.

## Yang sengaja TIDAK dilakukan

- Tidak memasukkan lokasi satuan tempur/gudang/radar yang tidak ada di sumber publik tingkat Wikipedia.
- Tidak membuat skor "ancaman" otomatis.
- Tidak mengklaim jangkauan senjata sebenarnya.
