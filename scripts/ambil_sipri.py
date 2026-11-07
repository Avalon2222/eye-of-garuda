"""
ambil_sipri.py - Mengambil volume impor senjata utama Indonesia per negara pemasok langsung dari
SIPRI Arms Transfers Database (API yang dipakai situs armstransfers.sipri.org), lalu menulis:

  data/sipri_impor.csv   : ringkasan per pemasok (TIV 2000-sekarang, contoh alutsista dari trade register)
  public/data/sipri.json : berkas yang dibaca aplikasi (busur + legenda + deret tahunan)

    python scripts/ambil_sipri.py              # tulis kedua berkas
    python scripts/ambil_sipri.py --keluar x   # tulis JSON ke lokasi lain (dipakai GitHub Actions ke cabang data)

Satuan: juta TIV (trend-indicator value), indikator volume, bukan harga. SIPRI memperbarui data tiap Maret.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
API = "https://atbackend.sipri.org/api/p"
TAHUN_AWAL = 2000
ID_INDONESIA = 1150592  # EntityId "Indonesia" di daftar negara SIPRI
MIN_TIV = 10  # pemasok di bawah ini digabung ke "lainnya" (tidak digambar sebagai busur)

# ibu kota pemasok (lat, lon) + nama Indonesia
NEGARA = {
    "South Korea": ("Korea Selatan", 37.5, 127.0),
    "United States": ("Amerika Serikat", 38.9, -77.0),
    "Russia": ("Rusia", 55.8, 37.6),
    "Netherlands": ("Belanda", 52.1, 4.3),
    "United Kingdom": ("Inggris", 51.5, -0.1),
    "France": ("Prancis", 48.9, 2.3),
    "Germany": ("Jerman", 52.5, 13.4),
    "China": ("China", 39.9, 116.4),
    "Switzerland": ("Swiss", 46.9, 7.4),
    "Spain": ("Spanyol", 40.4, -3.7),
    "Australia": ("Australia", -35.3, 149.1),
    "Brazil": ("Brasil", -15.8, -47.9),
    "Italy": ("Italia", 41.9, 12.5),
    "Belgium": ("Belgia", 50.8, 4.4),
    "Denmark": ("Denmark", 55.7, 12.6),
    "Czechia": ("Ceko", 50.1, 14.4),
    "Ukraine": ("Ukraina", 50.5, 30.5),
    "Turkiye": ("Turki", 39.9, 32.9),
    "Türkiye": ("Turki", 39.9, 32.9),
    "Turkey": ("Turki", 39.9, 32.9),
    "Canada": ("Kanada", 45.4, -75.7),
    "Norway": ("Norwegia", 59.9, 10.8),
    "Brunei": ("Brunei", 4.9, 114.9),
    "Sweden": ("Swedia", 59.3, 18.1),
    "Poland": ("Polandia", 52.2, 21.0),
    "Austria": ("Austria", 48.2, 16.4),
    "Israel": ("Israel", 31.8, 35.2),
    "Slovakia": ("Slovakia", 48.1, 17.1),
    "Singapore": ("Singapura", 1.3, 103.8),
    "Thailand": ("Thailand", 13.8, 100.5),
    "South Africa": ("Afrika Selatan", -25.7, 28.2),
    "Japan": ("Jepang", 35.7, 139.7),
    "India": ("India", 28.6, 77.2),
    "Serbia": ("Serbia", 44.8, 20.5),
    "Finland": ("Finlandia", 60.2, 24.9),
    "Portugal": ("Portugal", 38.7, -9.1),
    "Pakistan": ("Pakistan", 33.7, 73.0),
    "Malaysia": ("Malaysia", 3.1, 101.7),
    "Jordan": ("Yordania", 31.9, 35.9),
    "Qatar": ("Qatar", 25.3, 51.5),
    "United Arab Emirates": ("Uni Emirat Arab", 24.5, 54.4),
    "New Zealand": ("Selandia Baru", -41.3, 174.8),
}


def post(jalur: str, body: dict) -> object:
    req = urllib.request.Request(
        f"{API}/{jalur}",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "eye-of-garuda-data/1.0"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def tabel_pemasok(tahun_akhir: int) -> tuple[dict[str, list[float]], list[float], list[int]]:
    """TIV per pemasok per tahun (juta), deret total Indonesia, daftar tahun."""
    body = {
        "filters": [
            {"field": "Year range 1", "oldField": "", "condition": "contains", "value1": str(TAHUN_AWAL), "value2": str(tahun_akhir), "listData": []},
            {"field": "Recipient", "oldField": "", "condition": "contains", "value1": "", "value2": "", "listData": [ID_INDONESIA]},
            {"field": "orderbyseller", "oldField": "", "condition": "", "value1": "", "value2": "", "listData": []},
            {"field": "DeliveryType", "oldField": "", "condition": "", "value1": "delivered", "value2": "", "listData": []},
            {"field": "Status", "oldField": "", "condition": "", "value1": "0", "value2": "", "listData": []},
        ],
        "logic": "AND",
    }
    hasil = post("trades/import-export-csv-str/", body)
    teks = hasil["result"] if isinstance(hasil, dict) else str(hasil)
    baris = list(csv.reader(teks.splitlines()))
    # cari baris judul "Supplier,2000,..."
    idx = next(i for i, b in enumerate(baris) if b and b[0] == "Supplier")
    judul = baris[idx]
    tahun = [int(x) for x in judul[1:] if x.isdigit()]
    n = len(tahun)
    per_pemasok: dict[str, list[float]] = {}
    total: list[float] = []
    for b in baris[idx + 1 :]:
        if not b or not b[0]:
            continue
        nilai = [float(x.strip() or 0) for x in b[1 : 1 + n]]
        if b[0].startswith("Total"):
            total = nilai
        else:
            per_pemasok[b[0]] = nilai
    return per_pemasok, total, tahun


def tahun_terakhir() -> int:
    try:
        y = post("trades/getMaxYear", {})
        return int(y) if y else date.today().year - 1
    except Exception:  # noqa: BLE001
        return date.today().year - 1


def register(tahun_akhir: int) -> list[dict]:
    """Semua baris trade register Indonesia (pengiriman 2000-sekarang), untuk contoh alutsista."""
    semua: list[dict] = []
    hal = 0
    while True:
        body = {
            "filters": [
                {"field": "Recipient", "oldField": "", "condition": "contains", "value1": "", "value2": "", "listData": [ID_INDONESIA]},
                {"field": "Delivery Year", "oldField": "", "condition": "between", "value1": str(TAHUN_AWAL), "value2": str(tahun_akhir), "listData": []},
                {"field": "UNROCA", "value1": False},
            ],
            "logic": "AND",
            "pageNo": hal,
            "pageSize": 100,
            "sorts": {},
        }
        d = post("trades/search", body)
        if not isinstance(d, list) or not d:
            break
        semua.extend(d)
        if len(d) < 100 or hal > 40:
            break
        hal += 1
    return semua


def contoh_dari_register(reg: list[dict]) -> dict[str, str]:
    """Per pemasok: sampai 4 sistem paling menonjol. Mesin dan sensor hanya dipakai bila tidak ada sistem lain."""
    per: dict[str, dict[str, dict]] = defaultdict(dict)
    for t in reg:
        s = t.get("seller") or ""
        d = (t.get("desg") or "").strip().rstrip("-").strip()
        if not s or not d:
            continue
        kategori = (t.get("category") or "").strip()
        e = per[s].setdefault(d, {"unit": 0, "tahun": 0, "desc": (t.get("desc") or "").strip(), "kategori": kategori})
        e["unit"] += int(t.get("units") or 0)
        e["tahun"] = max(e["tahun"], int(t.get("deliveryYr") or 0))
    hasil = {}
    for s, m in per.items():
        utama = [(d, e) for d, e in m.items() if e["kategori"] not in ("Engines", "Sensors") and "engine" not in d.lower()]
        cadangan = [(d, e) for d, e in m.items() if (d, e) not in utama]
        urut = sorted(utama, key=lambda kv: (-(kv[1]["tahun"] // 5), -kv[1]["unit"]))
        if len(urut) < 2:
            urut += sorted(cadangan, key=lambda kv: (-(kv[1]["tahun"] // 5), -kv[1]["unit"]))
        pilih = []
        for d, e in urut[:4]:
            pilih.append(f"{d} ({e['desc']})" if e["desc"] and len(e["desc"]) < 28 else d)
        hasil[s] = " · ".join(pilih)
    return hasil


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--keluar", default=str(AKAR / "public" / "data" / "sipri.json"))
    ap.add_argument("--tanpa-csv", action="store_true")
    args = ap.parse_args()

    akhir = tahun_terakhir()
    print(f"Mengambil tabel importer Indonesia {TAHUN_AWAL}-{akhir} ...")
    per_pemasok, total, tahun = tabel_pemasok(akhir)
    if tahun:
        akhir = tahun[-1]
    print(f"  {len(per_pemasok)} pemasok, total {sum(total):,.0f} juta TIV")
    print("Mengambil trade register untuk contoh alutsista ...")
    reg = register(akhir)
    print(f"  {len(reg)} baris register")
    contoh = contoh_dari_register(reg)

    pemasok = []
    lainnya = 0.0
    total_tiv = sum(total) if total else sum(sum(v) for v in per_pemasok.values())
    for nama_en, seri in sorted(per_pemasok.items(), key=lambda kv: -sum(kv[1])):
        tiv = sum(seri)
        if nama_en not in NEGARA:
            print(f"  ! koordinat {nama_en} belum ada, dilewati", file=sys.stderr)
            lainnya += tiv
            continue
        if tiv < MIN_TIV:
            lainnya += tiv
            continue
        nama_id, lat, lon = NEGARA[nama_en]
        puncak = tahun[max(range(len(seri)), key=lambda i: seri[i])] if seri else None
        pemasok.append(
            {
                "negara": nama_id,
                "negara_en": nama_en,
                "lat": lat,
                "lon": lon,
                "tiv_juta": round(tiv),
                "persen": round(100 * tiv / total_tiv, 1),
                "seri": [round(x) for x in seri],
                "tahun_puncak": puncak,
                "contoh": contoh.get(nama_en, ""),
                "sumber": "SIPRI Arms Transfers Database",
                "url": "https://armstransfers.sipri.org/ArmsTransfer/ImportExport",
            }
        )

    keluar = {
        "tujuan": {"nama": "Jakarta", "lat": -6.2, "lon": 106.8},
        "periode": f"{TAHUN_AWAL}–{akhir}",
        "tahun": tahun,
        "satuan": "juta TIV (SIPRI trend-indicator value)",
        "total_tiv_juta": round(total_tiv),
        "total_per_tahun": [round(x) for x in total],
        "lainnya_tiv_juta": round(lainnya),
        "diambil": date.today().isoformat(),
        "catatan": "Nilai TIV SIPRI adalah indikator volume pengiriman senjata utama, bukan harga kontrak. Diambil langsung dari basis data SIPRI; dibulatkan ke juta TIV.",
        "pemasok": pemasok,
    }
    Path(args.keluar).parent.mkdir(parents=True, exist_ok=True)
    with open(args.keluar, "w", encoding="utf-8") as f:
        json.dump(keluar, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  ditulis {args.keluar}")

    if not args.tanpa_csv:
        csv_path = AKAR / "data" / "sipri_impor.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["negara", "negara_en", "lat", "lon", f"tiv_juta_{TAHUN_AWAL}_{akhir}", "persen", "tahun_puncak", "contoh_alutsista", "sumber", "url_sumber"])
            for p in pemasok:
                w.writerow([p["negara"], p["negara_en"], p["lat"], p["lon"], p["tiv_juta"], p["persen"], p["tahun_puncak"], p["contoh"], p["sumber"], p["url"]])
        print(f"  ditulis {csv_path.relative_to(AKAR)}")
    print("Selesai.")


if __name__ == "__main__":
    main()
