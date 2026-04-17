import type { CSSProperties } from 'react';

/** Temporal: poner en false cuando termine el diagnóstico en móvil. */
export const DEBUG_FACTURA_MOBILE = true;

export function logFacturaMovil(
  pagina: 'mx' | 'usa',
  evento: string,
  detalle?: Record<string, unknown>
): void {
  if (!DEBUG_FACTURA_MOBILE) return;
  const prefix = `[Entradas-${pagina.toUpperCase()}][factura]`;
  if (detalle !== undefined) {
    console.log(`${prefix} ${evento}`, detalle);
  } else {
    console.log(`${prefix} ${evento}`);
  }
}

export function logFacturaStorage(
  evento: string,
  detalle?: Record<string, unknown>
): void {
  if (!DEBUG_FACTURA_MOBILE) return;
  const prefix = '[facturas][upload]';
  if (detalle !== undefined) {
    console.log(`${prefix} ${evento}`, detalle);
  } else {
    console.log(`${prefix} ${evento}`);
  }
}

/**
 * Estilo que no usa display:none: en varios WebViews móviles el .click()
 * programático no abre el selector si el input está con display:none.
 */
export const estiloInputFileOcultoMovil: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
  opacity: 0,
};

/**
 * Input file encima del botón visible: el usuario hace clic directamente en el input.
 * Así el selector de archivos se abre en desktop y móvil sin depender de `input.click()` programático
 * (que muchos navegadores bloquean si el input tiene tamaño 0 / clip).
 */
export const estiloInputFileOverlayBoton: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  zIndex: 2,
  margin: 0,
  padding: 0,
  border: 0,
  fontSize: 16,
};

/**
 * iOS a veces devuelve MIME vacío en fotos desde cámara; HEIC puede no llevar type estándar.
 */
export function esProbableImagenFactura(
  file: File,
  origenInput: 'galeria' | 'camara'
): boolean {
  if (file.type.startsWith('image/')) return true;
  const n = file.name.toLowerCase();
  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp|dng)$/i.test(n)) return true;
  if (
    origenInput === 'camara' &&
    (!file.type || file.type === '') &&
    file.size > 0 &&
    file.size < 40 * 1024 * 1024
  ) {
    return true;
  }
  return false;
}
