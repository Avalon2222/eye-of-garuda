"""
koreksi_lokasi.py - Menggeser titik markas TNI dari "pusat kota" ke lokasi objek militer di OpenStreetMap.

Memakai geocoder Photon (photon.komoot.io, data OSM). Untuk tiap markas dicoba beberapa variasi nama,
hasil disaring: harus di Indonesia, namanya memuat kata kunci markas itu, dan jaraknya dari titik lama
masuk akal (< 120 km). Objek bertag militer (landuse=military, barracks, naval_base) diprioritaskan.

    python scripts/koreksi_lokasi.py            # perbarui data/markas_tni.csv (kolom presisi diisi "osm")
    python scripts/koreksi_lokasi.py --coba     # hanya tampilkan hasil, tidak menulis

Photon publik dibatasi ~1 permintaan/detik, jadi skrip ini sengaja pelan.
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
URL = "https://photon.komoot.io/api/"
JEDA = 0.7
MAKS_KM = 120.0

PRIORITAS_OSM = {
    "military": 0,
    "barracks": 0,
    "naval_base": 0,
    "airfield": 0,
    "aerodrome": 0,
    "government": 1,
    "office": 1,
    "administrative": 2,
    "police": 3,
}


def jarak_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def photon(q: str, lat: float, lon: float) -> list[dict]:
    qs = urllib.parse.urlencode({"q": q, "lat": f"{lat:.4f}", "lon": f"{lon:.4f}", "limit": 8, "lang": "en"})
    req = urllib.request.Request(URL + "?" + qs, headers={"User-Agent": "eye-of-garuda-data/1.0 (github.com/Avalon2222/eye-of-garuda)"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r).get("features", [])
    except Exception as e:  # noqa: BLE001
        print(f"    ! gagal {q!r}: {e}", file=sys.stderr)
        return []


def romawi_ke_kata(s: str) -> str:
    return s


def kata_kunci(b: dict) -> list[str]:
    """Token yang harus muncul di nama hasil (huruf kecil)."""
    nama = b["nama"]
    jenis = b["jenis"]
    if jenis == "Korem":
        m = re.search(r"Korem (\d{3})", nama)
        return [m.group(1)] if m else [nama.lower()]
    if jenis == "Kodam":
        m = re.search(r"Kodam (Iskandar Muda|Jaya|[IVX]+)\b", nama)
        if m:
            k = m.group(1)
            if k in ("Jaya",):
                return ["jaya"]
            if k == "Iskandar Muda":
                return ["iskandar muda"]
            return [k.lower()]
        return [nama.lower()]
    if jenis == "Lantamal":
        m = re.search(r"Lantamal ([IVX]+)", nama)
        return [f"lantamal {m.group(1).lower()}"] if m else [nama.lower()]
    if jenis == "Lanal":
        m = re.search(r"Lanal ([A-Za-z .]+)", nama)
        kota = m.group(1).strip().lower() if m else b["kota"].lower()
        return [kota.split()[0]]
    if jenis == "Lanud":
        m = re.search(r"Lanud (.+)", nama)
        return [m.group(1).lower().split()[0]] if m else [nama.lower()]
    if jenis == "Koarmada":
        m = re.search(r"Koarmada ([IVX]+)", nama)
        return [f"koarmada {m.group(1).lower()}"] if m else [nama.lower()]
    if jenis == "Kogabwilhan":
        m = re.search(r"Kogabwilhan ([IVX]+)", nama)
        return [f"kogabwilhan {m.group(1).lower()}"] if m else [nama.lower()]
    # lainnya: kata paling khas (bukan "markas"/"mabes")
    kata = [k for k in re.split(r"[\s/]+", nama.lower()) if k not in ("markas", "mabes", "tni", "komando", "utama", "divisi", "infanteri")]
    return kata[:1] or [nama.lower()]


def variasi_query(b: dict) -> list[str]:
    nama = b["nama"]
    jenis = b["jenis"]
    kota = b["kota"]
    v: list[str] = []
    if jenis == "Korem":
        m = re.search(r"Korem (\d{3})", nama)
        n = m.group(1) if m else ""
        v += [f"Makorem {n}", f"Korem {n}", f"Markas Korem {n} {kota}", nama.replace("/", " ")]
    elif jenis == "Kodam":
        m = re.search(r"Kodam (Iskandar Muda|Jaya|[IVX]+)\b", nama)
        n = m.group(1) if m else ""
        v += [f"Makodam {n}", f"Kodam {n}", f"Markas Kodam {n} {kota}", nama.replace("/", " ")]
    elif jenis == "Lantamal":
        m = re.search(r"Lantamal ([IVX]+)", nama)
        n = m.group(1) if m else ""
        v += [f"Lantamal {n}", f"Mako Lantamal {n}", f"Pangkalan Utama TNI AL {kota}"]
    elif jenis == "Lanal":
        v += [nama.split("(")[0].strip(), f"Pangkalan TNI AL {kota}", f"Mako {nama.split('(')[0].strip()}"]
    elif jenis == "Lanud":
        v += [nama, f"Pangkalan Udara {nama.replace('Lanud ', '')}"]
    elif jenis == "Koarmada":
        v += [nama, f"Markas Komando {nama}"]
    elif jenis == "Kogabwilhan":
        v += [nama, f"Markas {nama}"]
    else:
        v += [nama, f"Markas {nama}", f"{nama} {kota}"]
    # buang duplikat, pertahankan urutan
    hasil: list[str] = []
    for q in v:
        q = re.sub(r"\s+", " ", q).strip()
        if q and q not in hasil:
            hasil.append(q)
    return hasil


def nilai_kandidat(f: dict, b: dict, lat0: float, lon0: float) -> tuple[float, dict] | None:
    p = f.get("properties", {})
    if p.get("countrycode") not in ("ID",):
        return None
    lon, lat = f["geometry"]["coordinates"]
    d = jarak_km(lat0, lon0, lat, lon)
    if d > MAKS_KM:
        return None
    nama = (p.get("name") or "").lower()
    if not nama:
        return None
    kunci = kata_kunci(b)
    if not all(k in nama for k in kunci):
        return None
    # korem/kodam: hindari unit bawahan (koramil, kodim, polisi militer, ajudan, kesehatan)
    if re.search(r"koramil|kodim|polisi militer|\bpomdam\b|ajudan|kesehatan|kesdam|keuangan|hukum|\bzeni\b|perbekalan|peralatan|pendidikan|rumah sakit|\brs\b|rumkit|\bmess\b|asrama|perumahan|koperasi|\bbank\b|masjid|\bgereja\b|lapangan tembak|kolam|gudang|makam|pos\b|\bpangkalan udara\b.*\bpolisi\b", nama):
        return None
    jenis_osm = p.get("osm_value", "")
    kunci_osm = p.get("osm_key", "")
    if kunci_osm not in ("landuse", "military", "building", "office", "amenity", "aeroway", "government"):
        return None
    if jenis_osm in ("residential", "commercial", "industrial", "retail", "school", "university", "hospital", "clinic", "place_of_worship"):
        return None
    # unit bawahan yang biasanya berada di kompleks terpisah: bukan markas
    if re.search(r"rindam|resimen|\bdodik\b|secata|secaba|\byonif\b|batalyon|\byon\b|brigif|\bbrigade\b|kompi senapan|\bdenpom\b|\bbekang\b|\bzidam\b|\bpaldam\b|\bkodiklat\b|\bsatrad\b|\bskadron\b|\bwing\b|\bdenhanud\b|\barhanud\b|\bkavaleri\b|\barmed\b|lapangan golf|\bkesdam\b|\bdenkesyah\b|\bbintal\b|\bpenerangan\b|\bhubdam\b|perhubungan|\bpendam\b|\bsatkomlek\b|infolahta|\bsandi\b|\bjasdam\b|\btopdam\b|\bajendam\b|\bkumdam\b|\bkudam\b|\bitdam\b|\bsetum\b|\bsatpur\b|\bsatbanpur\b|\bsatjar\b|\bsatwal\b|detasemen|\bden\s|\bkompi\b|\bkoramil\b", nama):
        return None
    if re.search(r"kpad|babinmin|veteran|kepolisian|\bpolda\b|\bpolres\b|\bpolsek\b|cadangan|\bkoperasi\b|\bprimkop\b|\bpuskop\b|\bsmp\b|\bsma\b|sekolah|\btk\b|\bsd\b|kantin|\bmess\b|wisma|\bhotel\b|\bgor\b|stadion|\bpuskesmas\b|\bklinik\b|apotek|\bbalai\b|\btaman\b|museum|monumen|tugu|\bpos\b", nama):
        return None
    # harus terbaca sebagai markasnya sendiri, bukan unit lain
    if not re.search(r"\bmako\b|makorem|makodam|makoarmada|markas|\bmabes\b|headquarters|^(kodam|korem|lantamal|lanal|lanud|koarmada|kogabwilhan|kostrad|kopassus|kodiklat|pangkalan|komando)\b", nama):
        return None
    prio = PRIORITAS_OSM.get(jenis_osm, 4)
    # jarak ikut menentukan bila prioritas sama
    skor = prio * 100 + min(d, 99)
    return skor, {"lat": lat, "lon": lon, "nama_osm": p.get("name"), "osm": jenis_osm, "jarak_km": round(d, 1)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--coba", action="store_true", help="hanya tampilkan, jangan tulis")
    ap.add_argument("--jenis", default="", help="batasi ke jenis tertentu, mis. Korem")
    args = ap.parse_args()

    with open(BERKAS, newline="", encoding="utf-8") as f:
        pembaca = csv.DictReader(f)
        kolom = list(pembaca.fieldnames or [])
        baris = list(pembaca)
    if "presisi" not in kolom:
        kolom.append("presisi")

    diperbarui = 0
    for b in baris:
        if args.jenis and b["jenis"] != args.jenis:
            continue
        lat0, lon0 = float(b["lat"]), float(b["lon"])
        # bug lama: lintang positif untuk kota di belahan selatan (mis. Denpasar) -> balikkan dulu
        if b["provinsi"] in ("Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Jawa Timur", "Jawa Tengah", "DI Yogyakarta", "Jawa Barat", "DKI Jakarta", "Banten", "Lampung", "Papua", "Papua Selatan", "Papua Tengah", "Maluku") and lat0 > 0:
            lat0 = -lat0
        terbaik: tuple[float, dict] | None = None
        for q in variasi_query(b):
            for fitur in photon(q, lat0, lon0):
                k = nilai_kandidat(fitur, b, lat0, lon0)
                if k and (terbaik is None or k[0] < terbaik[0]):
                    terbaik = k
            time.sleep(JEDA)
            if terbaik and terbaik[0] < 100:
                break  # sudah dapat objek militer yang cocok
        if terbaik:
            info = terbaik[1]
            print(f"{b['id']:>4} {b['nama']:<40} -> {info['nama_osm']!s:<48} [{info['osm']}] geser {info['jarak_km']} km")
            b["lat"], b["lon"] = f"{info['lat']:.4f}", f"{info['lon']:.4f}"
            b["presisi"] = "osm"
            diperbarui += 1
        else:
            print(f"{b['id']:>4} {b['nama']:<40} -> (tidak ketemu, tetap perkiraan kota)")
            b["lat"] = f"{lat0:.4f}"
            b["presisi"] = b.get("presisi") or "kota"
        sys.stdout.flush()

    print(f"\n{diperbarui} dari {len(baris)} markas dipindah ke titik OSM.")
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
