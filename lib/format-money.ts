/**
 * Formato fijo a 2 decimales para mostrar montos (ej. inventario, entradas).
 */
export function formatoDosDecimales(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}
