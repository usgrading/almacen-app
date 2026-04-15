"use client";

import Image from "next/image";

type PageLogoProps = {
  /** Ancho en px (dashboard usa 140). */
  widthPx?: number;
  marginBottom?: number;
};

export function PageLogo({ widthPx = 140, marginBottom = 18 }: PageLogoProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginBottom,
      }}
    >
      <Image
        src="/logo.png"
        alt="Estrella Express"
        width={0}
        height={0}
        sizes="100vw"
        style={{
          width: `${widthPx}px`,
          height: "auto",
          objectFit: "contain",
        }}
        priority
      />
    </div>
  );
}
