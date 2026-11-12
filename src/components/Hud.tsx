"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Search, HelpCircle, Maximize2, Minimize2, Share2, Play, Square, BarChart3, Globe2, Map as MapIcon, Satellite, Languages, LocateFixed, Swords, Orbit, MoreVertical } from "lucide-react";
import Logo from "./Logo";
import { terjemah, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  jumlahLapisanAktif: number;
  jumlahLapisan: number;
  jumlahEntitas: number;
  sat: boolean;
  datar: boolean;
  tourAktif: boolean;
  online: boolean;
  onToggleSat: () => void;
  onToggleDatar: () => void;
  onToggleLang: () => void;
  onCari: () => void;
  onBantuan: () => void;
  onTour: () => void;
  onBagikan: () => void;
  onData: () => void;
  onFullscreen: () => void;
  onReset: () => void;
  onSkenario: () => void;
  skenarioAktif: boolean;
  onLintasan: () => void;
}

interface Alat {
  kunci: string;
  Ikon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  judul: string;
  aksi: () => void;
  aktif?: boolean;
  /** tampil langsung di header HP (sisanya masuk menu titik tiga) */
  hp?: boolean;
  nilai?: string;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function JamZulu({ lang }: { lang: Lang }) {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!t) return <div className="h-7" />;
  const wib = new Date(t.getTime() + 7 * 3600_000);
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-[22px] leading-none tracking-[0.12em] text-gold tabular-nums">
        {pad(t.getUTCHours())}:{pad(t.getUTCMinutes())}:{pad(t.getUTCSeconds())}
        <span className="text-[12px] text-muted">Z</span>
      </div>
      <div className="hidden text-[11px] text-muted tabular-nums sm:block">
        {pad(wib.getUTCHours())}:{pad(wib.getUTCMinutes())} {terjemah(lang, "wib")}
      </div>
    </div>
  );
}

export default function Hud(p: Props) {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // menu titik tiga di HP: tutup kalau ketuk di luar atau tekan Esc
  const [menu, setMenu] = useState(false);
  const wadahMenu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const luar = (e: PointerEvent) => {
      if (!wadahMenu.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", luar);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", luar);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const t = (k: Parameters<typeof terjemah>[1]) => terjemah(p.lang, k);
  const alat: Alat[] = [
    { kunci: "reset", Ikon: LocateFixed, label: t("reset_view"), judul: `${t("reset_view")} (R)`, aksi: p.onReset },
    { kunci: "cari", Ikon: Search, label: t("search"), judul: `${t("search")} (Ctrl+K)`, aksi: p.onCari, hp: true },
    { kunci: "tour", Ikon: p.tourAktif ? Square : Play, label: p.tourAktif ? t("tour_stop") : t("tour_start"), judul: `${t("tour")} (T)`, aksi: p.onTour, aktif: p.tourAktif },
    { kunci: "skenario", Ikon: Swords, label: t("scenario"), judul: `${t("scenario")} (W)`, aksi: p.onSkenario, aktif: p.skenarioAktif, hp: true },
    { kunci: "lintasan", Ikon: Orbit, label: t("help_o"), judul: `${t("passes_title")} (O)`, aksi: p.onLintasan },
    { kunci: "data", Ikon: BarChart3, label: t("data_panel"), judul: t("data_panel"), aksi: p.onData },
    { kunci: "share", Ikon: Share2, label: t("share"), judul: t("share"), aksi: p.onBagikan },
    { kunci: "fs", Ikon: fs ? Minimize2 : Maximize2, label: t("fullscreen"), judul: `${t("fullscreen")} (F)`, aksi: p.onFullscreen },
    { kunci: "bantuan", Ikon: HelpCircle, label: t("help"), judul: `${t("help")} (?)`, aksi: p.onBantuan },
  ];
  const alatHp = alat.filter((a) => a.hp);
  const itemMenu: Alat[] = [
    { kunci: "proyeksi", Ikon: Globe2, label: t("menu_projection"), judul: "G", aksi: p.onToggleDatar, nilai: p.datar ? t("flat_mode") : t("globe_mode") },
    { kunci: "peta", Ikon: p.sat ? Satellite : MapIcon, label: t("menu_basemap"), judul: "S", aksi: p.onToggleSat, nilai: p.sat ? t("sat_mode") : t("map_mode") },
    { kunci: "bahasa", Ikon: Languages, label: t("help_l"), judul: "L", aksi: p.onToggleLang, nilai: t("lang_toggle") },
  ];

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-2 sm:p-3">
      {/* kiri: identitas */}
      <div className="glass braket pointer-events-auto flex min-w-0 items-center gap-2 px-2 py-2 sm:gap-3 sm:px-3" data-tour="status">
        <Logo size={30} className="text-accent shrink-0" />
        <div className="leading-tight">
          <div className="whitespace-nowrap text-[11px] font-semibold tracking-[0.18em] text-text sm:text-[13px] sm:tracking-[0.3em]">EYE OF GARUDA</div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] tracking-[0.18em] text-muted uppercase">
            <span className={`denyut ${p.online ? "" : "!bg-warn"}`} />
            {p.online ? terjemah(p.lang, "online") : terjemah(p.lang, "offline")}
            <span className="hidden text-dim sm:inline">· ID-DEF-CONSOLE v1</span>
          </div>
        </div>
      </div>

      {/* tengah: jam + hitungan (desktop) */}
      <div className="glass pointer-events-auto hidden items-center gap-6 px-4 py-2 md:flex">
        <JamZulu lang={p.lang} />
        <div className="h-7 w-px bg-white/10" />
        <div className="flex gap-5 text-[11px] uppercase tracking-[0.15em]">
          <div>
            <div className="label-kecil">{terjemah(p.lang, "layers")}</div>
            <div className="text-text tabular-nums">
              {p.jumlahLapisanAktif}
              <span className="text-dim">/{p.jumlahLapisan}</span>
            </div>
          </div>
          <div>
            <div className="label-kecil">{terjemah(p.lang, "entities")}</div>
            <div className="text-text tabular-nums">{p.jumlahEntitas.toLocaleString("en-US")}</div>
          </div>
        </div>
      </div>

      {/* kanan: alat (desktop & tablet) */}
      <div className="pointer-events-auto hidden flex-col items-end gap-2 sm:flex">
        <div className="glass flex items-center gap-1 p-1" data-tour="mode">
          <button className={`tombol-hud ${!p.datar ? "aktif" : ""}`} onClick={p.onToggleDatar} title="G" aria-label={terjemah(p.lang, "menu_projection")}>
            <Globe2 size={13} /> <span className="hidden sm:inline">{terjemah(p.lang, "globe_mode")}</span>
          </button>
          <button className={`tombol-hud ${p.datar ? "aktif" : ""}`} onClick={p.onToggleDatar} title="G" aria-label={terjemah(p.lang, "menu_projection")}>
            {terjemah(p.lang, "flat_mode")}
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button className={`tombol-hud ${!p.sat ? "aktif" : ""}`} onClick={p.onToggleSat} title="S" aria-label={terjemah(p.lang, "menu_basemap")}>
            <MapIcon size={13} /> <span className="hidden sm:inline">{terjemah(p.lang, "map_mode")}</span>
          </button>
          <button className={`tombol-hud ${p.sat ? "aktif" : ""}`} onClick={p.onToggleSat} title="S" aria-label={terjemah(p.lang, "menu_basemap")}>
            <Satellite size={13} /> <span className="hidden sm:inline">{terjemah(p.lang, "sat_mode")}</span>
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button className="tombol-hud" onClick={p.onToggleLang} title="L" aria-label={terjemah(p.lang, "help_l")}>
            <Languages size={13} /> {terjemah(p.lang, "lang_toggle")}
          </button>
        </div>
        <div className="glass flex items-center gap-1 p-1" data-tour="alat">
          {alat.map((a) => (
            <button key={a.kunci} className={`tombol-ikon ${a.aktif ? "aktif" : ""}`} onClick={a.aksi} title={a.judul} aria-label={a.label}>
              <a.Ikon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* kanan: alat (HP) - tombol utama + menu titik tiga supaya tidak keluar layar */}
      <div className="pointer-events-auto relative sm:hidden" ref={wadahMenu}>
        <div className="glass flex items-center gap-1 p-1" data-tour="menu">
          {alatHp.map((a) => (
            <button key={a.kunci} className={`tombol-ikon ${a.aktif ? "aktif" : ""}`} onClick={a.aksi} title={a.judul} aria-label={a.label}>
              <a.Ikon size={16} />
            </button>
          ))}
          <button
            className={`tombol-ikon ${menu ? "aktif" : ""}`}
            onClick={() => setMenu((m) => !m)}
            title={terjemah(p.lang, "menu_more")}
            aria-label={terjemah(p.lang, "menu_more")}
            aria-haspopup="menu"
            aria-expanded={menu}
            data-testid="menu-header"
          >
            <MoreVertical size={16} />
          </button>
        </div>
        {menu && (
          <div role="menu" className="glass-padat braket muncul absolute right-0 top-[calc(100%+6px)] z-40 w-[min(280px,calc(100vw-16px))] py-1">
            {[...itemMenu, ...alat.filter((a) => !a.hp)].map((a) => (
              <button
                key={a.kunci}
                role="menuitem"
                className={`flex min-h-[44px] w-full items-center gap-3 px-3 text-left text-[12px] tracking-[0.04em] hover:bg-white/[0.06] ${a.aktif ? "text-accent" : "text-text"}`}
                onClick={() => {
                  setMenu(false);
                  a.aksi();
                }}
                title={a.judul}
                aria-label={a.label}
              >
                <a.Ikon size={16} className="shrink-0 text-muted" />
                <span className="flex-1">{a.label}</span>
                {a.nilai && <span className="text-[10px] uppercase tracking-[0.15em] text-gold">{a.nilai}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
