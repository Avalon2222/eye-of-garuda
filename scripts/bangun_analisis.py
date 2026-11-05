"""
bangun_analisis.py - Menyiapkan lapisan analisis fase 3 ke public/data/:

  zee.geojson      : ZEE Indonesia (Marine Regions, disederhanakan) + sembilan garis putus (ilustratif)
                     + poligon tumpang tindih di Laut Natuna Utara
  radius.geojson   : lingkaran radius tempur dari tiap Lanud + "titik buta" (ZEE di luar semua lingkaran)
  sipri.json       : impor senjata per negara pemasok (busur ke Jakarta)
  insiden.json     : lini masa insiden & latihan

ZEE diunduh sekali dari WFS Marine Regions (mrgid 8492) ke data/sumber/zee_indonesia.json (45 MB, tidak di-commit),
lalu disederhanakan ke ~0,03 derajat.

    python scripts/bangun_analisis.py
"""

from __future__ import annotations

import csv
import json
import math
from pathlib import Path

import requests
from shapely.geometry import MultiPolygon, Point, Polygon, mapping, shape
from shapely.ops import unary_union

AKAR = Path(__file__).resolve().parent.parent
DATA = AKAR / "data"
KELUAR = AKAR / "public" / "data"
ZEE_MENTAH = DATA / "sumber" / "zee_indonesia.json"
ZEE_BATAS = DATA / "sumber" / "zee_batas.json"
URL_BATAS = (
    "https://geo.vliz.be/geoserver/MarineRegions/wfs?service=WFS&version=1.0.0&request=GetFeature"
    "&typeName=MarineRegions:eez_boundaries&outputFormat=json&cql_filter=sovereign1='Indonesia'%20OR%20sovereign2='Indonesia'"
)
URL_ZEE = (
    "https://geo.vliz.be/geoserver/MarineRegions/wfs?service=WFS&version=1.0.0&request=GetFeature"
    "&typeName=MarineRegions:eez&outputFormat=json&cql_filter=mrgid=8492"
)
TOLERANSI = 0.03

# Sembilan garis putus, digambar ilustratif dari koordinat yang lazim dikutip (lon, lat). Bukan dokumen resmi.
SEMBILAN_GARIS = [
    [[121.7, 21.9], [122.0, 20.3]],
    [[119.4, 18.4], [119.0, 16.7]],
    [[118.1, 14.4], [117.5, 12.8]],
    [[116.6, 10.6], [115.9, 9.2]],
    [[113.6, 7.3], [112.5, 6.2]],
    [[110.4, 5.0], [109.0, 4.0]],
    [[108.2, 5.6], [107.7, 7.0]],
    [[108.5, 9.6], [109.0, 11.4]],
    [[109.6, 13.3], [109.9, 15.3]],
]
# poligon klaim (ilustratif) yang dilingkupi garis-garis itu, untuk menghitung tumpang tindih
KLAIM = Polygon(
    [[110.0, 20.0], [121.0, 23.0]]
    + [p for g in SEMBILAN_GARIS for p in g]
    + [[109.5, 18.3]]
)


def baca_csv(nama: str) -> list[dict]:
    with open(DATA / nama, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def simpan(nama: str, obj) -> None:
    KELUAR.mkdir(parents=True, exist_ok=True)
    with open(KELUAR / nama, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  {nama}: {(KELUAR / nama).stat().st_size / 1024:.1f} KB")


def bulat(geom, n=3):
    return json.loads(json.dumps(mapping(geom)), parse_float=lambda x: round(float(x), n))


def muat_zee():
    if not ZEE_MENTAH.exists():
        print("Mengunduh ZEE Indonesia dari Marine Regions ...")
        ZEE_MENTAH.parent.mkdir(parents=True, exist_ok=True)
        ZEE_MENTAH.write_bytes(requests.get(URL_ZEE, timeout=300).content)
    g = json.loads(ZEE_MENTAH.read_text(encoding="utf-8"))
    geoms = [shape(f["geometry"]) for f in g["features"]]
    return unary_union(geoms).buffer(0)


def lingkaran(lon: float, lat: float, radius_km: float, n: int = 96) -> Polygon:
    r = 6371.0088
    d = radius_km / r
    titik = []
    for i in range(n):
        b = math.radians(360 * i / n)
        la1, lo1 = math.radians(lat), math.radians(lon)
        la2 = math.asin(math.sin(la1) * math.cos(d) + math.cos(la1) * math.sin(d) * math.cos(b))
        lo2 = lo1 + math.atan2(math.sin(b) * math.sin(d) * math.cos(la1), math.cos(d) - math.sin(la1) * math.sin(la2))
        titik.append((math.degrees(lo2), math.degrees(la2)))
    return Polygon(titik)


def muat_batas() -> list[dict]:
    """Garis batas maritim Indonesia (perjanjian, garis tengah, 200 NM); baseline kepulauan dilewati."""
    if not ZEE_BATAS.exists():
        print("Mengunduh garis batas dari Marine Regions ...")
        ZEE_BATAS.write_bytes(requests.get(URL_BATAS, timeout=300).content)
    g = json.loads(ZEE_BATAS.read_text(encoding="utf-8"))
    fitur = []
    for f in g["features"]:
        p = f["properties"]
        if p.get("line_type") == "Archipelagic baseline":
            continue
        tetangga = [x for x in (p.get("sovereign1"), p.get("sovereign2")) if x and x != "Indonesia"]
        geom = shape(f["geometry"]).simplify(0.01, preserve_topology=True)
        fitur.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"zee-batas-{p.get('line_id')}",
                    "nama": f"Batas {p.get('line_type', '')}" + (f" dengan {tetangga[0]}" if tetangga else ""),
                    "jenis": "batas",
                    "tipe_garis": p.get("line_type", ""),
                    "tetangga": tetangga[0] if tetangga else "",
                    "keterangan": p.get("line_name") or p.get("doc_date") or "",
                    "sumber": p.get("source1") or "Marine Regions",
                    "url": p.get("url1") or "https://www.marineregions.org/eezdetails.php?mrgid=8492",
                },
                "geometry": bulat(geom),
            }
        )
    return fitur


def bangun_zee(zee) -> dict:
    zee_s = zee.simplify(TOLERANSI, preserve_topology=True)
    tumpang = zee.intersection(KLAIM).simplify(TOLERANSI, preserve_topology=True)
    fitur = [
        {
            "type": "Feature",
            "properties": {
                "id": "zee-indonesia",
                "nama": "ZEE Indonesia",
                "jenis": "zee",
                "keterangan": "Zona Ekonomi Eksklusif 200 mil laut (Marine Regions v12, disederhanakan). Bukan batas resmi.",
                "sumber": "Flanders Marine Institute (2023), Maritime Boundaries Geodatabase v12",
                "url": "https://www.marineregions.org/eezdetails.php?mrgid=8492",
            },
            "geometry": bulat(zee_s),
        },
        {
            "type": "Feature",
            "properties": {
                "id": "zee-sembilan-garis",
                "nama": "Sembilan garis putus (ilustratif)",
                "jenis": "sembilan_garis",
                "keterangan": "Klaim China di Laut China Selatan, digambar ilustratif dari koordinat yang lazim dikutip. Putusan Arbitrase 2016 menyatakan klaim ini tidak berdasar hukum.",
                "sumber": "Wikipedia: Nine-dash line",
                "url": "https://en.wikipedia.org/wiki/Nine-dash_line",
            },
            "geometry": {"type": "MultiLineString", "coordinates": SEMBILAN_GARIS},
        },
        {
            "type": "Feature",
            "properties": {
                "id": "zee-tumpang-tindih",
                "nama": "Tumpang tindih klaim di Natuna Utara",
                "jenis": "tumpang_tindih",
                "keterangan": f"Perpotongan ilustratif ZEE Indonesia dengan area di dalam sembilan garis putus: sekitar {tumpang.area * 12300:,.0f} km² (perkiraan kasar).",
                "sumber": "Perhitungan sendiri dari dua lapisan di atas",
                "url": "https://en.wikipedia.org/wiki/Natuna_Regency#Chinese_claims",
            },
            "geometry": bulat(tumpang),
        },
    ] + muat_batas()
    return {"type": "FeatureCollection", "features": fitur}


def bangun_radius(zee) -> dict:
    warna = {"F-16 Fighting Falcon": "#c084fc", "Su-27 / Su-30": "#e879f9", "Rafale (rencana)": "#f0abfc", "Hawk 109/209": "#a78bfa"}
    fitur = []
    gabungan = []
    for b in baca_csv("radius_tempur.csv"):
        lon, lat, r = float(b["lon"]), float(b["lat"]), float(b["radius_km"])
        poli = lingkaran(lon, lat, r)
        if b["status"] == "aktif":
            gabungan.append(poli)
        fitur.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"radius-{len(fitur) + 1}",
                    "nama": f"{b['pesawat']} · {int(r):,} km".replace(",", "."),
                    "lanud": b["lanud"],
                    "pesawat": b["pesawat"],
                    "radius_km": r,
                    "status": b["status"],
                    "warna": warna.get(b["pesawat"], "#e879f9"),
                    "keterangan": b["keterangan"],
                    "sumber": b["sumber"],
                    "url": b["url_sumber"],
                },
                "geometry": bulat(poli),
            }
        )
    buta = zee.difference(unary_union(gabungan)).simplify(TOLERANSI, preserve_topology=True)
    buta_fc = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "id": "radius-buta",
                    "nama": "Di luar radius tempur aktif",
                    "lanud": "-",
                    "pesawat": "-",
                    "keterangan": "Bagian ZEE yang berada di luar semua lingkaran radius tempur pesawat yang aktif (tanpa tanker udara). Ilustratif.",
                    "sumber": "Perhitungan sendiri",
                    "url": "",
                },
                "geometry": bulat(buta),
            }
        ],
    }
    return {"type": "FeatureCollection", "features": fitur}, buta_fc


def bangun_sipri() -> dict:
    baris = baca_csv("sipri_impor.csv")
    total = sum(float(b["tiv_juta_2000_2024"]) for b in baris)
    return {
        "tujuan": {"nama": "Jakarta", "lat": -6.2, "lon": 106.8},
        "periode": "2000–2024",
        "satuan": "juta TIV (SIPRI trend-indicator value)",
        "total_tiv_juta": total,
        "catatan": "Angka dibulatkan dari tabel importer SIPRI dan ditandai keyakinan rendah; periksa ulang di basis data SIPRI sebelum dikutip.",
        "pemasok": [
            {
                "negara": b["negara"],
                "lat": float(b["lat"]),
                "lon": float(b["lon"]),
                "tiv_juta": float(b["tiv_juta_2000_2024"]),
                "persen": round(100 * float(b["tiv_juta_2000_2024"]) / total, 1),
                "keyakinan": b["keyakinan"],
                "contoh": b["contoh_alutsista"],
                "sumber": b["sumber"],
                "url": b["url_sumber"],
            }
            for b in baris
        ],
    }


def bangun_insiden() -> dict:
    fitur = []
    for b in baca_csv("insiden.csv"):
        fitur.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"insiden-{b['id']}",
                    "judul": b["judul"],
                    "label": f"{b['tanggal'][:4]} · {b['judul']}",
                    "tanggal": b["tanggal"],
                    "kategori": b["kategori"],
                    "keterangan": b["keterangan"],
                    "sumber": b["sumber"],
                    "url": b["url_sumber"],
                },
                "geometry": {"type": "Point", "coordinates": [float(b["lon"]), float(b["lat"])]},
            }
        )
    fitur.sort(key=lambda f: f["properties"]["tanggal"])
    return {"type": "FeatureCollection", "features": fitur}


def main() -> None:
    print("Membangun lapisan analisis ...")
    zee = muat_zee()
    simpan("zee.geojson", bangun_zee(zee))
    radius, buta = bangun_radius(zee)
    simpan("radius.geojson", radius)
    simpan("radius_buta.geojson", buta)
    simpan("sipri.json", bangun_sipri())
    simpan("insiden.json", bangun_insiden())
    print("Selesai.")


if __name__ == "__main__":
    main()
