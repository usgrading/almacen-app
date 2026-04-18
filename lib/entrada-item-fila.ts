import type { ItemFacturaAnalizado } from '@/lib/analizar-factura-client';
import { textoMontoANumero } from '@/lib/factura-campos-helpers';

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
  /** True si cantidad × unitario no cuadra con total (o datos insuficientes/contradictorios). */
  ambiguous_row?: boolean;
};

const TOLERANCIA_COHERENCIA_PESOS = 1;

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
    ambiguous_row: false,
  };
}

/** Parseo monetario estricto: sin defaults; inválido → null. */
function montoValido(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = textoMontoANumero(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function cantidadValidaDesdeItem(item: ItemFacturaAnalizado): number | null {
  if (item.cantidad != null && Number.isFinite(item.cantidad) && item.cantidad > 0) {
    return item.cantidad;
  }
  if (
    item.cantidad_sugerida != null &&
    item.cantidad_sugerida > 0 &&
    item.confianza_cantidad !== 'baja'
  ) {
    return item.cantidad_sugerida;
  }
  return null;
}

function cantidadRazonableInferida(n: number): boolean {
  return Number.isFinite(n) && n > 0 && n < 1e8;
}

/** Entero si está cerca; si no, 4 decimales máx. */
function snapCantidadDocumento(n: number): number {
  if (Math.abs(n - Math.round(n)) < 0.051) return Math.round(n);
  return Math.round(n * 10000) / 10000;
}

/** Formato estable para el formulario (sin forzar 1). */
function formatearCantidad(n: number | null): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return '';
  if (Math.abs(n - Math.round(n)) < 1e-4) return String(Math.round(n));
  const r = Math.round(n * 10000) / 10000;
  return String(r);
}

function formatearMonto(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '';
  return (Math.round(n * 100) / 100).toFixed(2);
}

/** Catálogo común en facturas MX (clave unidad SAT / similar). */
function etiquetaDesdeClaveUnidad(clave: string | null | undefined): string {
  const c = (clave ?? '').trim().toUpperCase();
  if (c === 'MTR') return 'Metros';
  if (c === 'H87') return 'Pieza';
  return 'Pieza';
}

/**
 * Prioridad (importe + valor unitario anclan la línea MX típica):
 *
 * 1) Si hay **valor_unitario** e **importe**: cantidad =
 *    importe/valor_unitario (snap) salvo que la cantidad del análisis ya cuadre
 *    con importe y valor (`|cant×vu − importe| ≤ tol`). Entonces unit=vu, total=imp.
 * 2) Si no hubo par vu+imp pero sí **cantidad + importe**: unit = importe/cantidad,
 *    total = importe (sin usar vu si faltó).
 * 3) Si **cantidad + valor_unitario** y no hay importe: total = cant×vu.
 * 4) Si solo falta cantidad y hay vu+imp → ya en (1).
 *
 * Sin `Number(x)||1` ni cantidad por defecto.
 */
export function mapItemAnalizadoAFilaEntrada(item: ItemFacturaAnalizado): Omit<
  EntradaItemFila,
  'id' | 'ubicacion' | 'minimo' | 'maximo'
> & { ambiguous_row: boolean } {
  const vuRaw = item.valor_unitario.trim() || item.precio_unitario.trim();
  const impRaw = item.importe.trim();

  const cantidadValida = cantidadValidaDesdeItem(item);
  const unitarioValido = montoValido(vuRaw);
  const importeValido = montoValido(impRaw);

  let cantidad: number | null = null;
  let costoUnitario: number | null = null;
  let costoTotal: number | null = null;

  if (
    unitarioValido != null &&
    importeValido != null &&
    unitarioValido > 0
  ) {
    const desdeDoc = importeValido / unitarioValido;
    if (cantidadRazonableInferida(desdeDoc)) {
      const qSnap = snapCantidadDocumento(desdeDoc);
      const cantidadCoherenteConDoc =
        cantidadValida != null &&
        Math.abs(cantidadValida * unitarioValido - importeValido) <=
          TOLERANCIA_COHERENCIA_PESOS;

      if (cantidadCoherenteConDoc) {
        cantidad = cantidadValida;
        costoUnitario = unitarioValido;
        costoTotal = importeValido;
      } else {
        cantidad = qSnap;
        costoUnitario = unitarioValido;
        costoTotal = importeValido;
      }
    }
  }

  if (
    cantidad == null &&
    cantidadValida != null &&
    importeValido != null &&
    cantidadValida > 0
  ) {
    cantidad = cantidadValida;
    costoUnitario = importeValido / cantidadValida;
    costoTotal = importeValido;
  }

  if (
    cantidad == null &&
    cantidadValida != null &&
    unitarioValido != null &&
    importeValido == null
  ) {
    cantidad = cantidadValida;
    costoUnitario = unitarioValido;
    costoTotal = cantidadValida * unitarioValido;
  }

  const tieneProducto = item.descripcion.trim().length > 0;

  let ambiguous_row = false;

  if (tieneProducto) {
    if (
      cantidad != null &&
      costoUnitario != null &&
      costoTotal != null &&
      cantidad > 0
    ) {
      const c = cantidad;
      const u = costoUnitario;
      const t = costoTotal;
      const esperado = c * u;
      if (Math.abs(esperado - t) > TOLERANCIA_COHERENCIA_PESOS) {
        ambiguous_row = true;
      }
    } else {
      ambiguous_row = true;
    }
  }

  return {
    producto: item.descripcion.trim(),
    cantidad: formatearCantidad(cantidad),
    unidad: etiquetaDesdeClaveUnidad(item.clave_unidad),
    costoUnitario: formatearMonto(costoUnitario),
    costoTotal: formatearMonto(costoTotal),
    ambiguous_row,
  };
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
    const m = mapItemAnalizadoAFilaEntrada(item);
    return {
      id: nuevoIdFila(),
      producto: m.producto,
      cantidad: m.cantidad,
      unidad: m.unidad,
      costoUnitario: m.costoUnitario,
      costoTotal: m.costoTotal,
      ubicacion: '',
      minimo: '',
      maximo: '',
      ambiguous_row: m.ambiguous_row,
    };
  });
}
