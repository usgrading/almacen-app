"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#1E40AF",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};

const titleStyle: React.CSSProperties = {
  marginTop: 0,
  marginBottom: 16,
  color: "#1F2937",
  fontSize: 22,
  textAlign: "center",
};

const cardShellStyle: React.CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 16,
  boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
  border: "1px solid #DCE5EE",
  overflow: "hidden",
};

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
    <main
      style={{
        minHeight: "100vh",
        background: "#EEF3F8",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
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
            onClick={() => router.push("/dashboard")}
            style={navBtnStyle}
          >
            ← Inicio
          </button>
          <button
            type="button"
            onClick={() => router.push(secondaryNav.href)}
            style={navBtnStyle}
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
            ...titleStyle,
            marginBottom: encabezadoAmplio ? 22 : 16,
          }}
        >
          {title}
        </h2>

        {subtitle ? (
          <div
            style={{
              marginTop: -8,
              marginBottom: 16,
              color: "#64748B",
              fontSize: 15,
              textAlign: "center",
              lineHeight: 1.5,
              padding: "0 4px",
            }}
          >
            {subtitle}
          </div>
        ) : null}

        {noCard ? children : <div style={cardShellStyle}>{children}</div>}
      </div>
    </main>
  );
}

/** Misma tabla que inventario general (desktop). */
export const reporteTheadRow: React.CSSProperties = { background: "#E2E8F0" };

export const reporteTh: React.CSSProperties = {
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

export const reporteTd: React.CSSProperties = {
  padding: "12px 14px",
  fontSize: 14,
  color: "#334155",
  borderBottom: "1px solid #E2E8F0",
};

export const reporteTdCenter: React.CSSProperties = {
  ...reporteTd,
  textAlign: "center",
};

export const reporteLoadingBox: React.CSSProperties = {
  padding: 20,
  textAlign: "center",
  color: "#64748B",
};

export const reporteEmptyBox: React.CSSProperties = {
  padding: 20,
  textAlign: "center",
  color: "#64748B",
};
