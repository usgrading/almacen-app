import { archivoImagenABase64 } from '@/lib/factura-campos-helpers';
import { supabase } from '@/lib/supabase';

export type ItemFacturaAnalizado = {
  descripcion: string;
  cantidad: number;
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
            cantidad: 1,
            precio_unitario: '',
            importe: '',
          };
        }
        const r = row as Record<string, unknown>;
        let cantidad = 1;
        if (typeof r.cantidad === 'number' && Number.isFinite(r.cantidad)) {
          cantidad = Math.max(1, Math.floor(r.cantidad));
        } else if (typeof r.cantidad === 'string' && r.cantidad.trim()) {
          const n = parseFloat(r.cantidad.replace(',', '.'));
          if (Number.isFinite(n) && n > 0) cantidad = Math.max(1, Math.floor(n));
        }
        return {
          descripcion:
            typeof r.descripcion === 'string' ? r.descripcion.trim() : '',
          cantidad,
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
