"""
ringkas_zee.py - Mengecilkan public/data/zee.geojson supaya ringan diunduh di HP.

Poligon ZEE dari Marine Regions punya ribuan "lubang" kecil (pulau-pulau mungil) yang tidak kelihatan
pada zoom yang dipakai lapisan ini, tapi memakan ratusan KB. Skrip ini membuang lubang di bawah
MIN_LUBANG derajat persegi (~120 km²), menyederhanakan garis, dan membulatkan koordinat ke 3 desimal (~100 m).

    python scripts/ringkas_zee.py            # tulis ulang public/data/zee.geojson
    python scripts/ringkas_zee.py --coba     # hanya laporkan ukuran

Dipanggil juga oleh bangun_analisis.py supaya hasil build berikutnya tetap kecil.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.validation import make_valid

AKAR = Path(__file__).resolve().parent.parent
BERKAS = AKAR / "public" / "data" / "zee.geojson"
MIN_LUBANG = 0.01  # derajat persegi, ~120 km² di khatulistiwa
TOLERANSI = 0.01  # derajat, ~1 km


def ringkas_poligon(geom, min_lubang: float = MIN_LUBANG, toleransi: float = TOLERANSI):
    """Buang lubang kecil, sederhanakan, bulatkan, lalu perbaiki geometri. Mengembalikan MultiPolygon yang valid."""
    poligon = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    hasil = []
    for p in poligon:
        if p.geom_type != "Polygon":
            continue
        lubang = [r for r in p.interiors if abs(Polygon(r).area) >= min_lubang]
        q = Polygon(p.exterior, lubang).simplify(toleransi, preserve_topology=True)
        q = shape(bulat(mapping(q)))
        # poligon mentah Marine Regions sudah punya simpul ganda dan perpotongan kecil; make_valid memecahnya
        # jadi beberapa bagian, yang berupa garis (sliver tanpa luas) dibuang
        for bagian in getattr(make_valid(q), "geoms", [make_valid(q)]):
            if bagian.geom_type == "Polygon" and bagian.area >= min_lubang / 10:
                hasil.append(bagian)
            elif bagian.geom_type == "MultiPolygon":
                hasil.extend(b for b in bagian.geoms if b.area >= min_lubang / 10)
    return MultiPolygon(hasil)


def bulat(obj, n: int = 3):
    return json.loads(json.dumps(obj), parse_float=lambda x: round(float(x), n))


def ringkas_koleksi(koleksi: dict) -> dict:
    for f in koleksi["features"]:
        g = f["geometry"]
        if g["type"] in ("Polygon", "MultiPolygon"):
            f["geometry"] = mapping(ringkas_poligon(shape(g)))
        else:
            f["geometry"] = bulat(g)
    return koleksi


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--coba", action="store_true")
    args = ap.parse_args()
    sebelum = BERKAS.stat().st_size
    koleksi = ringkas_koleksi(json.loads(BERKAS.read_text(encoding="utf-8")))
    teks = json.dumps(koleksi, ensure_ascii=False, separators=(",", ":"))
    print(f"{sebelum / 1024:.0f} KB -> {len(teks.encode()) / 1024:.0f} KB")
    if not args.coba:
        BERKAS.write_text(teks, encoding="utf-8")


if __name__ == "__main__":
    main()
