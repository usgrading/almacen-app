import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ConfianzaCantidad } from '@/lib/factura-cantidad-texto';
import {
  esLineaFiscalOImpuesto,
  montosDesdeStrings,
  tripletaLineaCoherente,
} from '@/lib/factura-tabla-mx';

export const maxDuration = 60;

type Body = {
  imageBase64?: string;
  mimeType?: string;
};

export type ItemFacturaJson = {
  codigo: string;
  descripcion: string;
  cantidad: number | null;
  clave_unidad: string;
  valor_unitario: string;
  importe: string;
  /** Marcado en servidor si la fila no cuadra o faltan datos obligatorios de tabla. */
  ambiguous_item: boolean;
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

const PROMPT_SISTEMA = `Eres un extractor especializado en facturas y tickets de compra (México CFDI y similares).
Debes responder con UN SOLO objeto JSON válido (UTF-8), sin markdown ni texto fuera del JSON.
No inventes renglones: cada ítem debe corresponder a una fila real de producto/servicio en la tabla de conceptos.`;

const PROMPT_USUARIO = `INSTRUCCIONES DE LECTURA (obligatorio)

1) TABLA POR RENGLÓN (horizontal)
   - Localiza la FILA DE ENCABEZADOS de la tabla de conceptos (puede decir Código, Descripción, ClaveUnidad/Cve Unidad, Cantidad, Valor unitario, Importe, etc.).
   - Para cada PRODUCTO o SERVICIO, lee UNA SOLA FILA DE DATOS de IZQUIERDA A DERECHA en esa misma línea.
   - NO agrupes números mezclando celdas de filas distintas.
   - NO leas columnas “en vertical” como si fueran un solo ítem.

2) MAPEO DE COLUMNAS (ajusta al texto real del encabezado)
   - codigo → columna Código / No parte / SKU si existe; si no, "".
   - descripcion → SOLO el texto de concepto/descripción del artículo (una celda), sin pegar cantidades ni precios en la misma cadena.
   - clave_unidad → ClaveUnidad / Cve Unidad (ej. H87, MTR); si no hay, "".
   - cantidad → número de la columna Cantidad de ESA fila (entero o decimal según la factura).
   - valor_unitario → SOLO el valor de la columna Valor unitario / Valor Unitario de ESA fila (precio por unidad SIN IVA).
   - importe → SOLO el importe de línea / subtotal de ESA fila (columna Importe/Importe línea), NO el total del documento ni montos de impuesto.

3) LÍNEAS QUE NO SON ÍTEMS (no las incluyas en "items")
   - Filas de Traslado de impuestos, IVA, IEPS, ISR, retenciones.
   - Filas que solo muestran tasa 16%, 8%, texto “002”, “IVA”, subtotales de impuesto debajo de un renglón.
   - Leyendas, firmas, totales globales aislados sin fila de producto.

4) COHERENCIA
   - Para cada ítem, los tres valores cantidad, valor_unitario e importe deben venir de LA MISMA FILA.
   - En una factura correcta: cantidad × valor_unitario ≈ importe (misma moneda, sin mezclar impuestos).

ESTRUCTURA JSON EXACTA:
{
  "proveedor": "",
  "numero_factura": "",
  "fecha": "",
  "total": "",
  "items": [
    {
      "codigo": "",
      "descripcion": "",
      "clave_unidad": "",
      "cantidad": null,
      "valor_unitario": "",
      "importe": ""
    }
  ]
}

Formato: cantidad numérica o null; demás campos string. Montos como en la imagen (pueden llevar $, comas o puntos).
Si no hay tabla de conceptos clara, devuelve "items": [].`;

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

    if (esLineaFiscalOImpuesto(descripcion)) continue;

    const codigo = str(o.codigo).trim();
    const cantidadModelo = parseCantidad(o.cantidad);
    const valorRaw =
      str(o.valor_unitario).trim() ||
      str((o as Record<string, unknown>).precio_unitario).trim();
    const impRaw = str(o.importe).trim();

    const cantidadFinal =
      cantidadModelo != null ? cantidadNormalizada(cantidadModelo) : null;

    const { vu, imp } = montosDesdeStrings(valorRaw, impRaw);
    let ambiguous_item = false;

    const tieneDescripcionProducto = descripcion.length > 0;
    const tieneTriplesMontos = vu != null && imp != null;

    if (tieneDescripcionProducto) {
      if (cantidadFinal == null || !tieneTriplesMontos) {
        ambiguous_item = true;
      } else if (
        !tripletaLineaCoherente(cantidadFinal, vu, imp)
      ) {
        ambiguous_item = true;
      }
    }

    const confianzaFinal: ConfianzaCantidad =
      cantidadModelo != null ? 'alta' : 'baja';

    out.push({
      codigo,
      descripcion,
      cantidad: cantidadFinal,
      clave_unidad: str(o.clave_unidad).trim(),
      valor_unitario: valorRaw,
      importe: impRaw,
      ambiguous_item,
      cantidad_sugerida: null,
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
        temperature: 0,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT_SISTEMA },
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
