"use client";

import type { CSSProperties } from "react";

const estilo: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: 12,
  border: "1px solid #D7E0EA",
  background: "#FFFFFF",
  color: "#1E40AF",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "Arial, sans-serif",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
};

type Props = {
  disabled?: boolean;
  onClick: () => void;
};

export function ReporteExportarExcelButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...estilo,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span aria-hidden>📊</span>
      Exportar a Excel
    </button>
  );
}
