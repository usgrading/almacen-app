/** Lee un archivo de imagen y devuelve base64 (sin prefijo data:) y mime type. */
export function archivoImagenABase64(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        reject(new Error('No se pudo leer la imagen'));
        return;
      }
      resolve({ mimeType: match[1], base64: match[2] });
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/** Convierte texto de fecha (ISO o DD/MM/YYYY) a YYYY-MM-DD para input type="date". */
export function fechaTextoAInputDate(valor: string): string {
  const t = valor.trim();
  if (!t) return '';
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const mo = parseInt(dmy[2], 10);
    let y = parseInt(dmy[3], 10);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${y}-${pad(mo)}-${pad(d)}`;
  }
  return '';
}

/** Normaliza total monetario a string con 2 decimales para costoTotal. */
export function totalTextoACostoTotal(raw: string): string {
  const t = raw.replace(/\s/g, '').replace(/[$€]/g, '');
  if (!t) return '';
  let normalized = t;
  if (t.includes(',') && !t.includes('.')) {
    normalized = t.replace(',', '.');
  } else if (t.includes('.') && t.includes(',')) {
    const lastComma = t.lastIndexOf(',');
    const lastDot = t.lastIndexOf('.');
    if (lastComma > lastDot) {
      normalized = t.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = t.replace(/,/g, '');
    }
  }
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2);
}

/** Interpreta el mismo formato monetario que totalTextoACostoTotal y devuelve número o NaN. */
export function textoMontoANumero(raw: string): number {
  const s = totalTextoACostoTotal(raw);
  if (!s) return Number.NaN;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : Number.NaN;
}
