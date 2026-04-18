import { textoMontoANumero } from '@/lib/factura-campos-helpers';

/**
 * Heurística: renglones de impuesto/traslado que NO son productos del detalle.
 * No sustituye al modelo; filtra basura evidente antes de validar.
 */
export function esLineaFiscalOImpuesto(descripcion: string): boolean {
  const d = descripcion.trim().toLowerCase();
  if (!d) return true;

  const patrones: RegExp[] = [
    /^\s*traslado\s*(de\s*)?(iva|ieps|isr)?\s*$/i,
    /^\s*retenci[oó]n/i,
    /\btraslado(s)?\s+(iva|ieps|federales?)\b/i,
    /\bimpuesto(s)?\s+(trasladad|retenid)/i,
    /^\s*iva\s*(\(|$)/i,
    /\biva\s*16\b/,
    /\b16\.0\s*%\b/,
    /\b16\s*%\b/,
    /\b8\s*%\b/,
    /^\s*002\s*$/,
    /^\s*003\s*$/,
    /\bcuota\s+(de\s+)?iva\b/i,
    /\btasa\s+16\b/i,
    /\bieps\b/i,
    /\bisr\b/i,
  ];

  return patrones.some((p) => p.test(d));
}

/** Tolerancia: ≥ $1 o 0.5 % del importe (facturas en pesos enteros). */
export function toleranciaCoherenciaLinea(importeAbs: number): number {
  return Math.max(1, Math.abs(importeAbs) * 0.005);
}

/**
 * cantidad × valor_unitario debe cuadrar con importe de la misma fila.
 */
export function tripletaLineaCoherente(
  cantidad: number,
  valorUnitario: number,
  importeLinea: number
): boolean {
  if (
    !Number.isFinite(cantidad) ||
    cantidad <= 0 ||
    !Number.isFinite(valorUnitario) ||
    !Number.isFinite(importeLinea)
  ) {
    return false;
  }
  const esperado = cantidad * valorUnitario;
  const tol = toleranciaCoherenciaLinea(importeLinea);
  return Math.abs(esperado - importeLinea) <= tol;
}

export function montosDesdeStrings(
  valorUnitarioRaw: string,
  importeRaw: string
): { vu: number | null; imp: number | null } {
  const vu = textoMontoANumero(valorUnitarioRaw.trim());
  const imp = textoMontoANumero(importeRaw.trim());
  return {
    vu: Number.isFinite(vu) ? vu : null,
    imp: Number.isFinite(imp) ? imp : null,
  };
}

/**
 * Referencia de la factura de prueba (coherencia numérica esperada en servidor).
 * No llama a OpenAI; solo documenta que la tolerancia acepta estos triples.
 */
export function validacionEjemploFacturaPruebaTripleta(): boolean {
  return (
    tripletaLineaCoherente(6, 1200, 7200) &&
    tripletaLineaCoherente(6, 1550, 9300) &&
    tripletaLineaCoherente(1, 8000, 8000)
  );
}
