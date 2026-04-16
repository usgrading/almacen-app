"use client";

import type { CSSProperties } from "react";

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const card: CSSProperties = {
  background: "#FFFFFF",
  borderRadius: 16,
  padding: 24,
  maxWidth: 420,
  width: "100%",
  boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
  border: "1px solid #E2E8F0",
};

const btnBase: CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid transparent",
  fontFamily: "Arial, sans-serif",
};

type Props = {
  abierto: boolean;
  mensaje: string;
  onCancelar: () => void;
  onConfirmar: () => void;
  cargando?: boolean;
};

export function ConfirmarEliminarModal({
  abierto,
  mensaje,
  onCancelar,
  onConfirmar,
  cargando = false,
}: Props) {
  if (!abierto) return null;

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="confirmar-eliminar-titulo">
      <div style={card}>
        <p
          id="confirmar-eliminar-titulo"
          style={{ margin: "0 0 20px 0", color: "#1F2937", fontSize: 16, lineHeight: 1.5 }}
        >
          {mensaje}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={cargando}
            onClick={onCancelar}
            style={{
              ...btnBase,
              background: "#FFFFFF",
              borderColor: "#D7E0EA",
              color: "#475569",
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={cargando}
            onClick={onConfirmar}
            style={{
              ...btnBase,
              background: "#B91C1C",
              borderColor: "#B91C1C",
              color: "#FFFFFF",
            }}
          >
            {cargando ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
