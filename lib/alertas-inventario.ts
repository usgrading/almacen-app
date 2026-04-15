/** Misma regla que en /reportes/alerta-inventario: stock bajo el mínimo definido. */

export type InventarioAlertaRow = {
  cantidad_actual?: number | null;
  minimo?: number | null;
};

export function esAlertaBajoMinimo(item: InventarioAlertaRow): boolean {
  const min = item.minimo;
  const qty = Number(item.cantidad_actual ?? 0);
  if (min === null || min === undefined) return false;
  const minNum = Number(min);
  if (!Number.isFinite(minNum) || minNum <= 0) return false;
  return qty < minNum;
}

export function filtrarAlertasInventario<T extends InventarioAlertaRow>(items: T[]): T[] {
  return items.filter(esAlertaBajoMinimo);
}

export function contarAlertasInventario(items: InventarioAlertaRow[]): number {
  return filtrarAlertasInventario(items).length;
}
