import type { CSSProperties } from "react";

/** Fondo tipo login: gradiente suave (el body también lo usa; main puede ser transparente). */
export const appFondoMain: CSSProperties = {
  minHeight: "100dvh",
  width: "100%",
  background: "transparent",
  padding: "clamp(12px, 4vw, 28px)",
  boxSizing: "border-box",
};

/** Contenedor centrado (login). */
export const appFondoMainCentrado: CSSProperties = {
  ...appFondoMain,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** Tarjeta principal (misma familia que login). */
export const appCard: CSSProperties = {
  width: "100%",
  background: "rgba(255, 255, 255, 0.92)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  padding: "clamp(22px, 5vw, 34px)",
  borderRadius: 22,
  border: "1px solid rgba(226, 232, 240, 0.85)",
  boxShadow:
    "0 1px 2px rgba(15, 23, 42, 0.04), 0 24px 48px -12px rgba(15, 23, 42, 0.12)",
  boxSizing: "border-box",
};

export const appCardNarrow: CSSProperties = {
  ...appCard,
  maxWidth: 420,
};

export const appCardInner: CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  border: "1px solid rgba(226, 232, 240, 0.9)",
  boxShadow:
    "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 32px -8px rgba(15, 23, 42, 0.1)",
  overflow: "hidden",
};

export const appTituloPagina: CSSProperties = {
  margin: 0,
  fontSize: "clamp(1.35rem, 3.5vw, 1.6rem)",
  fontWeight: 700,
  letterSpacing: "-0.03em",
  color: "#0f172a",
  lineHeight: 1.25,
  textAlign: "center",
};

export const appSubtituloPagina: CSSProperties = {
  margin: "10px 0 0 0",
  fontSize: 15,
  fontWeight: 400,
  letterSpacing: "0.02em",
  color: "#64748b",
  lineHeight: 1.45,
  textAlign: "center",
};

export const appInput: CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  marginBottom: 0,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#0f172a",
  fontSize: 15,
  boxSizing: "border-box",
  transition:
    "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
};

export const appBtnPrimario: CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: 12,
  border: "none",
  background: "#1e40af",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 4px 16px rgba(30, 64, 175, 0.35)",
  transition:
    "background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease, filter 0.2s ease",
};

export const appBtnPrimarioDisabled: CSSProperties = {
  ...appBtnPrimario,
  background: "#93b4e8",
  boxShadow: "none",
  cursor: "not-allowed",
};

export const appBtnSecundario: CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "transparent",
  color: "#64748b",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer",
  transition: "background 0.2s ease, border-color 0.2s ease",
};

export const appNavLink: CSSProperties = {
  background: "none",
  border: "none",
  color: "#1e40af",
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
  fontSize: 15,
};

export const appMensajeError: CSSProperties = {
  margin: "0 0 14px 0",
  color: "#b91c1c",
  fontSize: 13,
  lineHeight: 1.35,
};
