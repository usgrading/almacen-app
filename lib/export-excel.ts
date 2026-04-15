import * as XLSX from "xlsx";

export type ColumnaExcel = { clave: string; encabezado: string };

/** Fecha legible (solo día), alineada con tablas en español. */
export function formatearFechaExcel(value: unknown): string {
  if (value == null || value === "") return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX");
}

function celdaExcel(val: unknown): string | number | boolean {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return val;
  return String(val);
}

/**
 * Genera y descarga un .xlsx a partir de filas y definición de columnas.
 * `nombreArchivoBase` sin extensión (ej: entradas → entradas.xlsx).
 */
export function exportarAExcel(
  filas: Record<string, unknown>[],
  columnas: ColumnaExcel[],
  nombreArchivoBase: string,
  nombreHoja: string = "Datos"
): void {
  if (filas.length === 0 || columnas.length === 0) return;

  const encabezados = columnas.map((c) => c.encabezado);
  const cuerpo = filas.map((fila) =>
    columnas.map((c) => celdaExcel(fila[c.clave]))
  );
  const aoa = [encabezados, ...cuerpo];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  const hoja = nombreHoja.trim().slice(0, 31) || "Datos";
  XLSX.utils.book_append_sheet(wb, ws, hoja);

  const base = nombreArchivoBase.replace(/\.xlsx$/i, "");
  const nombre = `${base}.xlsx`;
  XLSX.writeFile(wb, nombre);
}
