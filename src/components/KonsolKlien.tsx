"use client";

import dynamic from "next/dynamic";

// peta butuh WebGL dan window, jadi konsol cuma dirender di browser
const Console = dynamic(() => import("@/components/Console"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-bg" />,
});

export default function KonsolKlien() {
  return <Console />;
}
