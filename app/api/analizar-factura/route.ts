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
  precio_unitario: string;
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

const PROMPT_USUARIO = `Analiza esta imagen de factura y extrae la información. Responde únicamente con JSON válido, sin texto antes ni después, usando exactamente esta estructura:
{
  "proveedor": "",
  "numero_factura": "",
  "fecha": "",
  "total": "",
  "items": [
    {
      "descripcion": "",
      "cantidad": null,
      "precio_unitario": "",
      "importe": ""
    }
  ]
}

Reglas:
- En cada ítem, el campo "descripcion" debe incluir tal como se ve en la línea del ticket todo texto útil para identificar cantidad (ej. "x2", "qty 3", "2 piezas") además del nombre del producto.
- Para "cantidad": número entero positivo solo si la cantidad por línea es clara en la imagen; si no es clara o no aparece, usa null (no inventes cantidad por defecto).
- Si no encuentras precio_unitario o importe para una línea, déjalos como "".
- Extrae todos los ítems o conceptos del detalle de compra (piezas, productos, servicios, refacciones).
- Ignora firmas, sellos, notas al pie, garantías, texto decorativo o letras pequeñas que no sean líneas del detalle de productos.
- Si solo hay un concepto, devuelve un array "items" con un solo objeto.
- Si no hay líneas de detalle claras, devuelve "items": [].
- Los valores de precio_unitario e importe como string (pueden incluir símbolo de moneda o no).`;

function str(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

function parseCantidad(v: unknown): number | null {
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

function parseItems(raw: unknown): ItemFacturaJson[] {
  if (!Array.isArray(raw)) return [];
  const out: ItemFacturaJson[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const descripcion = str(o.descripcion).trim();
    const inf = inferirCantidadDesdeTextoTicket(descripcion);
    out.push({
      descripcion,
      cantidad: parseCantidad(o.cantidad),
      precio_unitario: str(o.precio_unitario).trim(),
      importe: str(o.importe).trim(),
      cantidad_sugerida: inf.cantidad_sugerida,
      confianza_cantidad: inf.confianza_cantidad,
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
