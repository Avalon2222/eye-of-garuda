"""
cek_tautan.py - Mengecek semua tautan sumber di data/*.csv (kolom yang isinya diawali http).

    python scripts/cek_tautan.py            # cek semua, keluar dengan kode 1 kalau ada yang mati
    python scripts/cek_tautan.py --cepat    # hanya HEAD/GET ringan tanpa jeda

Dijalankan tiap bulan oleh workflow "Cek tautan". Situs yang memblokir bot (misalnya Reuters membalas 401
atau 403 untuk semua klien otomatis) tidak dihitung mati; hanya 404/410 dan galat koneksi yang dilaporkan.
"""

from __future__ import annotations

import argparse
import csv
import glob
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
UA = "Mozilla/5.0 (compatible; eye-of-garuda-cek-tautan/1.0; +https://github.com/Avalon2222/eye-of-garuda)"
# status yang berarti "halaman memang tidak ada"
MATI = {404, 410}
# status yang berarti "server menolak bot", bukan tautan mati
DIBLOKIR = {401, 403, 429, 503}


def kumpulkan() -> dict[str, list[str]]:
    tautan: dict[str, list[str]] = {}
    for berkas in sorted(glob.glob(str(AKAR / "data" / "*.csv"))):
        with open(berkas, newline="", encoding="utf-8") as f:
            for i, baris in enumerate(csv.DictReader(f), start=2):
                for nilai in baris.values():
                    if nilai and nilai.startswith("http"):
                        tautan.setdefault(nilai.strip(), []).append(f"{Path(berkas).name}:{baris.get('id', i)}")
    return tautan


def status(url: str) -> int | str:
    for metode in ("HEAD", "GET"):
        req = urllib.request.Request(url, method=metode, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.status
        except urllib.error.HTTPError as e:
            if metode == "HEAD" and e.code in (405, 403, 400):
                continue  # sebagian server menolak HEAD, coba GET
            return e.code
        except Exception as e:  # noqa: BLE001
            if metode == "HEAD":
                continue
            return type(e).__name__
    return "gagal"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cepat", action="store_true")
    args = ap.parse_args()
    tautan = kumpulkan()
    print(f"{len(tautan)} tautan unik dari data/*.csv")
    mati: list[tuple[str, int | str, list[str]]] = []
    diblokir = 0
    for url, tempat in tautan.items():
        s = status(url)
        if isinstance(s, int) and s in DIBLOKIR:
            diblokir += 1
            tanda = "blokir"
        elif isinstance(s, int) and s < 400:
            tanda = "ok"
        else:
            tanda = "MATI"
            mati.append((url, s, tempat))
        print(f"  {tanda:<6} {s!s:<6} {url}")
        if not args.cepat:
            # Wikipedia membatasi klien otomatis yang terlalu cepat (429), jadi lebih pelan di sana
            time.sleep(1.0 if "wikipedia.org" in url else 0.3)
    print(f"\n{len(tautan) - len(mati) - diblokir} ok, {diblokir} diblokir bot (dianggap hidup), {len(mati)} mati")
    for url, s, tempat in mati:
        print(f"  {s} {url}  <- {', '.join(tempat)}")
    return 1 if mati else 0


if __name__ == "__main__":
    sys.exit(main())
