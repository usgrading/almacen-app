"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  appCardInner,
  appFondoMain,
  appNavLink,
  appSubtituloPagina,
  appTituloPagina,
} from "@/lib/app-ui";

const SECCIONES: readonly string[] = [
  "Inicio de sesión",
  "Primer acceso",
  "Panel principal",
  "Entradas MX",
  "Entradas USA",
  "Salidas",
  "Inventario",
  "Reportes",
  "Alertas",
  "Usuarios",
];

export default function InstruccionesPage() {
  const router = useRouter();
  const [esCel, setEsCel] = useState(false);

  useEffect(() => {
    const revisarPantalla = () => {
      setEsCel(window.innerWidth < 768);
    };

    revisarPantalla();
    window.addEventListener("resize", revisarPantalla);

    return () => window.removeEventListener("resize", revisarPantalla);
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
            marginBottom: 10,
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
        </div>

        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: 100,
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        <h2
          style={{
            ...appTituloPagina,
            marginBottom: 8,
          }}
        >
          Instrucciones
        </h2>

        <p
          style={{
            ...appSubtituloPagina,
            margin: "0 0 22px 0",
          }}
        >
          Guía de uso del sistema
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SECCIONES.map((titulo) => (
            <section
              key={titulo}
              aria-labelledby={`instrucciones-seccion-${slugId(titulo)}`}
              style={{
                ...appCardInner,
                padding: "18px",
              }}
            >
              <h3
                id={`instrucciones-seccion-${slugId(titulo)}`}
                style={styles.sectionTitle}
              >
                {titulo}
              </h3>
              <p style={styles.placeholder}>Contenido pendiente...</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function slugId(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const styles: Record<string, CSSProperties> = {
  sectionTitle: {
    margin: "0 0 12px 0",
    fontSize: "18px",
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  placeholder: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.5,
    color: "#64748b",
  },
};
