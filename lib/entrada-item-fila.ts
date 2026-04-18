import type { ItemFacturaAnalizado } from '@/lib/analizar-factura-client';
import { totalTextoACostoTotal } from '@/lib/factura-campos-helpers';

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

function cantidadEnFilaDesdeAnalisis(item: ItemFacturaAnalizado): string {
  const { cantidad_sugerida, confianza_cantidad } = item;
  if (
    cantidad_sugerida != null &&
    cantidad_sugerida > 0 &&
    (confianza_cantidad === 'alta' || confianza_cantidad === 'media')
  ) {
    return String(Math.round(cantidad_sugerida));
  }
  return '';
}

export function filasEntradaDesdeAnalisisFactura(
  items: ItemFacturaAnalizado[]
): EntradaItemFila[] {
  if (!items.length) {
    return [crearFilaVaciaEntradaItem()];
  }
  return items.map((item) => {
    const cu = totalTextoACostoTotal(item.precio_unitario);
    const ct = totalTextoACostoTotal(item.importe);
    return {
      id: nuevoIdFila(),
      producto: item.descripcion.trim(),
      cantidad: cantidadEnFilaDesdeAnalisis(item),
      unidad: 'Pieza',
      costoUnitario: cu,
      costoTotal: ct,
      ubicacion: '',
      minimo: '',
      maximo: '',
    };
  });
}
