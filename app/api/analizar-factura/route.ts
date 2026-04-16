import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

type Body = {
  imageBase64?: string;
  mimeType?: string;
};

type FacturaJson = {
  proveedor: string;
  numero_factura: string;
  fecha: string;
  total: string;
};

const PROMPT_USUARIO = `Analiza esta imagen de factura y extrae la información. Responde únicamente con JSON válido usando exactamente esta estructura:
{
  "proveedor": "",
  "numero_factura": "",
  "fecha": "",
  "total": ""
}
Si algún dato no aparece claramente, déjalo vacío.`;

function parseFacturaRecord(raw: Record<string, unknown>): FacturaJson {
  return {
    proveedor: typeof raw.proveedor === 'string' ? raw.proveedor : '',
    numero_factura:
      typeof raw.numero_factura === 'string' ? raw.numero_factura : '',
    fecha: typeof raw.fecha === 'string' ? raw.fecha : '',
    total: typeof raw.total === 'string' ? raw.total : '',
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
        max_tokens: 800,
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
