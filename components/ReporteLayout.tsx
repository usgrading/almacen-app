"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  appCardInner,
  appFondoMain,
  appNavLink,
  appSubtituloPagina,
  appTituloPagina,
} from "@/lib/app-ui";

type ReporteLayoutProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Inventario general: resumen y filtros fuera de la tarjeta; la tabla va en tarjeta aparte. */
  noCard?: boolean;
  /** Índice de reportes: un poco más de aire entre logo, título y contenido. */
  encabezadoAmplio?: boolean;
  /** Botón derecho del header (por defecto vuelve al índice de reportes). */
  secondaryNav?: { label: string; href: string };
  children: ReactNode;
};

export function ReporteLayout({
  title,
  subtitle,
  noCard,
  encabezadoAmplio = false,
  secondaryNav = { label: "Reportes →", href: "/reportes" },
  children,
}: ReporteLayoutProps) {
  const router = useRouter();
  const [esCel, setEsCel] = useState(false);

  useEffect(() => {
    const revisar = () => setEsCel(window.innerWidth < 768);
    revisar();
    window.addEventListener("resize", revisar);
    return () => window.removeEventListener("resize", revisar);
  }, []);

  return (
    <main style={appFondoMain}>
      <div style={{ maxWidth: esCel ? 520 : 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: encabezadoAmplio ? 14 : 10,
          }}
        >
          <button
            type="button"
            className="app-nav-link"
            onClick={() => router.push("/dashboard")}
            style={appNavLink}
          >
            ← Inicio
          </button>
          <button
            type="button"
            className="app-nav-link"
            onClick={() => router.push(secondaryNav.href)}
            style={appNavLink}
          >
            {secondaryNav.label}
          </button>
        </div>

        <div
          style={{ textAlign: "center", marginBottom: encabezadoAmplio ? 18 : 12 }}
        >
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: 100, height: "auto", objectFit: "contain" }}
          />
        </div>

        <h2
          style={{
            ...appTituloPagina,
            marginBottom: encabezadoAmplio ? 22 : 16,
          }}
        >
          {title}
        </h2>

        {subtitle ? (
          <div
            style={{
              ...appSubtituloPagina,
              marginTop: -4,
              marginBottom: 16,
              maxWidth: 560,
              marginLeft: "auto",
              marginRight: "auto",
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        ) : null}

        {noCard ? children : <div style={appCardInner}>{children}</div>}
      </div>
    </main>
  );
}

/** Misma tabla que inventario general (desktop). */
export const reporteTheadRow: CSSProperties = { background: "#E2E8F0" };

export const reporteTh: CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 700,
  color: "#1F2937",
  borderBottom: "1px solid #CBD5E1",
};

export const reporteThCenter: React.CSSProperties = {
  ...reporteTh,
  textAlign: "center",
};

export const reporteTd: CSSProperties = {
  padding: "12px 14px",
  fontSize: 14,
  color: "#334155",
  borderBottom: "1px solid #E2E8F0",
};

export const reporteTdCenter: CSSProperties = {
  ...reporteTd,
  textAlign: "center",
};

export const reporteThCheckbox: CSSProperties = {
  ...reporteTh,
  width: 44,
  maxWidth: 44,
  textAlign: "center",
  verticalAlign: "middle",
};

export const reporteTdCheckbox: CSSProperties = {
  ...reporteTd,
  width: 44,
  maxWidth: 44,
  textAlign: "center",
  verticalAlign: "middle",
};

export const reporteLoadingBox: CSSProperties = {
  padding: 20,
  textAlign: "center",
  color: "#64748B",
};

export const reporteEmptyBox: CSSProperties = {
  padding: 20,
  textAlign: "center",
  color: "#64748B",
};
