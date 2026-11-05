"""
bangun_satelit.py - Memilih satelit yang relevan (Indonesia, militer, pengintai) dan menggabungkan TLE-nya.

Sumber:
  - TLE  : snapshot harian CelesTrak dari proyek who-watches-indonesia (raw.githubusercontent.com)
  - Kelas: katalog GCAT (planet4589.org, CC BY 4.0) yang sudah dirapikan di proyek yang sama

Keluaran: satelit.json (default public/data/satelit.json), dibaca browser lalu dipropagasi dengan SGP4.

    python scripts/bangun_satelit.py [--keluar public/data/satelit.json]
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests

RAW = "https://raw.githubusercontent.com/Avalon2222/who-watches-indonesia/main/data/"
URL_TLE = RAW + "tle_cadangan.txt"
URL_KATALOG = RAW + "katalog_satelit.csv"
URL_NEGARA = RAW + "kode_negara.csv"

# negara yang satelit militernya dimasukkan (kode GCAT)
NEGARA_MILITER = {"US", "CN", "RU", "IN", "JP", "FR", "GB", "DE", "IT", "IL", "KR", "AU", "TR", "ES", "AE", "SA", "PK", "KP", "IR", "E"}
MISI_PENGINTAI = {"IMG", "IMG-R", "SIG", "EW"}
MAKS = 900

OPERATOR = {"A": "Akademik & amatir", "B": "Komersial", "C": "Pemerintah sipil", "D": "Militer"}
MISI = {
    "IMG": "Pencitraan optik",
    "IMG-R": "Pencitraan radar (SAR)",
    "SIG": "Intai sinyal (SIGINT)",
    "EW": "Peringatan dini",
    "COM": "Komunikasi",
    "NAV": "Navigasi",
    "MET": "Cuaca",
    "SCI": "Sains",
    "TECH": "Teknologi / uji coba",
    "EOSCI": "Observasi Bumi",
    "WEAPON": "Senjata / uji senjata",
}


def kode_dasar(k: str) -> str:
    return re.split(r"[/?*]", str(k).strip())[0] or "-"


def parse_tle(teks: str) -> dict[int, tuple[str, str, str]]:
    baris = [b.rstrip() for b in teks.splitlines() if b.strip() and not b.startswith("#")]
    hasil = {}
    i = 0
    while i + 2 < len(baris):
        nama, l1, l2 = baris[i], baris[i + 1], baris[i + 2]
        if l1.startswith("1 ") and l2.startswith("2 "):
            try:
                hasil[int(l1[2:7])] = (nama.strip(), l1, l2)
            except ValueError:
                pass
            i += 3
        else:
            i += 1
    return hasil


def epoch_tle(l1: str) -> str:
    tahun = int(l1[18:20])
    tahun += 2000 if tahun < 57 else 1900
    hari = float(l1[20:32])
    t = datetime(tahun, 1, 1, tzinfo=timezone.utc).timestamp() + (hari - 1) * 86400
    return datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%dT%H:%MZ")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--keluar", default="public/data/satelit.json")
    ap.add_argument("--tle", help="berkas TLE lokal (opsional)")
    args = ap.parse_args()

    print("Mengunduh TLE ...")
    teks_tle = Path(args.tle).read_text(encoding="utf-8") if args.tle else requests.get(URL_TLE, timeout=60).text
    tle = parse_tle(teks_tle)
    print(f"  {len(tle)} objek TLE")

    print("Mengunduh katalog GCAT ...")
    katalog_csv = requests.get(URL_KATALOG, timeout=60).text
    negara_csv = requests.get(URL_NEGARA, timeout=60).text
    negara = {b["kode_gcat"]: b["negara"] for b in csv.DictReader(io.StringIO(negara_csv))}
    tanpa_komentar = "\n".join(b for b in katalog_csv.splitlines() if not b.startswith("#"))
    baris_katalog = list(csv.DictReader(io.StringIO(tanpa_komentar)))

    dipilih = []
    for b in baris_katalog:
        try:
            norad = int(b["norad"])
        except ValueError:
            continue
        if norad not in tle:
            continue
        kode = b["negara_kode"].strip()
        kelas = b["kelas"].strip()
        misi_kode = kode_dasar(b["kategori_gcat"])
        militer = "D" in kelas
        pengintai = misi_kode in MISI_PENGINTAI
        if kode == "ID":
            kelompok = "Indonesia"
        elif militer and kode in NEGARA_MILITER:
            kelompok = "Militer asing"
        elif pengintai and kode in NEGARA_MILITER:
            kelompok = "Pengintai sipil & komersial asing"
        else:
            continue
        nama, l1, l2 = tle[norad]
        dipilih.append(
            {
                "norad": norad,
                "nama": nama,
                "negara": negara.get(kode, kode),
                "kelompok": kelompok,
                "misi": MISI.get(misi_kode, misi_kode),
                "operator": OPERATOR["D"] if militer else OPERATOR.get(kelas[:1], "Tidak diketahui"),
                "diluncurkan": b.get("tanggal_luncur", ""),
                "l1": l1,
                "l2": l2,
            }
        )

    # prioritas: Indonesia, militer, lalu pengintai; batasi jumlah agar propagasi di browser tetap ringan
    urutan = {"Indonesia": 0, "Militer asing": 1, "Pengintai sipil & komersial asing": 2}
    dipilih.sort(key=lambda s: (urutan[s["kelompok"]], s["diluncurkan"]), reverse=False)
    # di dalam tiap kelompok, yang terbaru dulu
    dipilih.sort(key=lambda s: (urutan[s["kelompok"]], -int((s["diluncurkan"] or "1900")[:4])))
    # buang konstelasi komersial besar (Flock/Planet, Lemur) yang mendominasi jumlah
    dipilih = [s for s in dipilih if not re.match(r"^(FLOCK|LEMUR|SKYSAT|JILIN)", s["nama"].upper())]
    # pastikan kelompok pengintai tetap ikut walau militer banyak
    militer = [s for s in dipilih if s["kelompok"] == "Militer asing"][: MAKS - 200]
    lain = [s for s in dipilih if s["kelompok"] != "Militer asing"]
    dipilih = [s for s in dipilih if s in lain or s in militer][:MAKS]

    epoch = max((epoch_tle(s["l1"]) for s in dipilih), default="")
    hasil = {
        "dibangun": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
        "epoch_tle": epoch,
        "jumlah": len(dipilih),
        "per_kelompok": {k: sum(1 for s in dipilih if s["kelompok"] == k) for k in urutan},
        "sumber": "CelesTrak (TLE) via who-watches-indonesia; GCAT (planet4589.org, CC BY 4.0)",
        "satelit": dipilih,
    }
    keluar = Path(args.keluar)
    keluar.parent.mkdir(parents=True, exist_ok=True)
    keluar.write_text(json.dumps(hasil, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  {len(dipilih)} satelit -> {keluar} ({keluar.stat().st_size / 1024:.0f} KB) {hasil['per_kelompok']}")


if __name__ == "__main__":
    main()
