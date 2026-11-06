"""
bangun_fasilitas.py - Bandara dan pelabuhan di kawasan dari data terbuka.

    python scripts/bangun_fasilitas.py

Sumber (sudah dipadatkan ke data/sumber/):
  - data/sumber/ourairports_kawasan.csv  : OurAirports (public domain), bandara besar/sedang di kotak
    kawasan + lapangan udara militer berdasarkan namanya.
  - data/sumber/wikidata_pelabuhan.json  : Wikidata (CC0), instance of port/seaport/harbour per negara.

Keluaran: public/data/bandara.geojson dan public/data/pelabuhan.geojson.
"""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
SUMBER = AKAR / "data" / "sumber"
KELUAR = AKAR / "public" / "data"

NEGARA_ISO = {
    "ID": "Indonesia", "MY": "Malaysia", "SG": "Singapura", "AU": "Australia", "PH": "Filipina", "VN": "Vietnam",
    "TH": "Thailand", "BN": "Brunei", "PG": "Papua Nugini", "TL": "Timor-Leste", "KH": "Kamboja", "MM": "Myanmar",
    "TW": "Taiwan", "CN": "China", "IN": "India", "US": "Amerika Serikat", "GU": "Guam (AS)", "MP": "Mariana Utara (AS)",
    "JP": "Jepang", "LA": "Laos", "BD": "Bangladesh", "LK": "Sri Lanka", "HK": "Hong Kong", "MO": "Makau",
    "PW": "Palau", "FM": "Mikronesia", "SB": "Kepulauan Solomon", "CX": "Pulau Christmas (Australia)",
    "CC": "Kepulauan Cocos (Australia)", "XP": "Kepulauan Paracel", "XS": "Kepulauan Spratly",
}
MILITER = re.compile(r"air base|air force|lanud|raaf|afb|naval air|military|airbase|air station|rtaf|rmaf", re.I)


def titik(lon: float, lat: float, props: dict) -> dict:
    return {"type": "Feature", "properties": props, "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]}}


def bangun_bandara() -> dict:
    fitur = []
    with open(SUMBER / "ourairports_kawasan.csv", newline="", encoding="utf-8") as f:
        for a in csv.DictReader(f):
            lat, lon = float(a["latitude_deg"]), float(a["longitude_deg"])
            militer = bool(MILITER.search(a["name"]))
            if a["type"] == "large_airport":
                kelas = "besar"
            elif a["type"] == "medium_airport":
                kelas = "sedang"
            elif militer:
                kelas = "militer"
            else:
                continue
            fitur.append(
                titik(
                    lon,
                    lat,
                    {
                        "id": f"bandara-{a['ident']}",
                        "nama": a["name"].replace("  ", " ").strip(),
                        "icao": a["icao_code"] or (a["ident"] if len(a["ident"]) == 4 and a["ident"].isalpha() else ""),
                        "iata": a["iata_code"],
                        "negara": NEGARA_ISO.get(a["iso_country"], a["iso_country"]),
                        "kota": a["municipality"],
                        "kelas": kelas,
                        "militer": militer,
                        "sumber": "OurAirports",
                        "url": a["wikipedia_link"] or f"https://ourairports.com/airports/{a['ident']}/",
                    },
                )
            )
    fitur.sort(key=lambda x: (x["properties"]["kelas"] != "besar", x["properties"]["nama"]))
    return {"type": "FeatureCollection", "features": fitur}


def bangun_pelabuhan() -> dict:
    d = json.loads((SUMBER / "wikidata_pelabuhan.json").read_text(encoding="utf-8"))
    fitur = []
    for p in d["pelabuhan"]:
        nama = p["nama"]
        # label Wikidata kadang huruf besar semua (dari WPI); rapikan
        if nama.isupper():
            nama = nama.title()
        fitur.append(
            titik(
                p["lon"],
                p["lat"],
                {
                    "id": f"pelabuhan-{p['qid']}",
                    "nama": nama,
                    "negara": p["negara"],
                    "sumber": "Wikidata",
                    "url": f"https://www.wikidata.org/wiki/{p['qid']}",
                },
            )
        )
    fitur.sort(key=lambda x: x["properties"]["nama"])
    return {"type": "FeatureCollection", "features": fitur}


def simpan(nama: str, obj: dict) -> None:
    KELUAR.mkdir(parents=True, exist_ok=True)
    (KELUAR / nama).write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  {nama}: {len(obj['features'])} fitur, {(KELUAR / nama).stat().st_size / 1024:.0f} KB")


def main() -> None:
    print("Membangun bandara & pelabuhan ...")
    simpan("bandara.geojson", bangun_bandara())
    simpan("pelabuhan.geojson", bangun_pelabuhan())
    print("Selesai.")


if __name__ == "__main__":
    main()
