/**
 * Nama keluarga font JetBrains Mono untuk kanvas. next/font memberi nama acak ke font-nya,
 * jadi nama aslinya dibaca dari variabel CSS --font-jetbrains yang dipasang di <html>.
 */
function bacaKeluarga(): string {
  if (typeof document === "undefined") return "'JetBrains Mono'";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim();
  return v || "'JetBrains Mono'";
}

export const FONT_MONO = `${bacaKeluarga()}, ui-monospace, monospace`;
