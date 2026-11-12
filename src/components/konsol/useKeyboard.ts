import { useEffect } from "react";
import { lapisanDariTombol, type LayerId } from "@/lib/layers";
import type { PanelId } from "@/lib/types";
import { useTerbaru } from "./useTerbaru";

export interface AksiKeyboard {
  boot: boolean;
  panel: PanelId;
  panduan: boolean;
  pilihSkenario: boolean;
  jadwal: boolean;
  tersedia: Set<LayerId>;
  sibuk: () => boolean;
  setPanel: (p: PanelId | ((p: PanelId) => PanelId)) => void;
  setPanduan: (v: boolean) => void;
  setPilihSkenario: (v: boolean) => void;
  setJadwal: (v: boolean) => void;
  toggleObrolan: () => void;
  selesaiBoot: () => void;
  batalPilih: () => void;
  hentikanSimulasi: () => void;
  fullscreen: () => void;
  reset: () => void;
  toggleTour: () => void;
  toggleSkenario: () => void;
  bukaJadwal: () => void;
  toggleLang: () => void;
  toggleSat: () => void;
  toggleDatar: () => void;
  toggleLapisan: (id: LayerId) => void;
}

/** Pintasan keyboard konsol (lihat HelpOverlay). Didaftarkan sekali; aksi dibaca lewat ref terbaru. */
export function useKeyboard(aksi: AksiKeyboard) {
  const ref = useTerbaru(aksi);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const a = ref.current;
      const target = e.target as HTMLElement | null;
      // hanya kolom teks yang "memakan" pintasan; slider/checkbox yang masih fokus tidak boleh mematikan keyboard
      const mengetik = target && (target.tagName === "TEXTAREA" || (target.tagName === "INPUT" && !["range", "checkbox", "radio", "button"].includes((target as HTMLInputElement).type)));
      if (mengetik) {
        if (e.key === "Escape") {
          a.setPanel("none");
          target.blur();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        a.setPanel((p) => (p === "cari" ? "none" : "cari"));
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key) {
        case "Escape":
          if (a.boot) a.selesaiBoot();
          else if (a.panduan) a.setPanduan(false);
          else if (a.pilihSkenario) a.setPilihSkenario(false);
          else if (a.jadwal) a.setJadwal(false);
          else if (a.panel !== "none") a.setPanel("none");
          else if (a.sibuk()) a.hentikanSimulasi();
          else a.batalPilih();
          break;
        case "?":
          a.setPanel((p) => (p === "bantuan" ? "none" : "bantuan"));
          break;
        case "/":
        case "k":
          e.preventDefault();
          a.setPanel("cari");
          break;
        case "f":
          a.fullscreen();
          break;
        case "r":
          a.reset();
          break;
        case "t":
          a.toggleTour();
          break;
        case "w":
          a.toggleSkenario();
          break;
        case "o":
          a.bukaJadwal();
          break;
        case "l":
          a.toggleLang();
          break;
        case "s":
          a.toggleSat();
          break;
        case "g":
          a.toggleDatar();
          break;
        case "d":
          a.setPanel((p) => (p === "data" ? "none" : "data"));
          break;
        case "c":
          a.toggleObrolan();
          break;
        default: {
          const l = lapisanDariTombol(e);
          if (l && a.tersedia.has(l.id)) a.toggleLapisan(l.id);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ref]);
}
