import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { inferirCantidadDesdeTextoTicket } from '@/lib/factura-cantidad-texto';
import type { ConfianzaCantidad } from '@/lib/factura-cantidad-texto';

export const maxDuration = 60;

type Body = {
  imageBase64?: string;
  mimeType?: string;
};

export type ItemFacturaJson = {
  descripcion: string;
  cantidad: number | null;
  /** Clave de unidad (ej. SAT): MTR, H87 — vacío si no aparece. */
  clave_unidad: string;
  /** Solo columna "Valor Unitario" / precio unitario neto de la línea. */
  valor_unitario: string;
  /** Importe de línea (subtotal línea) si existe columna clara; no usar total con impuestos mezclados. */
  importe: string;
  cantidad_sugerida: number | null;
  confianza_cantidad: ConfianzaCantidad;
};

export type FacturaJson = {
  proveedor: string;
  numero_factura: string;
  fecha: string;
  total: string;
  items: ItemFacturaJson[];
};

const PROMPT_USUARIO = `Analiza esta imagen de factura o ticket de compra. Responde únicamente con JSON válido, sin texto antes ni después, usando exactamente esta estructura:
{
  "proveedor": "",
  "numero_factura": "",
  "fecha": "",
  "total": "",
  "items": [
    {
      "descripcion": "",
      "cantidad": null,
      "clave_unidad": "",
      "valor_unitario": "",
      "importe": ""
    }
  ]
}

Facturas mexicanas (CFDI / tabla con columnas tipo Cantidad, ClaveUnidad, Descripcion, Valor Unitario, Descuento, Impuestos, Importe):
- Por cada línea del detalle de productos/servicios, lee la columna **Cantidad** y pon ese número entero (o decimal si aplica) en "cantidad". No copies cantidades desde Descuento ni desde Impuestos.
- Lee **ClaveUnidad** tal cual (ej. H87, MTR) en "clave_unidad". Si no hay columna, "".
- En "descripcion" pon solo el texto de la columna **Descripcion** / concepto del artículo, sin repetir cantidades ni montos en la misma cadena si puedes evitarlo.
- En "valor_unitario" pon SOLO el valor de la columna **Valor Unitario** (precio por unidad antes de impuestos). NUNCA pongas ahí montos de **Descuento**, **Impuestos**, **IVA**, ni totales de línea mezclados con impuestos.
- En "importe" pon el importe de línea si existe una columna clara tipo **Importe** del renglón (subtotal de línea sin confundir con columnas de impuesto global). Si la tabla solo muestra Valor Unitario y Cantidad y no hay importe de línea claro, deja "".

Otras facturas (sin esas columnas):
- "cantidad": número solo si es claro por línea; si no, null.
- "clave_unidad": "" si no aplica.
- "valor_unitario": precio unitario de la línea si es claro; no uses descuentos ni impuestos como precio unitario.
- "importe": importe de línea si es claro.

Reglas generales:
- Extrae todas las líneas del detalle de compra. Ignora firmas, sellos, leyendas al pie, totales globales como única línea.
- Valores monetarios como string (pueden incluir símbolo $ o no).
- Si no hay líneas de detalle claras, "items": [].`;

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

function parseCantidad(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return v;
  }
  if (typeof v === 'string' && v.trim()) {
    const t = v.trim().replace(/\s/g, '');
    const n = parseFloat(t.replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Normaliza cantidad de columna (enteros típicos en factura MX). */
function cantidadNormalizada(v: number): number {
  const r = Math.round(v * 10000) / 10000;
  if (Math.abs(r - Math.round(r)) < 1e-6) return Math.round(r);
  return r;
}

function parseItems(raw: unknown): ItemFacturaJson[] {
  if (!Array.isArray(raw)) return [];
  const out: ItemFacturaJson[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const descripcion = str(o.descripcion).trim();

    const cantidadModelo = parseCantidad(o.cantidad);
    const inf = inferirCantidadDesdeTextoTicket(descripcion);

    const valorRaw =
      str(o.valor_unitario).trim() ||
      str((o as Record<string, unknown>).precio_unitario).trim();

    const cantidadFinal =
      cantidadModelo != null
        ? cantidadNormalizada(cantidadModelo)
        : inf.cantidad_sugerida != null && inf.confianza_cantidad !== 'baja'
          ? inf.cantidad_sugerida
          : null;

    const confianzaFinal: ConfianzaCantidad =
      cantidadModelo != null
        ? 'alta'
        : inf.confianza_cantidad;

    out.push({
      descripcion,
      cantidad: cantidadFinal != null ? cantidadFinal : null,
      clave_unidad: str(o.clave_unidad).trim(),
      valor_unitario: valorRaw,
      importe: str(o.importe).trim(),
      cantidad_sugerida: inf.cantidad_sugerida,
      confianza_cantidad: confianzaFinal,
    });
  }
  return out;
}

function parseFacturaRecord(raw: Record<string, unknown>): FacturaJson {
  return {
    proveedor: typeof raw.proveedor === 'string' ? raw.proveedor : '',
    numero_factura:
      typeof raw.numero_factura === 'string' ? raw.numero_factura : '',
    fecha: typeof raw.fecha === 'string' ? raw.fecha : '',
    total: typeof raw.total === 'string' ? raw.total : '',
    items: parseItems(raw.items),
  };
}

function extraerJsonFactura(text: string): FacturaJson {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/im);
  const candidato = fence ? fence[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(candidato) as Record<string, unknown>;
    return parseFacturaRecord(parsed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<
        string,
        unknown
      >;
      return parseFacturaRecord(parsed);
    }
    throw new Error('JSON inválido');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearer =
      authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!bearer) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
    const anonKey = (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      ''
    ).trim();

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Configuración del servidor incompleta.' },
        { status: 500 }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(bearer);

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'El servidor no tiene configurada la API de OpenAI.' },
        { status: 500 }
      );
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json(
        { error: 'El cuerpo de la petición no es JSON válido.' },
        { status: 400 }
      );
    }

    const imageBase64 = body.imageBase64?.trim();
    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No se recibió ninguna imagen.' },
        { status: 400 }
      );
    }

    const mime =
      body.mimeType?.trim() && body.mimeType.startsWith('image/')
        ? body.mimeType
        : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${imageBase64}`;

    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT_USUARIO },
              {
                type: 'image_url',
                image_url: { url: dataUrl, detail: 'high' },
              },
            ],
          },
        ],
      }),
    });

    if (!openaiRes.ok) {
      let detalle = 'Error desconocido';
      try {
        const errJson = (await openaiRes.json()) as {
          error?: { message?: string };
        };
        detalle = errJson.error?.message ?? detalle;
      } catch {
        detalle = await openaiRes.text();
      }
      return NextResponse.json(
        {
          error: `No se pudo analizar la imagen con OpenAI: ${detalle}`,
        },
        { status: 502 }
      );
    }

    const completion = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== 'string') {
      return NextResponse.json(
        { error: 'OpenAI no devolvió texto reconocible.' },
        { status: 502 }
      );
    }

    let datos: FacturaJson;
    try {
      datos = extraerJsonFactura(rawContent);
    } catch {
      return NextResponse.json(
        { error: 'No se pudo interpretar la respuesta de OpenAI como JSON.' },
        { status: 502 }
      );
    }

    return NextResponse.json(datos);
  } catch (e) {
    console.error('analizar-factura:', e);
    return NextResponse.json(
      { error: 'Error interno al analizar la factura.' },
      { status: 500 }
    );
  }
}
