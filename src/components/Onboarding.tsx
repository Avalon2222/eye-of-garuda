"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { terjemah, type Lang } from "@/lib/i18n";

export const KUNCI_ONBOARDING = "eog-panduan-v1";

interface Langkah {
  /** nilai atribut data-tour elemen yang disorot; null = tanpa sorotan (layar penuh) */
  sasaran: string | null;
  /** cadangan kalau sasaran utama tidak ada (mis. rel lapisan disembunyikan di HP) */
  cadangan?: string;
  judul: { id: string; en: string };
  teks: { id: string; en: string };
}

const LANGKAH: Langkah[] = [
  {
    sasaran: null,
    judul: { id: "Selamat datang di Eye of Garuda", en: "Welcome to Eye of Garuda" },
    teks: {
      id: "Globe 3D interaktif tentang postur pertahanan Indonesia dari data publik. Panduan singkat ini menunjukkan tombol-tombol pentingnya. Bisa dilewati kapan saja.",
      en: "An interactive 3D globe of Indonesia's defence posture built from public data. This quick guide shows the important controls. Skip any time.",
    },
  },
  {
    sasaran: "status",
    judul: { id: "Status koneksi", en: "Connection status" },
    teks: { id: "Titik hijau = ONLINE: peta dan data live terhubung. Kuning berarti sebagian sumber tidak terjangkau.", en: "Green dot = ONLINE: map and live data connected. Amber means some sources are unreachable." },
  },
  {
    sasaran: "lapisan",
    cadangan: "chips",
    judul: { id: "Layers", en: "Layers" },
    teks: {
      id: "Nyalakan/matikan lapisan: markas TNI, pangkalan asing, kabel bawah laut, kapal AIS, pesawat & helikopter militer, satelit, kapal selam, ZEE, radius tempur, SIPRI, insiden. Detail kecil baru muncul saat zoom.",
      en: "Toggle layers: TNI bases, foreign bases, undersea cables, AIS ships, military aircraft & helicopters, satellites, submarines, EEZ, combat radius, SIPRI, incidents. Small details appear as you zoom in.",
    },
  },
  {
    sasaran: "mode",
    cadangan: "menu",
    judul: { id: "3D / 2D, MAP / SAT, bahasa", en: "3D / 2D, MAP / SAT, language" },
    teks: { id: "Ganti globe ke peta datar, peta gelap ke citra satelit, dan bahasa Indonesia/Inggris.", en: "Switch globe to flat map, dark map to satellite imagery, and Indonesian/English." },
  },
  {
    sasaran: "alat",
    cadangan: "menu",
    judul: { id: "Tools", en: "Tools" },
    teks: {
      id: "Reset ke Indonesia, cari objek (Ctrl K), Briefing sinematik, War Room (3 simulasi: Natuna, Cable Cut, Nuclear), jadwal lintasan satelit, data & anggaran, share link, fullscreen, bantuan.",
      en: "Reset to Indonesia, search (Ctrl K), cinematic Briefing, War Room (3 simulations: Natuna, Cable Cut, Nuclear), satellite pass schedule, data & budget, share link, fullscreen, help.",
    },
  },
  {
    sasaran: "chat",
    judul: { id: "Garuda AI", en: "Garuda AI" },
    teks: { id: "Asisten AI: tanya apa saja tentang data atau cara pakai. Jawabannya bisa menerbangkan globe ke markas, pulau, atau pangkalan yang ditanya.", en: "AI helper: ask anything about the data or how to use the console. Answers can fly the globe to the base, island or outpost you asked about." },
  },
  {
    sasaran: null,
    judul: { id: "Klik apa saja", en: "Click anything" },
    teks: {
      id: "Klik titik, garis, satelit, atau pesawat untuk panel detail beserta sumbernya. Scroll untuk zoom, seret untuk memutar globe. Tekan ? untuk daftar pintasan keyboard. Selamat menjelajah.",
      en: "Click any point, line, satellite or aircraft for a detail panel with its source. Scroll to zoom, drag to spin the globe. Press ? for keyboard shortcuts. Enjoy.",
    },
  },
];

const LAMA_LANGKAH_MS = 7000;

export function panduanSudahDilihat(): boolean {
  try {
    return window.localStorage.getItem(KUNCI_ONBOARDING) === "1";
  } catch {
    return false;
  }
}

export function tandaiPanduan(): void {
  try {
    window.localStorage.setItem(KUNCI_ONBOARDING, "1");
  } catch {
    /* abaikan */
  }
}

/** Panduan antarmuka setelah layar boot: menyorot elemen dengan atribut data-tour, lanjut otomatis, bisa dilewati. */
export default function Onboarding({ lang, onSelesai }: { lang: Lang; onSelesai: () => void }) {
  const [i, setI] = useState(0);
  const [otomatis, setOtomatis] = useState(true);
  const [kotak, setKotak] = useState<DOMRect | null>(null);
  const sorotan = useRef<Element | null>(null);
  const l = LANGKAH[i];
  const terakhir = i === LANGKAH.length - 1;

  const selesai = () => {
    sorotan.current?.classList.remove("sorot-panduan");
    tandaiPanduan();
    onSelesai();
  };

  // sorot elemen sasaran
  useLayoutEffect(() => {
    sorotan.current?.classList.remove("sorot-panduan");
    sorotan.current = null;
    const terlihat = (el: Element | null) => el && (el as HTMLElement).offsetParent !== null && el.getBoundingClientRect().width > 0;
    let el: Element | null = l.sasaran ? document.querySelector(`[data-tour="${l.sasaran}"]`) : null;
    if (!terlihat(el) && l.cadangan) el = document.querySelector(`[data-tour="${l.cadangan}"]`);
    if (!terlihat(el)) el = null;
    if (el) {
      el.classList.add("sorot-panduan");
      sorotan.current = el;
    }
    // ukur setelah layout selesai, supaya kartu tidak menutup elemen yang disorot
    const id = requestAnimationFrame(() => setKotak(el ? el.getBoundingClientRect() : null));
    return () => {
      cancelAnimationFrame(id);
      el?.classList.remove("sorot-panduan");
    };
  }, [i, l]);

  // lanjut otomatis
  useEffect(() => {
    if (!otomatis) return;
    const id = setTimeout(() => {
      if (terakhir) selesai();
      else setI((x) => x + 1);
    }, LAMA_LANGKAH_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, otomatis]);

  // posisi kartu: di bawah/atas/samping elemen yang disorot, kalau tidak di tengah
  // tengah layar tanpa transform: animasi "muncul" menimpa transform, jadi kartu dulu bisa melenceng keluar layar
  const tengah: React.CSSProperties = { inset: 0, margin: "auto", height: "fit-content", width: "min(380px, calc(100% - 24px))", maxHeight: "calc(100% - 24px)" };
  let gaya: React.CSSProperties = tengah;
  if (kotak && typeof window !== "undefined") {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const lebar = Math.min(380, W - 24);
    const kecil = W < 640;
    if (kecil) {
      // HP: kartu selalu di bawah atau di atas, tidak menutup elemen
      const diBawah = kotak.bottom + 16 + 200 < H;
      const diAtas = kotak.top - 16 - 200 > 0;
      gaya = diBawah
        ? { left: 12, right: 12, top: kotak.bottom + 12, maxHeight: H - kotak.bottom - 24 }
        : diAtas
          ? { left: 12, right: 12, bottom: H - kotak.top + 12, maxHeight: kotak.top - 24 }
          : tengah;
    } else if (kotak.left > W / 2 && kotak.right - kotak.left < W / 2) {
      // elemen di kanan: kartu di kiri elemen
      gaya = { right: W - kotak.left + 16, top: Math.min(Math.max(12, kotak.top), H - 240), width: lebar };
    } else if (kotak.bottom < H / 2) {
      gaya = { left: Math.min(Math.max(12, kotak.left), W - lebar - 12), top: kotak.bottom + 16, width: lebar };
    } else {
      gaya = { left: Math.min(Math.max(12, kotak.left), W - lebar - 12), bottom: H - kotak.top + 16, width: lebar };
    }
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-[60]" onClick={() => !kotak && (terakhir ? selesai() : setI(i + 1))}>
      {!kotak && <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />}
      <div className="glass braket muncul gulir absolute max-w-[calc(100%-24px)] overflow-y-auto px-4 py-3" style={gaya} onClick={(e) => e.stopPropagation()} key={i}>
        <div className="flex items-center justify-between gap-3">
          <div className="label-kecil text-gold">
            {terjemah(lang, "guide_title")} <span className="text-dim">({i + 1}/{LANGKAH.length})</span>
          </div>
          <button className="tombol-ikon !h-6 !w-6 !border-0" onClick={selesai} title={terjemah(lang, "guide_skip")} aria-label={terjemah(lang, "guide_skip")}>
            <X size={13} />
          </button>
        </div>
        <div className="mt-1 text-[14px] tracking-[0.15em] text-text">{l.judul[lang]}</div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{l.teks[lang]}</p>
        <div className="mt-3 flex items-center gap-2">
          <label className="sentuh flex cursor-pointer items-center gap-1.5 text-[10px] text-dim">
            <input type="checkbox" checked={otomatis} onChange={(e) => setOtomatis(e.target.checked)} className="accent-[#f2c66d]" /> {terjemah(lang, "guide_auto")}
          </label>
          <span className="flex-1" />
          {!terakhir && (
            <button className="tombol-hud !h-7" onClick={selesai}>
              {terjemah(lang, "guide_skip")}
            </button>
          )}
          <button className="tombol-hud aktif !h-7" onClick={() => (terakhir ? selesai() : setI(i + 1))}>
            {terakhir ? terjemah(lang, "guide_done") : terjemah(lang, "guide_next")} <ChevronRight size={12} />
          </button>
        </div>
        <div className="mt-2 flex gap-1">
          {LANGKAH.map((_, k) => (
            <span key={k} className="relative h-[2px] flex-1 overflow-hidden bg-white/10">
              <span className={`absolute inset-y-0 left-0 bg-gold ${k < i ? "w-full" : k === i && otomatis ? "isi-panduan" : k === i ? "w-full opacity-60" : "w-0"}`} />
            </span>
          ))}
        </div>
      </div>
      <style>{`.isi-panduan{animation:isi-panduan ${LAMA_LANGKAH_MS}ms linear forwards}@keyframes isi-panduan{from{width:0}to{width:100%}}`}</style>
    </div>
  );
}
