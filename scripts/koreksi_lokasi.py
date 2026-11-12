"""
koreksi_lokasi.py - Menggeser titik markas TNI dari "pusat kota" ke lokasi objeknya yang sebenarnya.

Tiga tahap, dari yang paling pasti:
  1. bandara  : Lanud dan satuan udara yang bermarkas di bandara dicocokkan ke OurAirports
                (data/sumber/ourairports_kawasan.csv) berdasarkan nama atau jarak < 4 km. presisi = "manual".
  2. osm      : geocoder Photon (photon.komoot.io) dan Nominatim (nominatim.openstreetmap.org), keduanya data
                OpenStreetMap. Dicari di kotak ±0,6° sekitar kota dengan beberapa variasi nama, hasil disaring:
                namanya harus terbaca sebagai markas yang dimaksud (bukan koramil, rumah sakit, kolam renang, dll).
                presisi = "osm".
  3. manual   : daftar KOORDINAT_MANUAL di bawah untuk markas terkenal yang kompleksnya diketahui tapi tidak
                punya nama rapi di OSM. presisi = "manual".

Titik yang tidak ketemu di tahap mana pun tetap "kota". Kolom lokasi_dari mencatat asal titiknya.

    python scripts/koreksi_lokasi.py            # perbarui data/markas_tni.csv
    python scripts/koreksi_lokasi.py --coba     # hanya tampilkan hasil, tidak menulis
    python scripts/koreksi_lokasi.py --semua    # cek ulang juga yang sudah presisi

Geocoder publik dibatasi ~1 permintaan/detik, jadi skrip ini sengaja pelan (±10 menit untuk semua markas).
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
BERKAS = AKAR / "data" / "markas_tni.csv"
BANDARA = AKAR / "data" / "sumber" / "ourairports_kawasan.csv"
URL_PHOTON = "https://photon.komoot.io/api/"
URL_NOMINATIM = "https://nominatim.openstreetmap.org/search"
UA = "eye-of-garuda-data/1.0 (github.com/Avalon2222/eye-of-garuda)"
JEDA_PHOTON = 0.8
JEDA_NOMINATIM = 1.1
KOTAK_DERAJAT = 0.6
MAKS_KM = 60.0

# Markas yang kompleksnya diketahui umum tapi tidak punya nama yang bisa dicari di OSM.
# Dicek manual lewat citra satelit / halaman resmi; dipakai hanya kalau geocoder tidak menemukan apa-apa.
KOORDINAT_MANUAL: dict[str, tuple[float, float, str]] = {
    "Mabes TNI Cilangkap": (-6.3390, 106.8985, "kompleks Mabes TNI Cilangkap, Jakarta Timur"),
    "Mabes TNI AU": (-6.3345, 106.8975, "kompleks Mabes TNI AU di Cilangkap, Jakarta Timur"),
    "Markas Kopassus": (-6.3268, 106.8585, "Mako Kopassus Cijantung, Jakarta Timur"),
    "Divisi Infanteri 1/Kostrad": (-6.4190, 106.8355, "Cilodong, Depok"),
    "Divisi Infanteri 2/Kostrad": (-7.8870, 112.6640, "Singosari, Malang"),
    "Divisi Infanteri 3/Kostrad": (-5.2540, 119.5085, "Pakatto, Gowa"),
    "Akademi Militer": (-7.4790, 110.2180, "kompleks Akmil Magelang"),
    "Akademi Angkatan Laut": (-7.2165, 112.7200, "Bumimoro, Surabaya"),
    "Pasmar 2": (-6.2905, 106.7975, "Kesatrian Marinir Cilandak, Jakarta Selatan"),
    "Koarmada II": (-7.2050, 112.7340, "Ujung, Surabaya"),
    "Lantamal V Surabaya": (-7.2075, 112.7355, "Ujung, Surabaya"),
    "Kodam Jaya/Jayakarta": (-6.2590, 106.8675, "Jl. Mayjen Sutoyo, Cililitan, Jakarta Timur"),
}

KATA_BUANG = re.compile(
    r"koramil|kodim|polisi militer|\bpomdam\b|ajudan|kesehatan|kesdam|keuangan|hukum|\bzeni\b|perbekalan|peralatan|"
    r"pendidikan|rumah sakit|\brs\b|\brsal\b|\brsad\b|rumkit|\bmess\b|asrama|perumahan|komplek(s)? perumahan|koperasi|\bbank\b|"
    r"masjid|\bgereja\b|lapangan|kolam|gudang|makam|\bpos\b|rindam|resimen|\bdodik\b|secata|secaba|\byonif\b|batalyon|\byon\b|"
    r"brigif|\bbrigade\b|kompi|\bdenpom\b|\bbekang\b|\bzidam\b|\bpaldam\b|\bkodiklat\b|\bsatrad\b|\bskadron\b|\bwing\b|"
    r"\bdenhanud\b|\barhanud\b|\bkavaleri\b|\barmed\b|golf|\bbintal\b|penerangan|\bhubdam\b|perhubungan|\bpendam\b|"
    r"\bsatkomlek\b|infolahta|\bsandi\b|\bjasdam\b|\btopdam\b|\bajendam\b|\bajenrem\b|\bkumdam\b|\bkudam\b|\bitdam\b|"
    r"\bsetum\b|\bsatpur\b|\bsatbanpur\b|\bsatjar\b|\bsatwal\b|detasemen|\bden\s|kpad|babinmin|veteran|kepolisian|\bpolda\b|"
    r"\bpolres\b|\bpolsek\b|cadangan|\bprimkop\b|\bpuskop\b|\bsmp\b|\bsma\b|sekolah|\btk\b|\bsd\b|kantin|wisma|\bhotel\b|"
    r"\bgor\b|stadion|\bpuskesmas\b|\bklinik\b|apotek|\bbalai\b|\btaman\b|museum|monumen|tugu|gedung pertemuan|aula|"
    r"olahraga|pasar|\bstasiun\b|\bspbu\b|dermaga|pelabuhan|\bkantor pos\b|perpustakaan|\bgalangan\b|\bbengkel\b|"
    r"pembekalan|angkutan|perawatan|bengkel|dis\.?jas|pehubungan|\bhalte\b|terminal|\bjalan\b|\bgang\b|\bkodamar\b|\bfasharkan\b|\bsatkat\b|\bsatkor\b|\bsatfib\b|\bsatban\b|\bdenma\b|\bsatma\b|\bpuslat\b|\bbrigif\b|\bmarinir\b.*\byon",
    re.I,
)
KUNCI_OSM_OK = ("landuse", "military", "building", "office", "amenity", "aeroway", "government", "place")
NILAI_OSM_BURUK = ("residential", "commercial", "industrial", "retail", "school", "university", "hospital", "clinic", "place_of_worship", "sports_centre", "pitch", "hamlet", "village", "neighbourhood", "suburb", "quarter")


def jarak_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def ambil_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.load(r)
    except Exception as e:  # noqa: BLE001
        print(f"    ! gagal {url[:80]}: {e}", file=sys.stderr)
        return None


def cari_photon(q: str, lat: float, lon: float) -> list[dict]:
    """Hasil Photon diseragamkan: {nama, lat, lon, kunci, nilai}."""
    d = KOTAK_DERAJAT
    qs = urllib.parse.urlencode({"q": q, "limit": 10, "lang": "en", "bbox": f"{lon - d},{lat - d},{lon + d},{lat + d}"})
    data = ambil_json(URL_PHOTON + "?" + qs) or {}
    time.sleep(JEDA_PHOTON)
    hasil = []
    for f in data.get("features", []):
        p = f.get("properties", {})
        if p.get("countrycode") != "ID":
            continue
        x, y = f["geometry"]["coordinates"]
        hasil.append({"nama": p.get("name") or "", "lat": y, "lon": x, "kunci": p.get("osm_key", ""), "nilai": p.get("osm_value", ""), "dari": "Photon/OSM"})
    return hasil


def cari_nominatim(q: str, lat: float, lon: float) -> list[dict]:
    d = KOTAK_DERAJAT
    qs = urllib.parse.urlencode({"q": q, "format": "jsonv2", "countrycodes": "id", "limit": 10, "bounded": 1, "viewbox": f"{lon - d},{lat + d},{lon + d},{lat - d}"})
    data = ambil_json(URL_NOMINATIM + "?" + qs) or []
    time.sleep(JEDA_NOMINATIM)
    hasil = []
    for r in data:
        hasil.append({"nama": r.get("name") or r.get("display_name", "").split(",")[0], "lat": float(r["lat"]), "lon": float(r["lon"]), "kunci": r.get("category", ""), "nilai": r.get("type", ""), "dari": "Nominatim/OSM"})
    return hasil


def angka_romawi(s: str) -> str:
    m = re.search(r"\b([IVX]+)\b", s)
    return m.group(1) if m else ""


def aturan(b: dict) -> tuple[list[str], re.Pattern, list[str]]:
    """(daftar query, pola nama yang harus cocok, token pembeda yang salah satunya harus ada [boleh kosong])."""
    nama, jenis, kota = b["nama"], b["jenis"], b["kota"]
    if jenis == "Korem":
        n = re.search(r"Korem (\d{3})", nama).group(1)
        julukan = nama.split("/")[-1].strip() if "/" in nama else ""
        q = [f"Korem {n}", "Komando Resor Militer", "Makorem", "Korem"]
        return q, re.compile(r"\bkorem\b|komando resor militer|makorem", re.I), [n, julukan.lower()] if julukan else [n]
    if jenis == "Kodam":
        m = re.search(r"Kodam (Iskandar Muda|Jaya|[IVX]+)", nama)
        n = m.group(1) if m else ""
        julukan = nama.split("/")[-1].strip() if "/" in nama else ""
        q = [f"Kodam {n}", "Komando Daerah Militer", "Makodam", "Kodam"]
        return q, re.compile(r"\bkodam\b|komando daerah militer|makodam", re.I), [x.lower() for x in (n, julukan) if x]
    if jenis == "Lantamal":
        n = angka_romawi(nama)
        q = [f"Lantamal {n}", "Pangkalan Utama TNI Angkatan Laut", "Pangkalan Utama TNI AL", "Lantamal"]
        return q, re.compile(r"\blantamal\b|pangkalan utama", re.I), [f" {n.lower()}", f" {n}"] if n else []
    if jenis == "Lanal":
        tempat = re.sub(r"\(.*\)", "", nama.replace("Lanal", "")).strip()
        q = [f"Lanal {tempat}", "Pangkalan TNI Angkatan Laut", "Pangkalan TNI AL", "Lanal", "Pangkalan Angkatan Laut"]
        return q, re.compile(r"\blanal\b|pangkalan (tni )?(al|angkatan laut)|mako lanal", re.I), []
    if jenis == "Koarmada":
        n = angka_romawi(nama)
        q = [f"Koarmada {n}", "Komando Armada", "Makoarmada", "Koarmada"]
        return q, re.compile(r"\bkoarmada\b|komando armada|makoarmada", re.I), [f" {n.lower()}", f" {n}"] if n else []
    if jenis == "Kogabwilhan":
        n = angka_romawi(nama)
        q = [f"Kogabwilhan {n}", "Komando Gabungan Wilayah Pertahanan", "Kogabwilhan"]
        return q, re.compile(r"kogabwilhan|komando gabungan wilayah", re.I), []
    if jenis == "Divisi":
        n = re.search(r"Divisi Infanteri (\d)", nama).group(1)
        q = [f"Divisi Infanteri {n}", f"Divif {n}", "Makodivif", "Kostrad"]
        return q, re.compile(r"divisi infanteri|divif|kostrad", re.I), [n]
    if jenis == "Marinir":
        n = re.search(r"(\d)", nama).group(1)
        q = [f"Pasmar {n}", "Pasukan Marinir", "Kesatrian Marinir", "Marinir"]
        return q, re.compile(r"pasmar|pasukan marinir|kesatrian marinir|\bmarinir\b", re.I), [n]
    if jenis == "Pendidikan":
        q = [nama, nama.replace("Akademi ", "")]
        return q, re.compile(re.escape(nama.split()[0]), re.I), [nama.split()[-1].lower()]
    # Komando Utama, Markas Besar, lain-lain: cari namanya langsung
    kata = [k for k in re.split(r"[\s/]+", nama) if k.lower() not in ("markas", "mabes", "tni", "komando", "utama")]
    q = [nama, f"Markas {nama}", " ".join(kata)]
    return q, re.compile("|".join(re.escape(k) for k in kata) or re.escape(nama), re.I), []


def pilih_kandidat(b: dict, lat0: float, lon0: float, kandidat: list[dict], pola: re.Pattern, pembeda: list[str]) -> dict | None:
    cocok = []
    for k in kandidat:
        nama = k["nama"].lower()
        if not nama or not pola.search(nama) or KATA_BUANG.search(nama):
            continue
        if k["kunci"] not in KUNCI_OSM_OK or k["nilai"] in NILAI_OSM_BURUK:
            continue
        d = jarak_km(lat0, lon0, k["lat"], k["lon"])
        if d > MAKS_KM:
            continue
        ada_pembeda = any(p and p.lower() in nama for p in pembeda)
        # ada angka/julukan unit lain -> bukan markas ini (mis. "Korem 044" saat mencari 032)
        angka_lain = re.search(r"\b0\d{2}\b", nama)
        if pembeda and angka_lain and not ada_pembeda:
            continue
        prio = 0 if (k["kunci"] == "military" or k["nilai"] == "military") else 1 if k["kunci"] in ("office", "government") else 2
        skor = (0 if ada_pembeda else 1, prio, d)
        cocok.append((skor, k, d))
    if not cocok:
        return None
    cocok.sort(key=lambda x: x[0])
    skor, k, d = cocok[0]
    # tanpa pembeda hanya diterima kalau cukup dekat kota (markas kota biasanya satu-satunya di kota itu)
    if pembeda and skor[0] == 1 and d > 12:
        return None
    return {**k, "jarak_km": round(d, 1)}


def muat_bandara() -> list[dict]:
    with open(BANDARA, newline="", encoding="utf-8") as f:
        return [a for a in csv.DictReader(f) if a["iso_country"] == "ID"]


def cocokkan_bandara(b: dict, lat0: float, lon0: float, bandara: list[dict]) -> dict | None:
    if b["matra"] != "AU" and b["jenis"] != "Komando Utama":
        return None
    terdekat = None
    for a in bandara:
        d = jarak_km(lat0, lon0, float(a["latitude_deg"]), float(a["longitude_deg"]))
        if d < 4 and (terdekat is None or d < terdekat[0]):
            terdekat = (d, a)
    if not terdekat:
        return None
    d, a = terdekat
    return {"nama": a["name"], "lat": float(a["latitude_deg"]), "lon": float(a["longitude_deg"]), "jarak_km": round(d, 1), "dari": f"OurAirports {a['ident']}"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--coba", action="store_true", help="hanya tampilkan, jangan tulis")
    ap.add_argument("--semua", action="store_true", help="cek ulang juga yang sudah presisi")
    ap.add_argument("--jenis", default="", help="batasi ke jenis tertentu, mis. Korem")
    args = ap.parse_args()

    with open(BERKAS, newline="", encoding="utf-8") as f:
        pembaca = csv.DictReader(f)
        kolom = list(pembaca.fieldnames or [])
        baris = list(pembaca)
    for k in ("presisi", "lokasi_dari"):
        if k not in kolom:
            kolom.append(k)
    bandara = muat_bandara()

    hitung = {"bandara": 0, "osm": 0, "manual": 0, "kota": 0}
    for b in baris:
        if args.jenis and b["jenis"] != args.jenis:
            continue
        if not args.semua and b.get("presisi") in ("osm", "manual"):
            continue
        lat0, lon0 = float(b["lat"]), float(b["lon"])
        hasil, presisi = None, "kota"

        cb = cocokkan_bandara(b, lat0, lon0, bandara)
        if cb:
            hasil, presisi = cb, "manual"
            hitung["bandara"] += 1
        else:
            query, pola, pembeda = aturan(b)
            for q in query:
                kandidat = cari_photon(q, lat0, lon0) + cari_nominatim(q, lat0, lon0)
                hasil = pilih_kandidat(b, lat0, lon0, kandidat, pola, pembeda)
                if hasil:
                    presisi = "osm"
                    hitung["osm"] += 1
                    break
            if not hasil and b["nama"] in KOORDINAT_MANUAL:
                la, lo, ket = KOORDINAT_MANUAL[b["nama"]]
                hasil, presisi = {"nama": ket, "lat": la, "lon": lo, "jarak_km": round(jarak_km(lat0, lon0, la, lo), 1), "dari": "manual"}, "manual"
                hitung["manual"] += 1

        if hasil:
            print(f"{b['id']:>4} {b['nama']:<40} -> {hasil['nama'][:46]:<46} [{hasil['dari']}] geser {hasil['jarak_km']} km", flush=True)
            b["lat"], b["lon"] = f"{hasil['lat']:.4f}", f"{hasil['lon']:.4f}"
            b["presisi"], b["lokasi_dari"] = presisi, hasil["dari"]
        else:
            hitung["kota"] += 1
            print(f"{b['id']:>4} {b['nama']:<40} -> (tidak ketemu, tetap perkiraan kota)", flush=True)
            b["presisi"] = b.get("presisi") or "kota"
            b["lokasi_dari"] = b.get("lokasi_dari") or "perkiraan kota"

    for b in baris:
        if not b.get("lokasi_dari"):
            b["lokasi_dari"] = {"osm": "Photon/OSM", "manual": "manual"}.get(b.get("presisi", ""), "perkiraan kota")
    total = {p: sum(1 for b in baris if b.get("presisi") == p) for p in ("osm", "manual", "kota")}
    print(f"\nTahap ini: {hitung}. Total sekarang: {total} dari {len(baris)} markas.")
    if args.coba:
        return
    with open(BERKAS, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=kolom)
        w.writeheader()
        for b in baris:
            w.writerow({k: b.get(k, "") for k in kolom})
    print(f"Ditulis ke {BERKAS.relative_to(AKAR)}. Jalankan scripts/bangun_data.py untuk memperbarui GeoJSON.")


if __name__ == "__main__":
    main()
