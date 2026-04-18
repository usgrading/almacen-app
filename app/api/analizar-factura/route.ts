import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { ConfianzaCantidad } from '@/lib/factura-cantidad-texto';
import { esLineaFiscalOImpuesto } from '@/lib/factura-tabla-mx';

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
  valor_unitario: string | null;
  importe: string | null;
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
Prioridad absoluta: evitar "column shifting" — cantidad, valor_unitario e importe SOLO de celdas alineadas bajo sus encabezados en LA MISMA fila horizontal; nunca números de filas inferiores (IVA, traslados, totales).`;

const PROMPT_USUARIO = `FACTURA MEXICANA — TABLA DE CONCEPTOS

REGLAS CRÍTICAS (obligatorias)

1) cantidad, valor_unitario e importe SOLO pueden tomarse de la MISMA FILA horizontal (una línea de detalle). Prohibido mezclar celdas de filas distintas.

2) PROHIBIDO inferir o "corregir" valores: no multipliques, no dividas, no ajustes cantidades ni montos para que cuadren. Solo transcribe lo visible en cada celda.

3) PROHIBIDO usar números que pertenezcan a filas inferiores o posteriores: bloques de IVA, traslado de impuestos, retenciones, leyendas de totales o subtotales globales.

4) Si en una fila hay varios números:
   - valor_unitario = únicamente el número en la celda DIRECTAMENTE bajo el encabezado de columna equivalente a "Valor unitario" / "Valor Unitario" / "P. Unitario" (según la factura).
   - importe = únicamente el número en la celda DIRECTAMENTE bajo el encabezado de columna equivalente a "Importe" / "Importe línea".
   No uses para VU el número que está bajo Importe ni viceversa.

5) Si la alineación visual entre columnas no es clara (no sabes qué número va bajo qué encabezado):
   cantidad: null
   valor_unitario: null
   importe: null
   ambiguous_item: true

6) IMPORTANTE — Solo lectura OCR de la fila:
   NO reconstruyas relaciones matemáticas. NO compruebes ni corrijas usando cantidad × valor_unitario = importe. Copia texto/números tal como aparecen en la celda.

7) Ignora por completo (no los incluyas en "items"):
   - líneas de IVA, traslado, retención
   - líneas donde el contenido destacado sea un porcentaje (%)
   - líneas de totales / subtotales del documento (salvo que sean filas de detalle de producto con sus columnas propias)

ANTI "COLUMN SHIFTING"
- Primero identifica la fila de ENCABEZADOS y el orden izquierda→derecha.
- Por cada ítem de producto, recorre solo esa fila; asigna cada número a la columna cuyo título está exactamente arriba.

ESTRUCTURA JSON EXACTA (única salida). Cada ítem debe incluir ambiguous_item (boolean):
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
      "valor_unitario": null,
      "importe": null,
      "ambiguous_item": false
    }
  ]
}

Si no hay tabla de conceptos legible: "items": [].
Para montos transcritos con certeza, usa string con el formato visible (comas, puntos, símbolo $ si aplica). Si no hay certeza de columna, usa null como arriba.`;

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

/** Monto como string si hay dígitos legibles; null si viene null/vacío (ambigüedad). */
function strMontoNullable(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = str(v).trim();
  return s === '' ? null : s;
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
      strMontoNullable(o.valor_unitario) ??
      strMontoNullable((o as Record<string, unknown>).precio_unitario);
    const impRaw = strMontoNullable(o.importe);

    const cantidadFinal =
      cantidadModelo != null ? cantidadNormalizada(cantidadModelo) : null;

    const modeloAmbiguous = o.ambiguous_item === true;
    let ambiguous_item = modeloAmbiguous;

    const tieneDescripcionProducto = descripcion.length > 0;
    if (tieneDescripcionProducto) {
      if (cantidadFinal == null || valorRaw == null || impRaw == null) {
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

    /** Tablas CFDI: `gpt-4o` prioriza lectura visual; para ahorrar costo: `OPENAI_MODEL=gpt-4o-mini` o cambiar el default abajo a `gpt-4o-mini`. */
    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o';

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
