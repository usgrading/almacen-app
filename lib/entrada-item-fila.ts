import type { ItemFacturaAnalizado } from '@/lib/analizar-factura-client';
import { textoMontoANumero, totalTextoACostoTotal } from '@/lib/factura-campos-helpers';

export type EntradaItemFila = {
  id: string;
  producto: string;
  cantidad: string;
  unidad: string;
  costoUnitario: string;
  costoTotal: string;
  ubicacion: string;
  minimo: string;
  maximo: string;
};

function nuevoIdFila(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `fila-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function crearFilaVaciaEntradaItem(): EntradaItemFila {
  return {
    id: nuevoIdFila(),
    producto: '',
    cantidad: '',
    unidad: '',
    costoUnitario: '',
    costoTotal: '',
    ubicacion: '',
    minimo: '',
    maximo: '',
  };
}

function parseNumFlexible(valor: string): number {
  if (!valor.trim()) return 0;
  const n = Number(valor.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Catálogo común en facturas MX (clave unidad SAT / similar). */
function etiquetaDesdeClaveUnidad(clave: string | null | undefined): string {
  const c = (clave ?? '').trim().toUpperCase();
  if (c === 'MTR') return 'Metros';
  if (c === 'H87') return 'Pieza';
  return 'Pieza';
}

function cantidadTextoDesdeAnalisis(item: ItemFacturaAnalizado): string {
  if (item.cantidad != null && item.cantidad > 0) {
    const n = item.cantidad;
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) {
      return String(Math.round(n));
    }
    return String(n);
  }
  if (
    item.cantidad_sugerida != null &&
    item.cantidad_sugerida > 0 &&
    item.confianza_cantidad !== 'baja'
  ) {
    return String(Math.round(item.cantidad_sugerida));
  }
  return '';
}

function costoUnitarioDesdeAnalisis(item: ItemFacturaAnalizado): string {
  const raw = item.valor_unitario.trim() || item.precio_unitario.trim();
  return totalTextoACostoTotal(raw);
}

/**
 * Preferir cantidad × valor unitario; si falta alguno, usar importe de línea parseado.
 */
function costoTotalLineaDesdeAnalisis(
  item: ItemFacturaAnalizado,
  cantidadStr: string,
  costoUnitarioStr: string
): string {
  const q = item.cantidad ?? parseNumFlexible(cantidadStr);
  const vu = textoMontoANumero(costoUnitarioStr);
  if (Number.isFinite(q) && q > 0 && Number.isFinite(vu)) {
    return (Math.round(q * vu * 100) / 100).toFixed(2);
  }
  const imp = textoMontoANumero(item.importe);
  if (Number.isFinite(imp) && imp > 0) {
    return imp.toFixed(2);
  }
  const impRaw = totalTextoACostoTotal(item.importe);
  return impRaw;
}

/**
 * Convierte ítems del análisis de factura en filas editables de entrada.
 */
/**
 * Stock mín/máx para productos nuevos (primera captura), tomando la primera fila por producto.
 */
export function construirStockNuevoPorProducto(
  filas: EntradaItemFila[],
  primeraPorProducto: Record<string, boolean | undefined>
): Record<string, { minimo: number; maximo: number }> {
  const stock: Record<string, { minimo: number; maximo: number }> = {};
  for (const f of filas) {
    const p = f.producto.trim().toLowerCase();
    if (!p || !primeraPorProducto[p]) continue;
    if (stock[p] !== undefined) continue;
    stock[p] = {
      minimo: Number(f.minimo),
      maximo: Number(f.maximo),
    };
  }
  return stock;
}

export function filasEntradaDesdeAnalisisFactura(
  items: ItemFacturaAnalizado[]
): EntradaItemFila[] {
  if (!items.length) {
    return [crearFilaVaciaEntradaItem()];
  }
  return items.map((item) => {
    const cantidadStr = cantidadTextoDesdeAnalisis(item);
    const cu = costoUnitarioDesdeAnalisis(item);
    const ct = costoTotalLineaDesdeAnalisis(item, cantidadStr, cu);
    return {
      id: nuevoIdFila(),
      producto: item.descripcion.trim(),
      cantidad: cantidadStr,
      unidad: etiquetaDesdeClaveUnidad(item.clave_unidad),
      costoUnitario: cu,
      costoTotal: ct,
      ubicacion: '',
      minimo: '',
      maximo: '',
    };
  });
}
