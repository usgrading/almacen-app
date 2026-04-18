import { archivoImagenABase64 } from '@/lib/factura-campos-helpers';
import { supabase } from '@/lib/supabase';
import type { ConfianzaCantidad } from '@/lib/factura-cantidad-texto';

export type ItemFacturaAnalizado = {
  codigo: string;
  descripcion: string;
  /** Cantidad final (columna Cantidad del modelo o inferencia regex). */
  cantidad: number | null;
  /** Clave de unidad SAT u otra (ej. MTR, H87). */
  clave_unidad: string | null;
  /** Precio por unidad: debe corresponder a columna Valor Unitario en MX. */
  valor_unitario: string;
  /** Alias legacy / misma fuente que valor_unitario si el API solo envía precio_unitario. */
  precio_unitario: string;
  /** Importe de línea cuando existe columna clara. */
  importe: string;
  /** Servidor: fila sospechosa o sin coherencia cantidad×VU≈importe. */
  ambiguous_item?: boolean;
  cantidad_sugerida: number | null;
  confianza_cantidad: ConfianzaCantidad | null;
};

export type DatosFacturaExtraidos = {
  proveedor: string;
  numero_factura: string;
  fecha: string;
  total: string;
  items: ItemFacturaAnalizado[];
};

function parseConfianza(v: unknown): ConfianzaCantidad | null {
  if (v === 'alta' || v === 'media' || v === 'baja') return v;
  return null;
}

function parseCantidadItem(r: Record<string, unknown>): number | null {
  if (r.cantidad === null || r.cantidad === undefined) return null;
  if (typeof r.cantidad === 'number' && Number.isFinite(r.cantidad) && r.cantidad > 0) {
    return r.cantidad;
  }
  if (typeof r.cantidad === 'string' && r.cantidad.trim()) {
    const n = parseFloat(r.cantidad.trim().replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function parseCantidadSugerida(r: Record<string, unknown>): number | null {
  const v = r.cantidad_sugerida;
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return Math.max(1, Math.floor(v));
  }
  if (typeof v === 'string' && v.trim()) {
    const n = parseFloat(v.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.floor(n));
  }
  return null;
}

function strRecord(r: Record<string, unknown>, key: string): string {
  const v = r[key];
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

export async function solicitarAnalisisFactura(
  archivo: File
): Promise<
  | { ok: true; datos: DatosFacturaExtraidos }
  | { ok: false; error: string }
> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) {
    return {
      ok: false,
      error: 'No hay sesión. Inicia sesión para analizar la factura.',
    };
  }

  const { base64, mimeType } = await archivoImagenABase64(archivo);
  const res = await fetch('/api/analizar-factura', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: 'No se pudo analizar la factura' };
  }
  const obj = data as {
    error?: string;
  } & Partial<DatosFacturaExtraidos> & {
    items?: unknown;
  };
  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof obj.error === 'string' && obj.error.trim()
          ? obj.error
          : 'No se pudo analizar la factura',
    };
  }

  const itemsRaw = obj.items;
  const items: ItemFacturaAnalizado[] = Array.isArray(itemsRaw)
    ? itemsRaw.map((row) => {
        if (!row || typeof row !== 'object') {
          return {
            codigo: '',
            descripcion: '',
            cantidad: null,
            clave_unidad: null,
            valor_unitario: '',
            precio_unitario: '',
            importe: '',
            ambiguous_item: false,
            cantidad_sugerida: null,
            confianza_cantidad: null,
          };
        }
        const r = row as Record<string, unknown>;
        const vu =
          strRecord(r, 'valor_unitario') || strRecord(r, 'precio_unitario');
        const clave = strRecord(r, 'clave_unidad');
        return {
          codigo: strRecord(r, 'codigo'),
          descripcion:
            typeof r.descripcion === 'string' ? r.descripcion.trim() : '',
          cantidad: parseCantidadItem(r),
          clave_unidad: clave || null,
          valor_unitario: vu,
          precio_unitario: vu,
          importe:
            typeof r.importe === 'string'
              ? r.importe.trim()
              : String(r.importe ?? '').trim(),
          ambiguous_item:
            typeof r.ambiguous_item === 'boolean' ? r.ambiguous_item : false,
          cantidad_sugerida: parseCantidadSugerida(r),
          confianza_cantidad: parseConfianza(r.confianza_cantidad),
        };
      })
    : [];

  return {
    ok: true,
    datos: {
      proveedor: typeof obj.proveedor === 'string' ? obj.proveedor : '',
      numero_factura:
        typeof obj.numero_factura === 'string' ? obj.numero_factura : '',
      fecha: typeof obj.fecha === 'string' ? obj.fecha : '',
      total: typeof obj.total === 'string' ? obj.total : '',
      items,
    },
  };
}
