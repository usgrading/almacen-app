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

const PROMPT_SISTEMA = `Eres un extractor de datos para facturas mexicanas (CFDI, tickets). Responde ÚNICAMENTE con un objeto JSON válido UTF-8. Sin markdown, sin bloques de código, sin texto antes ni después.
La precisión de la tabla de conceptos es crítica: cada campo numérico debe salir de la celda correcta de SU fila, no de otra fila ni de totales globales.`;

const PROMPT_USUARIO = `FACTURA MEXICANA — TABLA DE CONCEPTOS (obligatorio)

PASO A — Encabezados
1) Localiza la fila de ENCABEZADOS de la tabla de conceptos (títulos visibles: puede decir Código, No., Descripción, Clave/Cve Unidad, Cantidad, Valor unitario, Importe, etc.).
2) Determina el ORDEN de columnas de IZQUIERDA A DERECHA según esa fila. Memoriza qué columna es Cantidad, cuál Valor unitario y cuál Importe (pueden tener distintos nombres pero una sola columna por concepto).

PASO B — Por cada renglón de producto/servicio (solo filas de detalle)
3) Recorre SOLO UNA FILA horizontal a la vez, de izquierda a derecha.
4) Para esa fila, copia cada valor SOLO desde la celda que está bajo el encabezado correspondiente:
   - codigo → celda bajo "Código" / No. parte / similar; si no existe columna, "".
   - descripcion → celda bajo Descripción / Concepto (solo texto del artículo; NO pegar cantidades ni precios en este string).
   - clave_unidad → celda bajo ClaveUnidad / Cve Unidad (ej. H87); si no hay, "".
   - cantidad → número EXACTO de la columna Cantidad de ESTA fila (no uses cantidad de otra fila ni totales).
   - valor_unitario → SOLO el número de la columna Valor unitario / Valor Unitario de ESTA fila (precio por unidad sin IVA).
   - importe → SOLO el número de la columna Importe / Importe línea de ESTA fila (subtotal de línea, sin confundir con columnas de impuesto).

PROHIBIDO
- NO mezclar números leyendo “en vertical” (columna completa como si fuera un ítem).
- NO usar el total del documento, subtotal global, ni montos del bloque de impuestos como valor_unitario o importe de un ítem.
- NO incluir como ítem las filas que sean solo impuestos: IVA, Traslado, Retención, IEPS, ISR, filas con solo tasa (16%, 8%), solo "002"/"003", solo texto fiscal sin producto.
- Si una celda es ilegible o ambigua: pon cantidad null y valor_unitario/importe como "" para ese ítem; NO inventes números por inferencia.

COHERENCIA (validación mental antes de cerrar cada ítem)
- Para cada ítem de producto: cantidad × valor_unitario debe ser aproximadamente igual al importe de la MISMA fila (misma moneda). Si no cuadra, revisa que no hayas tomado celdas de otra fila o de impuestos.

ESTRUCTURA JSON EXACTA (única salida):
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

Si no hay tabla de conceptos legible, "items": []. Montos como string como en la imagen.`;

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
      } else if (!tripletaLineaCoherente(cantidadFinal, vu, imp)) {
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

/** Solo parsea JSON del modelo; sin parseItems. Para logs y para encadenar parseFacturaRecord. */
function extraerObjetoJsonModelo(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/im);
  const candidato = fence ? fence[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(candidato) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error('JSON raíz no es objeto');
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<
        string,
        unknown
      >;
      return parsed;
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

    /** Para tablas CFDI densas, suele mejorar OPENAI_MODEL=gpt-4o */
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

    console.log(
      '[analizar-factura] Texto crudo modelo (longitud=%s):',
      rawContent.length,
      rawContent.length > 12000
        ? `${rawContent.slice(0, 12000)}\n… [truncado]`
        : rawContent
    );

    let objetoModelo: Record<string, unknown>;
    try {
      objetoModelo = extraerObjetoJsonModelo(rawContent);
    } catch {
      return NextResponse.json(
        { error: 'No se pudo interpretar la respuesta de OpenAI como JSON.' },
        { status: 502 }
      );
    }

    console.log(
      '[analizar-factura] JSON objeto del modelo ANTES de parseFacturaRecord / parseItems:',
      JSON.stringify(objetoModelo, null, 2)
    );

    const datos = parseFacturaRecord(objetoModelo);

    return NextResponse.json(datos);
  } catch (e) {
    console.error('analizar-factura:', e);
    return NextResponse.json(
      { error: 'Error interno al analizar la factura.' },
      { status: 500 }
    );
  }
}
