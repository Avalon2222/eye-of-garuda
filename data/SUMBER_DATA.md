# Sumber data & catatan metodologi

Semua data berasal dari sumber publik. Koordinat adalah perkiraan lokasi umum, cukup untuk peta skala
kawasan, bukan data operasional. Tiap baris data statis menyimpan kolom `sumber` dan `url_sumber`.

## Lapisan statis (`data/*.csv` → `public/data/*.geojson` lewat `scripts/bangun_data.py`)

| Berkas | Isi | Sumber |
|---|---|---|
| `markas_tni.csv` | 65 markas: Mabes TNI, Kogabwilhan, Kodam, Lantamal, Koarmada, Lanud (tipe A/B yang paling dikenal) | Wikipedia ID/EN per satuan |
| `pulau_terluar_perbatasan.csv` | 15 pulau terluar, 6 PLBN, 3 wilayah rawan (titik tengah ilustratif) | Keppres 6/2017, Wikipedia |
| `pangkalan_asing.csv` | 37 pangkalan/pos negara lain di kawasan (AS, Australia, China, India, tetangga) | Wikipedia, CSIS AMTI, RAAF, US Navy, liputan ABC/Reuters |
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
| Kapal | aisstream.io (AIS) | `scripts/ambil_ais.py` menyimak ~90 detik tiap 30 menit lewat GitHub Actions, menyimpan snapshot ke cabang `data`; browser mengekstrapolasi posisi dari COG/SOG |

Catatan jujur: hanya pesawat militer yang memancarkan ADS-B yang terlihat (banyak jet tempur terbang gelap);
cakupan AIS tipis di luar Singapura/Batam; kapal perang sering mematikan AIS.

## Lapisan analisis

| Lapisan | Sumber | Catatan |
|---|---|---|
| ZEE Indonesia | Marine Regions, Flanders Marine Institute, Maritime Boundaries v12 | Disederhanakan untuk web; bukan batas resmi |
| Sembilan garis putus | Digambar ilustratif dari koordinat yang lazim dikutip | Bukan dokumen resmi; hanya untuk menunjukkan tumpang tindih di Natuna Utara |
| Radius tempur | Angka publik (Wikipedia/produsen) per tipe pesawat | Tanpa tanker, tanpa profil misi; hanya jarak geometris |
| Impor senjata | SIPRI Arms Transfers Database (TIV) | TIV adalah indikator volume, bukan harga |
| Insiden & latihan | Liputan media, Wikipedia | Daftar kurasi, bukan daftar lengkap |

## Yang sengaja TIDAK dilakukan

- Tidak memasukkan lokasi satuan tempur/gudang/radar yang tidak ada di sumber publik tingkat Wikipedia.
- Tidak membuat skor "ancaman" otomatis.
- Tidak mengklaim jangkauan senjata sebenarnya.
