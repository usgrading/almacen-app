import { archivoImagenABase64 } from '@/lib/factura-campos-helpers';

export type DatosFacturaExtraidos = {
  proveedor: string;
  numero_factura: string;
  fecha: string;
  total: string;
};

export async function solicitarAnalisisFactura(
  archivo: File
): Promise<
  | { ok: true; datos: DatosFacturaExtraidos }
  | { ok: false; error: string }
> {
  const { base64, mimeType } = await archivoImagenABase64(archivo);
  const res = await fetch('/api/analizar-factura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  });
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: 'No se pudo analizar la factura' };
  }
  const obj = data as { error?: string } & Partial<DatosFacturaExtraidos>;
  if (!res.ok) {
    return {
      ok: false,
      error:
        typeof obj.error === 'string' && obj.error.trim()
          ? obj.error
          : 'No se pudo analizar la factura',
    };
  }
  return {
    ok: true,
    datos: {
      proveedor: typeof obj.proveedor === 'string' ? obj.proveedor : '',
      numero_factura:
        typeof obj.numero_factura === 'string' ? obj.numero_factura : '',
      fecha: typeof obj.fecha === 'string' ? obj.fecha : '',
      total: typeof obj.total === 'string' ? obj.total : '',
    },
  };
}
