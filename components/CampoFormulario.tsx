'use client';

import type { CSSProperties, ReactNode } from 'react';

export const estiloLabelCampo: CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  marginBottom: 4,
  display: 'block',
};

type CampoFormularioProps = {
  etiqueta: string;
  children: ReactNode;
  /** Asocia el label al control (accesibilidad) */
  htmlFor?: string;
  /** Separación bajo el campo completo (por defecto 12) */
  margenInferior?: number;
  /** Tamaño del texto del label (p. ej. 11 en celdas de tabla) */
  tamanoEtiqueta?: number;
};

/**
 * Patrón estándar: label visible siempre arriba del control.
 */
export function CampoFormulario({
  etiqueta,
  children,
  htmlFor,
  margenInferior = 12,
  tamanoEtiqueta = 14,
}: CampoFormularioProps) {
  return (
    <div className="campo" style={{ marginBottom: margenInferior }}>
      <label
        htmlFor={htmlFor}
        style={{
          ...estiloLabelCampo,
          fontSize: tamanoEtiqueta,
        }}
      >
        {etiqueta}
      </label>
      {children}
    </div>
  );
}
