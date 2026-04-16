"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FilaConId = { id: string | number };

export function useSeleccionFilas<T extends FilaConId>(filas: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const idsKey = useMemo(
    () => filas.map((f) => String(f.id)).sort().join("|"),
    [filas]
  );

  useEffect(() => {
    const allowed = new Set(filas.map((f) => String(f.id)));
    setSelected((prev) => {
      const next = new Set<string>();
      let changed = false;
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      });
      if (next.size !== prev.size) changed = true;
      return changed ? next : prev;
    });
  }, [idsKey]);

  const toggle = useCallback((id: string | number) => {
    const s = String(id);
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (filas.length === 0) return new Set();
      const allSelected = filas.every((f) => prev.has(String(f.id)));
      if (allSelected) return new Set();
      return new Set(filas.map((f) => String(f.id)));
    });
  }, [filas]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const allSelected =
    filas.length > 0 && filas.every((f) => selected.has(String(f.id)));
  const count = selected.size;

  return { selected, toggle, toggleAll, clear, allSelected, count };
}
