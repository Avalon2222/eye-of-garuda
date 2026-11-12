"""
ambil_ais.py - Menyimak aisstream.io dan menyimpan snapshot posisi kapal di kawasan.

Dua cara pakai:

  1. Sekali jalan (snapshot tunggal), misalnya untuk tes lokal:
       AISSTREAM_API_KEY=... python scripts/ambil_ais.py --durasi 90 --keluar public/data/kapal.json

  2. Jalan lama (dipakai workflow "Snapshot AIS"): satu koneksi dibuka berjam-jam, snapshot ditulis
     tiap --interval detik, lalu perintah --simpan dijalankan supaya berkasnya langsung didorong ke cabang `data`.
       python scripts/ambil_ais.py --durasi 19800 --interval 1800 --jendela 3600 \
           --keluar keluar/kapal.json --statis keluar/kapal_statis.json \
           --simpan "bash scripts/simpan_cabang_data.sh keluar/kapal.json keluar/kapal_statis.json"

Kunci API dibaca dari variabel lingkungan AISSTREAM_API_KEY (repo secret), tidak pernah disimpan ke berkas.
Kalau koneksi putus, skrip menyambung lagi sendiri sampai durasinya habis.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import websockets

URL = "wss://stream.aisstream.io/v0/stream"
# kotak kawasan: [[lat, lon], [lat, lon]] (aisstream memakai urutan lat, lon)
KOTAK = [[[-13.0, 92.0], [12.0, 145.0]]]
AKAR = Path(__file__).resolve().parent.parent
# batas jumlah kapal per snapshot supaya berkasnya tetap ringan untuk HP (~200 B per kapal)
MAKS_KAPAL = 1500

# MID (3 digit awal MMSI) -> bendera, untuk yang sering muncul di kawasan
MID = {
    "525": "Indonesia", "533": "Malaysia", "563": "Singapura", "564": "Singapura", "565": "Singapura", "566": "Singapura",
    "567": "Thailand", "574": "Vietnam", "548": "Filipina", "508": "Brunei", "503": "Australia", "553": "Papua Nugini",
    "550": "Timor-Leste", "412": "China", "413": "China", "414": "China", "416": "Taiwan", "431": "Jepang", "432": "Jepang",
    "440": "Korea Selatan", "441": "Korea Selatan", "419": "India", "477": "Hong Kong", "453": "Makau",
    "351": "Panama", "352": "Panama", "353": "Panama", "354": "Panama", "355": "Panama", "356": "Panama", "357": "Panama",
    "636": "Liberia", "637": "Liberia", "538": "Kepulauan Marshall", "311": "Bahama", "372": "Panama", "373": "Panama",
    "247": "Italia", "244": "Belanda", "245": "Belanda", "246": "Belanda", "211": "Jerman", "218": "Jerman",
    "232": "Inggris", "233": "Inggris", "234": "Inggris", "235": "Inggris", "226": "Prancis", "227": "Prancis", "228": "Prancis",
    "257": "Norwegia", "258": "Norwegia", "259": "Norwegia", "219": "Denmark", "220": "Denmark", "209": "Siprus", "210": "Siprus",
    "212": "Siprus", "215": "Malta", "229": "Malta", "248": "Malta", "249": "Malta", "256": "Malta", "273": "Rusia",
    "338": "Amerika Serikat", "366": "Amerika Serikat", "367": "Amerika Serikat", "368": "Amerika Serikat", "369": "Amerika Serikat",
    "303": "Amerika Serikat", "422": "Iran", "470": "Uni Emirat Arab", "403": "Arab Saudi", "457": "Mongolia", "312": "Belize",
    "620": "Komoro", "667": "Sierra Leone", "677": "Tanzania", "671": "Togo", "613": "Kamerun", "657": "Nigeria", "341": "St. Kitts & Nevis",
    "375": "St. Vincent", "376": "St. Vincent", "377": "St. Vincent", "378": "Kepulauan Cayman", "445": "Korea Utara",
}

# urutan prioritas kalau snapshot harus dipangkas (angka kecil = lebih penting)
PRIORITAS_KELAS = {"militer": 0, "patroli": 1, "sar": 2, "tanker": 3, "kargo": 4, "penumpang": 5, "nelayan": 6}


def kelas_dari_tipe(tipe: int | None) -> str:
    """Jenis kapal dari kode tipe AIS (ITU-R M.1371). Harus sama dengan kelasDariTipe di src/app/api/kapal/route.ts."""
    if tipe is None or tipe <= 0:
        return "lainnya"
    if tipe == 35:
        return "militer"
    if tipe == 55:
        return "patroli"
    if tipe == 51:
        return "sar"
    if tipe == 30:
        return "nelayan"
    if 80 <= tipe <= 89:
        return "tanker"
    if 70 <= tipe <= 79:
        return "kargo"
    if 60 <= tipe <= 69:
        return "penumpang"
    if tipe in (31, 32, 52):
        return "tunda"
    if tipe in (36, 37):
        return "rekreasi"
    if 40 <= tipe <= 49:
        return "cepat"
    if tipe in (33, 34, 50, 53, 54, 56, 57, 58, 59):
        return "khusus"
    return "lainnya"


def muat_sanksi() -> dict[int, dict]:
    hasil = {}
    with open(AKAR / "data" / "kapal_tersanksi.csv", newline="", encoding="utf-8") as f:
        for b in csv.DictReader(f):
            try:
                hasil[int(b["mmsi"])] = b
            except ValueError:
                pass
    return hasil


def rapikan_waktu(teks: str) -> str:
    # contoh: "2026-11-05 12:34:56.789012345 +0000 UTC"
    t = teks.split(" +")[0].strip()
    try:
        dt = datetime.strptime(t[:26], "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)
    except ValueError:
        try:
            dt = datetime.strptime(t[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        except ValueError:
            dt = datetime.now(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def proses_pesan(mentah: str | bytes, posisi: dict[int, dict], statis: dict[int, dict]) -> None:
    try:
        pesan = json.loads(mentah)
    except ValueError:
        return
    if pesan.get("error"):
        print(f"  ! aisstream: {pesan['error']}", file=sys.stderr)
        return
    jenis = pesan.get("MessageType")
    meta = pesan.get("MetaData", {})
    try:
        mmsi = int(meta.get("MMSI"))
    except (TypeError, ValueError):
        return
    if jenis in ("PositionReport", "StandardClassBPositionReport"):
        isi = pesan["Message"][jenis]
        try:
            lat = float(meta.get("latitude", isi.get("Latitude")))
            lon = float(meta.get("longitude", isi.get("Longitude")))
        except (TypeError, ValueError):
            return
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return
        posisi[mmsi] = {
            "lat": lat,
            "lon": lon,
            "cog": isi.get("Cog"),
            "sog": isi.get("Sog"),
            "heading": isi.get("TrueHeading"),
            "nama": (meta.get("ShipName") or "").strip(),
            "waktu": meta.get("time_utc", ""),
            "diterima": time.time(),
        }
    elif jenis == "ShipStaticData":
        isi = pesan["Message"]["ShipStaticData"]
        statis[mmsi] = {"tipe": isi.get("Type"), "tujuan": (isi.get("Destination") or "").strip(), "nama": (isi.get("Name") or "").strip()}


async def simak(kunci: str, durasi: int, interval: int, posisi: dict[int, dict], statis: dict[int, dict], saat_interval) -> None:
    """Membuka stream sampai `durasi` detik; tiap `interval` detik memanggil saat_interval(). Menyambung ulang kalau putus."""
    langganan = {
        "APIKey": kunci,
        "BoundingBoxes": KOTAK,
        "FilterMessageTypes": ["PositionReport", "ShipStaticData", "StandardClassBPositionReport"],
    }
    mulai = time.monotonic()
    akhir = mulai + durasi
    berikut = mulai + interval
    jeda_ulang = 5
    while time.monotonic() < akhir:
        try:
            async with websockets.connect(URL, max_size=2**22, ping_interval=20, ping_timeout=20) as ws:
                await ws.send(json.dumps(langganan))
                jeda_ulang = 5
                while time.monotonic() < akhir:
                    batas = max(1.0, min(berikut, akhir) - time.monotonic())
                    try:
                        mentah = await asyncio.wait_for(ws.recv(), timeout=batas)
                    except asyncio.TimeoutError:
                        pass
                    else:
                        proses_pesan(mentah, posisi, statis)
                    if time.monotonic() >= berikut:
                        saat_interval()
                        berikut += interval
        except (OSError, websockets.exceptions.WebSocketException, asyncio.TimeoutError) as e:
            if time.monotonic() >= akhir:
                break
            print(f"  ! koneksi putus ({e}); menyambung ulang dalam {jeda_ulang} detik", file=sys.stderr)
            # kalau jadwal snapshot terlewat saat putus, tetap tulis supaya berkasnya tidak basi
            while time.monotonic() >= berikut and berikut < akhir:
                saat_interval()
                berikut += interval
            await asyncio.sleep(jeda_ulang)
            jeda_ulang = min(60, jeda_ulang * 2)


def susun_snapshot(posisi: dict[int, dict], statis: dict[int, dict], sanksi: dict[int, dict], jendela: int, durasi: int) -> dict:
    sekarang = time.time()
    kapal = []
    for mmsi, p in posisi.items():
        if sekarang - p["diterima"] > jendela:
            continue
        s = statis.get(mmsi, {})
        tipe = s.get("tipe")
        tipe = tipe if isinstance(tipe, int) and tipe > 0 else None
        bendera = MID.get(str(mmsi)[:3], "")
        tersanksi = mmsi in sanksi
        kapal.append(
            {
                "mmsi": mmsi,
                "nama": s.get("nama") or p["nama"],
                "lat": round(p["lat"], 4),
                "lon": round(p["lon"], 4),
                "cog": round(p["cog"], 1) if isinstance(p["cog"], (int, float)) and p["cog"] < 360 else None,
                "sog": round(p["sog"], 1) if isinstance(p["sog"], (int, float)) and p["sog"] < 102 else None,
                "heading": p["heading"] if isinstance(p["heading"], int) and p["heading"] < 360 else None,
                "tipe": tipe,
                "kelas": kelas_dari_tipe(tipe),
                "tujuan": s.get("tujuan", ""),
                "bendera": bendera,
                "waktu": rapikan_waktu(p["waktu"]),
                "tersanksi": tersanksi,
                **({"program": sanksi[mmsi].get("program", "")} if tersanksi else {}),
                "_diterima": p["diterima"],
            }
        )
    # kapal tersanksi dan militer selalu di depan; sisanya yang paling baru terdengar
    kapal.sort(key=lambda k: (not k["tersanksi"], PRIORITAS_KELAS.get(k["kelas"], 9), -k["_diterima"]))
    dipangkas = max(0, len(kapal) - MAKS_KAPAL)
    kapal = kapal[:MAKS_KAPAL]
    for k in kapal:
        del k["_diterima"]
    return {
        "diambil": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "durasi_detik": durasi,
        "jendela_menit": jendela // 60,
        "kotak": KOTAK[0],
        "jumlah": len(kapal),
        "dipangkas": dipangkas,
        "per_kelas": {k: sum(1 for x in kapal if x["kelas"] == k) for k in sorted({x["kelas"] for x in kapal})},
        "tersanksi": sum(1 for x in kapal if x["tersanksi"]),
        "sumber": "aisstream.io (AIS); OpenSanctions untuk daftar kapal tersanksi",
        "kapal": kapal,
    }


def muat_statis(berkas: str | None) -> dict[int, dict]:
    if not berkas or not Path(berkas).exists():
        return {}
    try:
        return {int(k): v for k, v in json.loads(Path(berkas).read_text(encoding="utf-8")).items()}
    except (ValueError, OSError):
        return {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--durasi", type=int, default=90, help="lama menyimak (detik)")
    ap.add_argument("--interval", type=int, default=0, help="tulis snapshot tiap N detik (0 = sekali di akhir)")
    ap.add_argument("--jendela", type=int, default=3600, help="kapal yang terakhir terdengar lebih lama dari ini (detik) dibuang")
    ap.add_argument("--keluar", default="public/data/kapal.json")
    ap.add_argument("--statis", help="cache data statis kapal (nama/tipe/tujuan per MMSI) dari snapshot sebelumnya")
    ap.add_argument("--simpan", help="perintah shell yang dijalankan tiap kali snapshot ditulis (mis. dorong ke cabang data)")
    args = ap.parse_args()
    kunci = os.environ.get("AISSTREAM_API_KEY", "").strip()
    if not kunci:
        print("AISSTREAM_API_KEY belum diatur; snapshot dilewati.", file=sys.stderr)
        return 2

    interval = args.interval if args.interval > 0 else args.durasi
    posisi: dict[int, dict] = {}
    # ShipStaticData hanya dipancarkan tiap ~6 menit, jadi nama/tipe dikumpulkan lintas snapshot
    statis: dict[int, dict] = muat_statis(args.statis)
    sanksi = muat_sanksi()
    keluar = Path(args.keluar)
    keluar.parent.mkdir(parents=True, exist_ok=True)
    hitung = {"snapshot": 0, "terakhir": 0.0}

    def tulis() -> None:
        hitung["terakhir"] = time.monotonic()
        hasil = susun_snapshot(posisi, statis, sanksi, args.jendela, interval)
        keluar.write_text(json.dumps(hasil, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        if args.statis:
            Path(args.statis).parent.mkdir(parents=True, exist_ok=True)
            Path(args.statis).write_text(json.dumps({str(k): v for k, v in statis.items()}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        hitung["snapshot"] += 1
        bertipe = sum(1 for k in hasil["kapal"] if k["kelas"] != "lainnya")
        print(
            f"[{hasil['diambil']}] snapshot #{hitung['snapshot']}: {hasil['jumlah']} kapal "
            f"({hasil['tersanksi']} tersanksi, {bertipe} berjenis, {hasil['dipangkas']} dipangkas) -> {keluar}",
            flush=True,
        )
        if args.simpan:
            r = subprocess.run(args.simpan, shell=True)
            if r.returncode != 0:
                print(f"  ! perintah simpan gagal (kode {r.returncode})", file=sys.stderr, flush=True)

    asyncio.run(simak(kunci, args.durasi, interval, posisi, statis, tulis))
    # snapshot penutup kalau belum ada atau yang terakhir sudah agak lama
    if hitung["snapshot"] == 0 or time.monotonic() - hitung["terakhir"] > interval / 2:
        tulis()
    return 0


if __name__ == "__main__":
    sys.exit(main())
