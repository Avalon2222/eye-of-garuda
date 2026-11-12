import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Ref yang selalu berisi nilai render terakhir. Dipakai supaya penangan event peta dan loop animasi
 * (yang didaftarkan sekali) tetap membaca state terbaru tanpa didaftarkan ulang tiap render.
 */
export function useTerbaru<T>(nilai: T): RefObject<T> {
  const ref = useRef(nilai);
  useLayoutEffect(() => {
    ref.current = nilai;
  });
  return ref;
}
