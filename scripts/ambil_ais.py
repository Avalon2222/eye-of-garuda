"""
ambil_ais.py - Menyimak aisstream.io selama beberapa puluh detik dan menyimpan snapshot posisi kapal.

Dijalankan GitHub Actions tiap ~30 menit (workflow "Snapshot AIS"). Kunci API dibaca dari
variabel lingkungan AISSTREAM_API_KEY (repo secret), tidak pernah disimpan ke berkas.

    AISSTREAM_API_KEY=... python scripts/ambil_ais.py --durasi 90 --keluar public/data/kapal.json
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import websockets

URL = "wss://stream.aisstream.io/v0/stream"
# kotak kawasan: [[lat, lon], [lat, lon]] (aisstream memakai urutan lat, lon)
KOTAK = [[[-13.0, 92.0], [12.0, 145.0]]]
AKAR = Path(__file__).resolve().parent.parent

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


def kelas_dari_tipe(tipe: int | None) -> str:
    if tipe is None:
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


async def simak(kunci: str, durasi: int) -> tuple[dict[int, dict], dict[int, dict]]:
    posisi: dict[int, dict] = {}
    statis: dict[int, dict] = {}
    langganan = {
        "APIKey": kunci,
        "BoundingBoxes": KOTAK,
        "FilterMessageTypes": ["PositionReport", "ShipStaticData", "StandardClassBPositionReport"],
    }
    mulai = asyncio.get_event_loop().time()
    async with websockets.connect(URL, max_size=2**22) as ws:
        await ws.send(json.dumps(langganan))
        while asyncio.get_event_loop().time() - mulai < durasi:
            sisa = durasi - (asyncio.get_event_loop().time() - mulai)
            try:
                mentah = await asyncio.wait_for(ws.recv(), timeout=max(1, sisa))
            except asyncio.TimeoutError:
                break
            pesan = json.loads(mentah)
            jenis = pesan.get("MessageType")
            meta = pesan.get("MetaData", {})
            try:
                mmsi = int(meta.get("MMSI"))
            except (TypeError, ValueError):
                continue
            if jenis in ("PositionReport", "StandardClassBPositionReport"):
                isi = pesan["Message"][jenis]
                posisi[mmsi] = {
                    "lat": float(meta.get("latitude", isi.get("Latitude"))),
                    "lon": float(meta.get("longitude", isi.get("Longitude"))),
                    "cog": isi.get("Cog"),
                    "sog": isi.get("Sog"),
                    "heading": isi.get("TrueHeading"),
                    "nama": (meta.get("ShipName") or "").strip(),
                    "waktu": meta.get("time_utc", ""),
                }
            elif jenis == "ShipStaticData":
                isi = pesan["Message"]["ShipStaticData"]
                statis[mmsi] = {"tipe": isi.get("Type"), "tujuan": (isi.get("Destination") or "").strip(), "nama": (isi.get("Name") or "").strip()}
    return posisi, statis


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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--durasi", type=int, default=90)
    ap.add_argument("--keluar", default="public/data/kapal.json")
    ap.add_argument("--statis", help="cache data statis kapal (nama/tipe/tujuan per MMSI) dari snapshot sebelumnya")
    args = ap.parse_args()
    kunci = os.environ.get("AISSTREAM_API_KEY", "").strip()
    if not kunci:
        print("AISSTREAM_API_KEY belum diatur; snapshot dilewati.", file=sys.stderr)
        return 2

    posisi, statis_baru = asyncio.run(simak(kunci, args.durasi))
    # ShipStaticData hanya dipancarkan tiap ~6 menit, jadi nama/tipe dikumpulkan lintas snapshot
    statis: dict[int, dict] = {}
    if args.statis and Path(args.statis).exists():
        try:
            statis = {int(k): v for k, v in json.loads(Path(args.statis).read_text(encoding="utf-8")).items()}
        except (ValueError, OSError):
            statis = {}
    statis.update(statis_baru)
    if args.statis:
        Path(args.statis).parent.mkdir(parents=True, exist_ok=True)
        Path(args.statis).write_text(json.dumps({str(k): v for k, v in statis.items()}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    sanksi = muat_sanksi()
    kapal = []
    for mmsi, p in posisi.items():
        s = statis.get(mmsi, {})
        tipe = s.get("tipe")
        bendera = MID.get(str(mmsi)[:3], "")
        tersanksi = mmsi in sanksi
        kapal.append(
            {
                "mmsi": mmsi,
                "nama": s.get("nama") or p["nama"],
                "lat": round(p["lat"], 5),
                "lon": round(p["lon"], 5),
                "cog": p["cog"] if isinstance(p["cog"], (int, float)) and p["cog"] < 360 else None,
                "sog": p["sog"] if isinstance(p["sog"], (int, float)) and p["sog"] < 102 else None,
                "heading": p["heading"] if isinstance(p["heading"], int) and p["heading"] < 360 else None,
                "tipe": tipe,
                "kelas": kelas_dari_tipe(tipe),
                "tujuan": s.get("tujuan", ""),
                "bendera": bendera,
                "waktu": rapikan_waktu(p["waktu"]),
                "tersanksi": tersanksi,
                **({"program": sanksi[mmsi].get("program", "")} if tersanksi else {}),
            }
        )
    kapal.sort(key=lambda k: (not k["tersanksi"], k["kelas"] != "militer", k["mmsi"]))
    hasil = {
        "diambil": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "durasi_detik": args.durasi,
        "kotak": KOTAK[0],
        "jumlah": len(kapal),
        "per_kelas": {k: sum(1 for x in kapal if x["kelas"] == k) for k in sorted({x["kelas"] for x in kapal})},
        "tersanksi": sum(1 for x in kapal if x["tersanksi"]),
        "sumber": "aisstream.io (AIS); OpenSanctions untuk daftar kapal tersanksi",
        "kapal": kapal,
    }
    keluar = Path(args.keluar)
    keluar.parent.mkdir(parents=True, exist_ok=True)
    keluar.write_text(json.dumps(hasil, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(kapal)} kapal ({hasil['tersanksi']} tersanksi, {sum(1 for k in kapal if k['tipe'] is not None)} dengan tipe) -> {keluar}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
