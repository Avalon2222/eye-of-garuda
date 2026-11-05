"use client";

import dynamic from "next/dynamic";

const Console = dynamic(() => import("@/components/Console"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-bg" />,
});

export default function Halaman() {
  return <Console />;
}
