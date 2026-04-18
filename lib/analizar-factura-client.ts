import { archivoImagenABase64 } from '@/lib/factura-campos-helpers';
import { supabase } from '@/lib/supabase';
import type { ConfianzaCantidad } from '@/lib/factura-cantidad-texto';

export type ItemFacturaAnalizado = {
  descripcion: string;
  /** Cantidad que devolvió el modelo (puede ser null si no fue clara). */
  cantidad: number | null;
  /** Inferida en servidor desde patrones en la descripción / texto de línea. */
  cantidad_sugerida: number | null;
  confianza_cantidad: ConfianzaCantidad | null;
  precio_unitario: string;
  importe: string;
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
    return Math.max(1, Math.floor(r.cantidad));
  }
  if (typeof r.cantidad === 'string' && r.cantidad.trim()) {
    const n = parseFloat(r.cantidad.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.floor(n));
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
            descripcion: '',
            cantidad: null,
            cantidad_sugerida: null,
            confianza_cantidad: null,
            precio_unitario: '',
            importe: '',
          };
        }
        const r = row as Record<string, unknown>;
        return {
          descripcion:
            typeof r.descripcion === 'string' ? r.descripcion.trim() : '',
          cantidad: parseCantidadItem(r),
          cantidad_sugerida: parseCantidadSugerida(r),
          confianza_cantidad: parseConfianza(r.confianza_cantidad),
          precio_unitario:
            typeof r.precio_unitario === 'string'
              ? r.precio_unitario.trim()
              : String(r.precio_unitario ?? '').trim(),
          importe:
            typeof r.importe === 'string'
              ? r.importe.trim()
              : String(r.importe ?? '').trim(),
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
