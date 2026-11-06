"""
bangun_data.py - Mengubah CSV di data/ menjadi GeoJSON/JSON di public/data/.

Dijalankan setiap kali data statis berubah:
    python scripts/bangun_data.py

Semua koordinat adalah perkiraan lokasi umum dari sumber publik (lihat data/SUMBER_DATA.md).
"""

from __future__ import annotations

import csv
import json
import re
from datetime import date
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
DATA = AKAR / "data"
KELUAR = AKAR / "public" / "data"

# Kotak kawasan yang dipakai untuk menyaring landing station kabel (Asia Tenggara + sekitarnya)
KOTAK_KAWASAN = (88.0, -20.0, 150.0, 25.0)  # lon_min, lat_min, lon_max, lat_max


def baca_csv(nama: str) -> list[dict]:
    with open(DATA / nama, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def angka(x: str) -> float | None:
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def titik(baris: dict, props: dict) -> dict:
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {"type": "Point", "coordinates": [angka(baris["lon"]), angka(baris["lat"])]},
    }


def simpan(nama: str, obj: dict | list) -> None:
    KELUAR.mkdir(parents=True, exist_ok=True)
    with open(KELUAR / nama, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  {nama}: {(KELUAR / nama).stat().st_size / 1024:.1f} KB")


def operator_utama(teks: str) -> str:
    """'Australia (+ AS rotasi)' -> 'Australia'."""
    return teks.split("(")[0].strip()


def bangun_markas() -> dict:
    fitur = []
    for b in baca_csv("markas_tni.csv"):
        fitur.append(
            titik(
                b,
                {
                    "id": f"tni-{b['id']}",
                    "nama": b["nama"],
                    "matra": b["matra"],
                    "jenis": b["jenis"],
                    "kota": b["kota"],
                    "provinsi": b["provinsi"],
                    "keterangan": b["keterangan"],
                    "sumber": b["sumber"],
                    "url": b["url_sumber"],
                },
            )
        )
    return {"type": "FeatureCollection", "features": fitur}


def bangun_perbatasan() -> dict:
    fitur = []
    for b in baca_csv("pulau_terluar_perbatasan.csv"):
        fitur.append(
            titik(
                b,
                {
                    "id": f"batas-{b['id']}",
                    "nama": b["nama"],
                    "jenis": b["jenis"],
                    "provinsi": b["provinsi"],
                    "berbatasan": b["berbatasan_dengan"],
                    "keterangan": b["keterangan"],
                    "sumber": b["sumber"],
                    "url": b["url_sumber"],
                },
            )
        )
    return {"type": "FeatureCollection", "features": fitur}


JENIS_WIKIDATA = {
    "airbase": "udara",
    "naval base": "laut",
    "naval station": "laut",
    "Mobile Naval Air Base": "laut",
    "naval arsenal": "laut",
    "military base": "darat",
    "military installation": "darat",
    "barracks": "darat",
    "cantonment": "darat",
    "military radar station": "radar",
}
# nama yang hampir pasti historis / bukan pangkalan aktif (benteng kuno, kamp Perang Vietnam, fasilitas pendukung)
POLA_BUANG = re.compile(
    r"\bfort\b|\bdurg\b|qila|\bcamp\b|firebase|base camp|\bRAF\b|royal air force|arsenal|golf|housing|hospital|tank|"
    r"communication|reserve|annex|\bpark\b|consulate|airfield|\bformer\b|\bold\b|landing ground|"
    r"fire support|combat base|\bLZ\b|hill \d|jail|base area|railway|\barch\b|mallala|nabiac|uranquinty|tocumwal|evans head",
    re.I,
)
POLA_AUSTRALIA = re.compile(r"RAAF Base|HMAS |Barracks|Army|Naval|Navy|Air Base|Air Force|Defence|Training Area|Joint", re.I)


def jarak_derajat(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return ((lat1 - lat2) ** 2 + ((lon1 - lon2) * 0.99) ** 2) ** 0.5


def pangkalan_asing_wikidata(kurasi: list[dict]) -> list[dict]:
    """Pangkalan militer negara-negara kawasan dari Wikidata, dipakai untuk melengkapi daftar kurasi."""
    d = json.loads((DATA / "sumber" / "wikidata_militer.json").read_text(encoding="utf-8"))
    hasil = []
    for f in d["fasilitas"]:
        if f["negara"] == "Indonesia":
            continue
        if f["jenis"] not in JENIS_WIKIDATA:
            continue
        if POLA_BUANG.search(f["nama"]):
            continue
        if f["negara"] == "Australia" and not POLA_AUSTRALIA.search(f["nama"]):
            continue
        if f["negara"] in ("Taiwan", "Vietnam") and f["jenis"] not in ("airbase", "naval base"):
            continue
        # Hong Kong: barak era kolonial, lewati
        if 22.1 < f["lat"] < 22.6 and 113.8 < f["lon"] < 114.5:
            continue
        # sudah ada di daftar kurasi (jarak < ~3 km)?
        if any(jarak_derajat(f["lat"], f["lon"], angka(k["lat"]) or 0, angka(k["lon"]) or 0) < 0.03 for k in kurasi):
            continue
        hasil.append(f)
    # buang duplikat nama yang sama berdekatan
    unik: list[dict] = []
    for f in hasil:
        if any(u["nama"] == f["nama"] and jarak_derajat(u["lat"], u["lon"], f["lat"], f["lon"]) < 0.05 for u in unik):
            continue
        unik.append(f)
    return unik


def bangun_pangkalan_asing() -> dict:
    fitur = []
    kurasi = baca_csv("pangkalan_asing.csv")
    for f in pangkalan_asing_wikidata(kurasi):
        fitur.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"asing-{f['qid']}",
                    "nama": f["nama_id"] or f["nama"],
                    "operator": f["negara"],
                    "operator_utama": f["negara"],
                    "tuan_rumah": f["negara"],
                    "jenis": JENIS_WIKIDATA[f["jenis"]],
                    "status": "menurut Wikidata",
                    "keterangan": f"{f['jenis']}" + (f"; operator: {f['operator']}" if f["operator"] else "") + ". Data Wikidata, status operasional tidak diverifikasi.",
                    "sumber": "Wikidata",
                    "url": f"https://www.wikidata.org/wiki/{f['qid']}",
                    "kurasi": False,
                },
                "geometry": {"type": "Point", "coordinates": [f["lon"], f["lat"]]},
            }
        )
    for b in kurasi:
        fitur.append(
            titik(
                b,
                {
                    "id": f"asing-{b['id']}",
                    "nama": b["nama"],
                    "operator": b["negara_operator"],
                    "operator_utama": operator_utama(b["negara_operator"]),
                    "tuan_rumah": b["negara_tuan_rumah"],
                    "jenis": b["jenis"],
                    "status": b["status"],
                    "keterangan": b["keterangan"],
                    "sumber": b["sumber"],
                    "url": b["url_sumber"],
                    "kurasi": True,
                },
            )
        )
    # kurasi digambar paling atas (urutan fitur = urutan gambar)
    fitur.sort(key=lambda f: f["properties"]["kurasi"])
    return {"type": "FeatureCollection", "features": fitur}


def bangun_alki() -> dict:
    jalur: dict[str, list] = {}
    for b in baca_csv("alki.csv"):
        jalur.setdefault(b["alki"], []).append((int(b["urutan"]), angka(b["lon"]), angka(b["lat"]), b["keterangan"]))
    fitur = []
    for nama, titik_titik in jalur.items():
        titik_titik.sort()
        fitur.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"alki-{nama.split()[-1].lower()}",
                    "nama": nama,
                    "rute": " → ".join(t[3] for t in titik_titik),
                    "sumber": "PP No. 37 Tahun 2002 (garis tengah ilustratif)",
                    "url": "https://id.wikipedia.org/wiki/Alur_Laut_Kepulauan_Indonesia",
                },
                "geometry": {"type": "LineString", "coordinates": [[t[1], t[2]] for t in titik_titik]},
            }
        )
    return {"type": "FeatureCollection", "features": fitur}


def bangun_kabel() -> tuple[dict, dict]:
    with open(DATA / "sumber" / "kabel_geo.json", encoding="utf-8") as f:
        geo = json.load(f)
    info = {b["id"]: b for b in csv.DictReader(open(DATA / "sumber" / "kabel.csv", newline="", encoding="utf-8"))}
    fitur = []
    for f_ in geo["features"]:
        p = f_["properties"]
        i = info.get(p["id"], {})
        # bulatkan koordinat ke 3 desimal agar file lebih kecil (±100 m, cukup untuk skala kawasan)
        geom = f_["geometry"]
        if geom["type"] == "MultiLineString":
            geom = {"type": "MultiLineString", "coordinates": [[[round(x, 3), round(y, 3)] for x, y in g] for g in geom["coordinates"]]}
        elif geom["type"] == "LineString":
            geom = {"type": "LineString", "coordinates": [[round(x, 3), round(y, 3)] for x, y in geom["coordinates"]]}
        fitur.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"kabel-{p['id']}",
                    "nama": p["nama"],
                    "kategori": p["kategori"],
                    "status": p["status"],
                    "rfs": i.get("rfs", ""),
                    "panjang_km": angka(i.get("panjang_km", "")),
                    "pemilik": i.get("pemilik", ""),
                    "n_landing": int(float(i.get("n_landing", 0) or 0)),
                    "url": i.get("url", ""),
                },
                "geometry": geom,
            }
        )
    lon0, lat0, lon1, lat1 = KOTAK_KAWASAN
    stasiun = []
    for b in csv.DictReader(open(DATA / "sumber" / "landing_station.csv", newline="", encoding="utf-8")):
        lon, lat = angka(b["lon"]), angka(b["lat"])
        if lon is None or lat is None or not (lon0 <= lon <= lon1 and lat0 <= lat <= lat1):
            continue
        stasiun.append(
            {
                "type": "Feature",
                "properties": {
                    "id": f"landing-{b['id']}",
                    "nama": b["nama"],
                    "negara": b["negara"],
                    "n_kabel": int(float(b["n_kabel"] or 0)),
                    "n_kabel_aktif": int(float(b["n_kabel_aktif"] or 0)),
                    "url": b["url"],
                },
                "geometry": {"type": "Point", "coordinates": [round(lon, 4), round(lat, 4)]},
            }
        )
    return {"type": "FeatureCollection", "features": fitur}, {"type": "FeatureCollection", "features": stasiun}


def bangun_tabel() -> dict:
    return {
        "anggaran_indonesia": [
            {
                "tahun": int(b["tahun"]),
                "rp_triliun": angka(b["anggaran_rp_triliun"]),
                "persen_pdb": angka(b["persen_pdb"]),
                "keyakinan": b["keyakinan"],
                "catatan": b["catatan"],
                "sumber": b["sumber"],
            }
            for b in baca_csv("anggaran_indonesia.csv")
        ],
        "anggaran_kawasan": [
            {
                "negara": b["negara"],
                "usd_miliar": angka(b["belanja_usd_miliar_2024"]),
                "persen_pdb": angka(b["persen_pdb_2024"]),
                "personel_ribu": angka(b["personel_aktif_ribu"]),
                "keyakinan": b["keyakinan"],
                "sumber": b["sumber"],
            }
            for b in baca_csv("anggaran_kawasan.csv")
        ],
        "alutsista": [
            {
                "matra": b["matra"],
                "nama": b["alutsista"],
                "jumlah": angka(b["jumlah_perkiraan"]),
                "status": b["status"],
                "sumber": b["sumber"],
            }
            for b in baca_csv("alutsista.csv")
        ],
    }


def main() -> None:
    print("Membangun public/data/ ...")
    markas = bangun_markas()
    perbatasan = bangun_perbatasan()
    asing = bangun_pangkalan_asing()
    alki = bangun_alki()
    kabel, landing = bangun_kabel()
    tabel = bangun_tabel()
    simpan("markas_tni.geojson", markas)
    simpan("perbatasan.geojson", perbatasan)
    simpan("pangkalan_asing.geojson", asing)
    simpan("alki.geojson", alki)
    simpan("kabel.geojson", kabel)
    simpan("landing_station.geojson", landing)
    simpan("tabel.json", tabel)
    simpan(
        "meta.json",
        {
            "dibangun": date.today().isoformat(),
            "jumlah": {
                "markas_tni": len(markas["features"]),
                "perbatasan": len(perbatasan["features"]),
                "pangkalan_asing": len(asing["features"]),
                "alki": len(alki["features"]),
                "kabel": len(kabel["features"]),
                "landing_station": len(landing["features"]),
            },
        },
    )
    print("Selesai.")


if __name__ == "__main__":
    main()
