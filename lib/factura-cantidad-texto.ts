export type ConfianzaCantidad = 'alta' | 'media' | 'baja';

export type InferenciaCantidadTicket = {
  cantidad_sugerida: number | null;
  confianza_cantidad: ConfianzaCantidad;
};

function parseCantidadEntera(valor: string): number | null {
  const n = Number.parseInt(valor.replace(/\s/g, '').replace(',', ''), 10);
  if (!Number.isFinite(n) || n <= 0 || n > 999_999) return null;
  return n;
}

/** Evita tomar años tipo 2024 como cantidad cuando aparecen solos. */
function esProbableAnio(n: number): boolean {
  return n >= 1900 && n <= 2035;
}

type Hallazgo = { n: number; peso: number };

/**
 * Extrae cantidad desde texto tipo OCR/línea de ticket (descripción de ítem).
 * Prioriza patrones explícitos (cantidad, qty, piezas…) sobre formas cortas (x2, 2 x).
 */
export function inferirCantidadDesdeTextoTicket(
  texto: string
): InferenciaCantidadTicket {
  const t = texto.trim();
  if (!t) {
    return { cantidad_sugerida: null, confianza_cantidad: 'baja' };
  }

  const lower = t.toLowerCase();
  const hallazgos: Hallazgo[] = [];

  const pushAlta = (raw: string) => {
    const n = parseCantidadEntera(raw);
    if (n != null && !esProbableAnio(n)) hallazgos.push({ n, peso: 3 });
  };

  const pushMedia = (raw: string) => {
    const n = parseCantidadEntera(raw);
    if (n != null && !esProbableAnio(n)) hallazgos.push({ n, peso: 2 });
  };

  const patronesAlta: RegExp[] = [
    /(?:^|[\s,.;])(?:cantidad|qty|quantity)\s*[:\s.-]*(\d+)/gi,
    /(?:^|[\s,.;])cant\.?\s*[:\s.-]*(\d+)/gi,
    /(\d+)\s*(?:pcs|piezas?|pzas?|unidades?|und\.?)\b/gi,
    /(\d+)\s*(?:pz|ud|uds)\b/gi,
  ];

  const patronesMedia: RegExp[] = [/\bx\s*(\d+)\b/gi, /\b(\d+)\s*x\b/gi];

  for (const re of patronesAlta) {
    for (const m of lower.matchAll(re)) {
      if (m[1]) pushAlta(m[1]);
    }
  }

  for (const re of patronesMedia) {
    for (const m of lower.matchAll(re)) {
      if (m[1]) pushMedia(m[1]);
    }
  }

  if (hallazgos.length === 0) {
    return { cantidad_sugerida: null, confianza_cantidad: 'baja' };
  }

  const distintos = new Set(hallazgos.map((h) => h.n));
  if (distintos.size > 1) {
    return { cantidad_sugerida: null, confianza_cantidad: 'baja' };
  }

  const n = hallazgos[0].n;
  const maxPeso = Math.max(...hallazgos.map((h) => h.peso));

  if (maxPeso >= 3) {
    return { cantidad_sugerida: n, confianza_cantidad: 'alta' };
  }

  return { cantidad_sugerida: n, confianza_cantidad: 'media' };
}
