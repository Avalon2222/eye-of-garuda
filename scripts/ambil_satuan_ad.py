"""
ambil_satuan_ad.py - Kumpulkan Kodim dan Yonif (satuan TNI AD level bawah) untuk lapisan markas di zoom dekat.

Sumber daftar: Wikipedia Indonesia
  - Komando_Distrik_Militer  -> tabel "Daftar satuan" (Kodim yang sudah bernomor; Kodim "rencana" dilewati)
  - Batalyon_infanteri       -> tabel Batalyon Infanteri + Batalyon Teritorial Pembangunan (TP)

Lokasi: Nominatim (OpenStreetMap), dua langkah per satuan:
  1. cari "Kodim"/"Yonif" di kotak 2°x2° sekitar kota markas (dipakai bareng satuan tetangga). Diterima hanya kalau namanya memuat nomor satuan
     yang sama, bukan Koramil/Kompi/asrama, dan jaraknya < MAKS_KM dari kota markas. presisi = "osm".
  2. kalau tidak ketemu dan markasnya nama kabupaten, titiknya ibu kota kabupaten itu (Wikidata, disimpan di
     data/sumber/ibukota_kabupaten.csv). Selain itu titik kota/desa markas dari Nominatim. presisi = "kota".

Hasil geocoder disimpan di data/sumber/geocode_satuan_ad.json, jadi menjalankan ulang tidak menembak server lagi.

    python scripts/ambil_satuan_ad.py             # ambil daftar dari Wikipedia, geocode, tulis CSV
    python scripts/ambil_satuan_ad.py --offline   # pakai snapshot daftar di data/sumber/satuan_ad_wikipedia.json
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
KELUAR = AKAR / "data" / "markas_tni_satuan.csv"
SNAPSHOT = AKAR / "data" / "sumber" / "satuan_ad_wikipedia.json"
CACHE = AKAR / "data" / "sumber" / "geocode_satuan_ad.json"
IBUKOTA = AKAR / "data" / "sumber" / "ibukota_kabupaten.csv"
MARKAS = AKAR / "data" / "markas_tni.csv"
UA = "eye-of-garuda-data/1.0 (github.com/Avalon2222/eye-of-garuda)"
URL_WIKI = "https://id.wikipedia.org/w/index.php?title={}&action=raw"
URL_NOMINATIM = "https://nominatim.openstreetmap.org/search"
URL_WIKIDATA = "https://query.wikidata.org/sparql"
# kabupaten (Q3191695) dan kota (Q3199141) beserta ibu kota peringkat terbaik
SPARQL_IBUKOTA = """
SELECT ?kl ?jenis ?ibuLabel ?c WHERE {
  VALUES ?jenis { wd:Q3191695 wd:Q3199141 }
  ?k wdt:P31 ?jenis . ?k rdfs:label ?kl FILTER(LANG(?kl) = "id")
  OPTIONAL { ?k p:P36 ?st . ?st a wikibase:BestRank . ?st ps:P36 ?ibu . ?ibu wdt:P625 ?c }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "id,en". }
}"""
JEDA = 1.1
MAKS_KM = 60.0
KOTAK_DERAJAT = 0.3
VERBOSE = "-v" in sys.argv

HALAMAN_KODIM = "Komando_Distrik_Militer"
HALAMAN_YONIF = "Batalyon_infanteri"

PROVINSI_RESMI = {
    "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Bengkulu", "Sumatera Selatan",
    "Bangka Belitung", "Lampung", "Banten", "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur",
    "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan",
    "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat",
    "Sulawesi Selatan", "Sulawesi Tenggara", "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Barat Daya",
    "Papua Tengah", "Papua Pegunungan", "Papua Selatan",
}

# Nama provinsi dari OSM -> ejaan yang dipakai di markas_tni.csv
PROVINSI = {
    "Daerah Khusus Ibukota Jakarta": "DKI Jakarta",
    "Daerah Khusus Jakarta": "DKI Jakarta",
    "Jakarta": "DKI Jakarta",
    "Daerah Istimewa Yogyakarta": "DI Yogyakarta",
    "Yogyakarta": "DI Yogyakarta",
    "Kepulauan Bangka Belitung": "Bangka Belitung",
    "Nanggroe Aceh Darussalam": "Aceh",
}

KATA_BUANG = re.compile(
    r"koramil|kompi|kipan|\bki\b|\bkie\b|asrama|perumahan|komplek(s)? perumahan|rumah dinas|mess|masjid|gereja|lapangan|"
    r"koperasi|primkop|sekolah|\btk\b|\bsd\b|\bsmp\b|klinik|rumah sakit|kantin|makam|gudang|jalan\b|\bjl\b",
    re.I,
)


# ---------------------------------------------------------------- Wikipedia


def ambil_teks(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read().decode("utf-8")


def bersih(s: str) -> str:
    s = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"<[^>]+>|\{\{[^}]*\}\}|'''?", "", s)
    s = s.replace("|}", "")
    return re.sub(r"\s+", " ", s).strip(" ,")


def tabel(teks: str, mulai: str, akhir: str) -> list[list[str]]:
    bagian = teks[teks.index(mulai) : teks.index(akhir)]
    # tabel kedua di bagian Kodim ("Pembentukan Kodim Baru") belum bernomor, jadi stop di tabel pertama
    bagian = bagian.split("|+ Pembentukan")[0]
    baris = []
    for b in bagian.split("\n|-"):
        b = b.strip()
        if not b.startswith("|") or b.startswith(("|+", "|}")):
            continue
        baris.append([bersih(x) for x in b.lstrip("|").split("||")])
    return baris


def daftar_dari_wikipedia() -> dict:
    kodim_teks = ambil_teks(URL_WIKI.format(HALAMAN_KODIM))
    time.sleep(2)
    yonif_teks = ambil_teks(URL_WIKI.format(HALAMAN_YONIF))
    return {
        "diambil": time.strftime("%Y-%m-%d"),
        "kodim": tabel(kodim_teks, "== Daftar satuan ==", "== Bekas satuan =="),
        "yonif": tabel(yonif_teks, "=== Batalyon Infanteri ===", "=== Batalyon Teritorial Pembangunan ==="),
        "yonif_tp": tabel(yonif_teks, "=== Batalyon Teritorial Pembangunan ===", "== Bekas satuan =="),
    }


def rapikan_komando(s: str) -> str:
    s = s.replace("Komando Resor Militer", "Korem").replace("Komando Daerah Militer", "Kodam")
    s = s.replace("Brigade Infanteri Teritorial Pembangunan", "Brigif TP").replace("Brigade Infanteri", "Brigif")
    return re.sub(r"\s*/\s*", "/", s).strip()


def satuan(daftar: dict) -> list[dict]:
    hasil = []
    for b in daftar["kodim"]:
        m = re.search(r"(\d{4})", b[1])
        if not m or len(b) < 4:
            continue
        markas = b[2]
        hasil.append({
            "kode": m.group(1),
            "nama": f"Kodim {m.group(1)}/{markas}",
            "jenis": "Kodim",
            "markas": markas,
            "komando": rapikan_komando(b[3]),
            "tp": False,
        })
    for kunci, tp in (("yonif", False), ("yonif_tp", True)):
        for b in daftar[kunci]:
            m = re.search(r"(\d{3})\s*(?:/\s*(.+))?$", b[1])
            if not m or len(b) < 4:
                continue
            julukan = (m.group(2) or "").strip()
            awal = "Yonif TP" if tp else "Yonif"
            hasil.append({
                "kode": m.group(1),
                "nama": f"{awal} {m.group(1)}" + (f"/{julukan}" if julukan else ""),
                "jenis": "Yonif",
                "markas": b[2],
                "komando": rapikan_komando(b[3]),
                "tp": tp,
            })
    return hasil


# ---------------------------------------------------------------- Nominatim


def jarak_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(a))


class Geocoder:
    def __init__(self) -> None:
        self.cache: dict = json.loads(CACHE.read_text("utf-8")) if CACHE.exists() else {}
        self.baru = 0

    def cari(self, q: str, sekitar: tuple[float, float] | None = None, d: float = 0.0, batas: int = 10) -> list[dict]:
        param = {"q": q, "format": "jsonv2", "countrycodes": "id", "limit": batas, "addressdetails": 1, "accept-language": "id"}
        kunci = q
        if sekitar:
            lat, lon = sekitar
            param.update({"bounded": 1, "viewbox": f"{lon - d:.2f},{lat + d:.2f},{lon + d:.2f},{lat - d:.2f}"})
            kunci = f"{q} @ {param['viewbox']}"
        if kunci in self.cache:
            return self.cache[kunci]
        req = urllib.request.Request(f"{URL_NOMINATIM}?{urllib.parse.urlencode(param)}", headers={"User-Agent": UA})
        data = None
        mulai = time.time()
        for coba in range(3):
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    data = json.load(r)
                break
            except Exception as e:  # noqa: BLE001
                print(f"    ! {q}: {e}", file=sys.stderr)
                time.sleep(5 * (coba + 1))
        if VERBOSE:
            print(f"    {time.time() - mulai:5.1f}s {kunci}", file=sys.stderr)
        # batas Nominatim 1 permintaan/detik, dihitung dari mulainya permintaan
        time.sleep(max(0.0, JEDA - (time.time() - mulai)))
        if data is None:
            return []
        ringkas = [
            {
                "nama": r.get("name") or r.get("display_name", "").split(",")[0],
                "lat": float(r["lat"]),
                "lon": float(r["lon"]),
                "kelas": f"{r.get('category', '')}/{r.get('type', '')}",
                "provinsi": (r.get("address") or {}).get("state", ""),
            }
            for r in data
        ]
        self.cache[kunci] = ringkas
        self.baru += 1
        if self.baru % 5 == 0:
            self.simpan()
        return ringkas

    def simpan(self) -> None:
        CACHE.write_text(json.dumps(self.cache, ensure_ascii=False, indent=0, sort_keys=True) + "\n", "utf-8")


# nama lama di Wikipedia -> nama sekarang
ALIAS_TEMPAT = {"Mamuju Utara": "Pasangkayu"}


def varian_tempat(markas: str) -> list[str]:
    bagian = [ALIAS_TEMPAT.get(x.strip(), x.strip()) for x in markas.split(",") if x.strip()]
    v = [", ".join(bagian)]
    if len(bagian) > 1:
        v.append(", ".join(bagian[1:]))
    v += [f"Kabupaten {bagian[0]}", f"Kota {bagian[0]}"]
    return list(dict.fromkeys(v))


def pola_nama(s: dict) -> re.Pattern:
    k = s["kode"]
    if s["jenis"] == "Kodim":
        return re.compile(rf"(kodim|komando distrik militer)\D{{0,3}}{k}\b", re.I)
    return re.compile(rf"(yonif|batal[yi]on infanteri)[^0-9]{{0,40}}{k}\b", re.I)


def query_objek(s: dict) -> list[str]:
    if s["jenis"] == "Kodim":
        return ["Kodim"]
    return ["Yonif", "Batalyon Infanteri"]


def provinsi_rapi(p: str) -> str:
    p = p.replace("Provinsi ", "").strip()
    return PROVINSI.get(p, p)


def ambil_ibukota() -> None:
    req = urllib.request.Request(f"{URL_WIKIDATA}?{urllib.parse.urlencode({'query': SPARQL_IBUKOTA})}", headers={"User-Agent": UA, "Accept": "text/csv"})
    with urllib.request.urlopen(req, timeout=120) as r:
        baris = list(csv.DictReader(r.read().decode("utf-8").splitlines()))
    kota = {b["kl"] for b in baris if b["jenis"].endswith("Q3199141")}
    hasil: dict[str, dict] = {}
    for b in sorted(baris, key=lambda b: b["ibuLabel"]):
        if not b["jenis"].endswith("Q3191695") or not b["c"]:
            continue
        lon, lat = (float(x) for x in re.findall(r"-?\d+\.?\d*", b["c"]))
        calon = {"kabupaten": b["kl"], "ibukota": b["ibuLabel"], "lat": f"{lat:.4f}", "lon": f"{lon:.4f}", "ada_kota_senama": int(b["kl"] in kota)}
        lama = hasil.get(b["kl"])
        # ibu kota lama yang sekarang jadi kota otonom (mis. Aceh Besar: Banda Aceh -> Jantho) dikalahkan
        if lama is None or (lama["ibukota"].replace("Kota ", "") in kota and calon["ibukota"].replace("Kota ", "") not in kota):
            hasil[b["kl"]] = calon
    with IBUKOTA.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["kabupaten", "ibukota", "lat", "lon", "ada_kota_senama"])
        w.writeheader()
        w.writerows(sorted(hasil.values(), key=lambda b: b["kabupaten"]))


def baca_ibukota() -> dict[str, dict]:
    if not IBUKOTA.exists():
        return {}
    with IBUKOTA.open(encoding="utf-8") as f:
        return {b["kabupaten"]: b for b in csv.DictReader(f) if b["ada_kota_senama"] == "0"}


IBUKOTA_KAB: dict[str, dict] = {}


def ibukota_untuk(markas: str) -> dict | None:
    """Markas yang cuma nama kabupaten ("Aceh Timur", "Pidie, Aceh") -> ibu kota kabupatennya.
    Kabupaten yang punya kota senama (Bekasi, Bogor, ...) dilewati karena ambigu."""
    bagian = [x.strip() for x in markas.split(",") if x.strip()]
    if len(bagian) > 2 or (len(bagian) == 2 and provinsi_rapi(bagian[1]) not in PROVINSI_RESMI):
        return None
    return IBUKOTA_KAB.get(re.sub(r"^Kabupaten ", "", bagian[0]))


def lokasi(s: dict, g: Geocoder) -> dict | None:
    tempat = None
    for q in varian_tempat(s["markas"]):
        r = g.cari(q)
        if r:
            tempat = r[0]
            break
    if tempat is None:
        return None
    pola = pola_nama(s)
    # kotak 2°x2° yang dibulatkan ke derajat terdekat, jadi satuan yang berdekatan memakai hasil query yang sama
    sel = (round(tempat["lat"]), round(tempat["lon"]))
    for q in query_objek(s):
        hasil = g.cari(q, sel, 1.0, 50)
        if len(hasil) >= 50:  # kotak penuh (kota padat): tambah query kotak kecil di sekitar markas
            hasil = hasil + g.cari(q, (round(tempat["lat"], 1), round(tempat["lon"], 1)), KOTAK_DERAJAT, 50)
        cocok = [
            r
            for r in hasil
            if pola.search(r["nama"]) and not KATA_BUANG.search(r["nama"])
            and jarak_km(r["lat"], r["lon"], tempat["lat"], tempat["lon"]) <= MAKS_KM
        ]
        if cocok:
            r = min(cocok, key=lambda r: jarak_km(r["lat"], r["lon"], tempat["lat"], tempat["lon"]))
            return {"lat": r["lat"], "lon": r["lon"], "presisi": "osm", "lokasi_dari": f"Nominatim/OSM: {r['nama']}", "provinsi": r["provinsi"] or tempat["provinsi"]}
    ibu = ibukota_untuk(s["markas"])
    if ibu:
        # titik tengah kabupaten bisa di tengah hutan; markas biasanya di ibu kota kabupaten
        return {"lat": float(ibu["lat"]), "lon": float(ibu["lon"]), "presisi": "kota", "lokasi_dari": f"ibu kota kabupaten: {ibu['ibukota']} (Wikidata)", "provinsi": tempat["provinsi"]}
    return {"lat": tempat["lat"], "lon": tempat["lon"], "presisi": "kota", "lokasi_dari": "perkiraan kota (Nominatim)", "provinsi": tempat["provinsi"]}


# ---------------------------------------------------------------- utama


def keterangan(s: dict, presisi: str) -> str:
    if s["jenis"] == "Kodim":
        t = f"Komando Distrik Militer di bawah {s['komando']}"
    elif s["tp"]:
        t = f"Batalyon Infanteri Teritorial Pembangunan di bawah {s['komando']}"
    else:
        t = f"Batalyon Infanteri di bawah {s['komando']}"
    if presisi == "kota":
        t += "; koordinat perkiraan (pusat kota/kabupaten)"
    return t


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("-v", action="store_true", help="tampilkan tiap query geocoder")
    ap.add_argument("--offline", action="store_true", help="pakai snapshot daftar, jangan ambil Wikipedia")
    args = ap.parse_args()

    if args.offline:
        daftar = json.loads(SNAPSHOT.read_text("utf-8"))
    else:
        daftar = daftar_dari_wikipedia()
        SNAPSHOT.write_text(json.dumps(daftar, ensure_ascii=False, indent=0) + "\n", "utf-8")

    if not args.offline or not IBUKOTA.exists():
        ambil_ibukota()
    IBUKOTA_KAB.update(baca_ibukota())

    semua = satuan(daftar)
    print(f"{len(semua)} satuan dari Wikipedia")
    g = Geocoder()
    baris = []
    gagal = []
    for i, s in enumerate(semua, 1):
        loc = lokasi(s, g)
        if loc is None:
            gagal.append(s["nama"])
            continue
        if VERBOSE and loc["presisi"] == "osm":
            print(f"  {s['nama']}: {loc['lokasi_dari']}")
        if i % 25 == 0:
            print(f"  {i}/{len(semua)} {s['nama']} -> {loc['presisi']}")
        url = f"https://id.wikipedia.org/wiki/{HALAMAN_KODIM if s['jenis'] == 'Kodim' else HALAMAN_YONIF}"
        baris.append({
            "id": f"{'kodim' if s['jenis'] == 'Kodim' else ('yoniftp' if s['tp'] else 'yonif')}-{s['kode']}",
            "nama": s["nama"],
            "matra": "AD",
            "jenis": s["jenis"],
            "kota": s["markas"],
            "provinsi": provinsi_rapi(loc["provinsi"]),
            "lat": f"{loc['lat']:.4f}",
            "lon": f"{loc['lon']:.4f}",
            "keterangan": keterangan(s, loc["presisi"]),
            "sumber": "Wikipedia: Daftar Kodim" if s["jenis"] == "Kodim" else "Wikipedia: Daftar Batalyon Infanteri",
            "url_sumber": url,
            "presisi": loc["presisi"],
            "lokasi_dari": loc["lokasi_dari"],
        })
    g.simpan()

    # provinsi kosong/aneh dari geocoder -> ambil dari titik berprovinsi terdekat
    with MARKAS.open(encoding="utf-8") as f:
        acuan = [(float(b["lat"]), float(b["lon"]), b["provinsi"]) for b in csv.DictReader(f)]
    acuan += [(float(b["lat"]), float(b["lon"]), b["provinsi"]) for b in baris if b["provinsi"] in PROVINSI_RESMI]
    for b in baris:
        if "Jakarta" in b["kota"]:
            b["provinsi"] = "DKI Jakarta"  # OSM tidak selalu mengisi state untuk kota administrasi Jakarta
        if b["provinsi"] not in PROVINSI_RESMI:
            lat, lon = float(b["lat"]), float(b["lon"])
            b["provinsi"] = min(acuan, key=lambda a: jarak_km(lat, lon, a[0], a[1]))[2]

    # nomor ganda (mis. Kodim yang dobel di tabel) cukup sekali
    unik = {b["id"]: b for b in baris}
    with KELUAR.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(next(iter(unik.values())).keys()))
        w.writeheader()
        w.writerows(sorted(unik.values(), key=lambda b: (b["jenis"], b["id"])))
    osm = sum(1 for b in unik.values() if b["presisi"] == "osm")
    print(f"tulis {KELUAR.relative_to(AKAR)}: {len(unik)} satuan, {osm} presisi OSM, {len(unik) - osm} perkiraan kota")
    if gagal:
        print(f"tidak ketemu lokasinya ({len(gagal)}): {', '.join(gagal)}")


if __name__ == "__main__":
    main()
