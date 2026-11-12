"use client";

import { useEffect, useRef } from "react";

const BISA_FOKUS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function sedangMengetik(el: Element | null): boolean {
  return el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

/**
 * Pindahkan fokus keyboard ke panel waktu panel muncul, lalu kembalikan ke elemen sebelumnya waktu panel ditutup.
 * Pasang ref-nya di wadah panel yang punya tabIndex={-1}.
 * - `jebak`: Tab berputar di dalam panel (untuk dialog modal).
 * - `sopan`: jangan rebut fokus kalau pengguna sedang mengetik di tempat lain (untuk panel samping).
 */
export function useFokusPanel<T extends HTMLElement>({ jebak = false, sopan = false }: { jebak?: boolean; sopan?: boolean } = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sebelum = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!el.contains(document.activeElement) && !(sopan && sedangMengetik(document.activeElement))) el.focus({ preventScroll: true });

    const tekan = (ev: KeyboardEvent) => {
      if (!jebak || ev.key !== "Tab") return;
      const daftar = Array.from(el.querySelectorAll<HTMLElement>(BISA_FOKUS)).filter((x) => x.offsetParent !== null);
      if (daftar.length === 0) {
        ev.preventDefault();
        return;
      }
      const awal = daftar[0];
      const akhir = daftar[daftar.length - 1];
      const kini = document.activeElement;
      if (ev.shiftKey && (kini === awal || kini === el)) {
        ev.preventDefault();
        akhir.focus();
      } else if (!ev.shiftKey && kini === akhir) {
        ev.preventDefault();
        awal.focus();
      }
    };
    el.addEventListener("keydown", tekan);

    return () => {
      el.removeEventListener("keydown", tekan);
      // kembalikan fokus hanya kalau fokus memang masih di panel ini (atau hilang karena panel dilepas)
      const kini = document.activeElement;
      if (sebelum?.isConnected && (kini === document.body || kini === null || el.contains(kini))) sebelum.focus({ preventScroll: true });
    };
  }, [jebak, sopan]);

  return ref;
}
