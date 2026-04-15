'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ReporteLayout,
  reporteEmptyBox,
  reporteLoadingBox,
  reporteTd,
  reporteTh,
  reporteTheadRow,
} from '@/components/ReporteLayout';

type InventarioItem = {
  id: string | number;
  producto: string | null;
  cantidad_actual: number | null;
  unidad: string | null;
  ubicacion: string | null;
  origen: string | null;
  minimo?: number | null;
  maximo?: number | null;
};

const subtituloAlerta = (
  <>
    Lista productos cuya cantidad actual está por debajo del <strong>mínimo</strong> definido en
    la <strong>primera captura en Entradas</strong> (MX o USA), donde se eligieron mínimo y máximo
    y se guardaron en inventario.
  </>
);

export default function ReporteAlertaInventarioPage() {
  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('inventario')
          .select(
            'id, producto, cantidad_actual, unidad, ubicacion, origen, minimo, maximo'
          )
          .order('producto', { ascending: true });

        if (error) throw error;
        setInventario((data as InventarioItem[]) ?? []);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error cargando inventario');
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  const alertas = useMemo(() => {
    return inventario.filter((item) => {
      const min = item.minimo;
      const qty = Number(item.cantidad_actual ?? 0);
      if (min === null || min === undefined) return false;
      const minNum = Number(min);
      if (!Number.isFinite(minNum) || minNum <= 0) return false;
      return qty < minNum;
    });
  }, [inventario]);

  return (
    <ReporteLayout title="Alerta de inventario" subtitle={subtituloAlerta}>
      {loading ? (
        <div style={reporteLoadingBox}>Cargando...</div>
      ) : alertas.length === 0 ? (
        <div style={reporteEmptyBox}>
          No hay alertas: ningún producto queda bajo el mínimo guardado desde la primera entrada,
          o aún no hay productos dados de alta con mínimo/máximo en Entradas.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={reporteTheadRow}>
                <th style={reporteTh}>Producto</th>
                <th style={reporteTh}>Origen</th>
                <th style={reporteTh}>Cantidad actual</th>
                <th style={reporteTh}>Mínimo</th>
                <th style={reporteTh}>Máximo</th>
                <th style={reporteTh}>Unidad</th>
                <th style={reporteTh}>Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    background: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  }}
                >
                  <td style={reporteTd}>{item.producto || '—'}</td>
                  <td style={reporteTd}>{item.origen || '—'}</td>
                  <td style={{ ...reporteTd, fontWeight: 700, color: '#B45309' }}>
                    {item.cantidad_actual ?? 0}
                  </td>
                  <td style={reporteTd}>{item.minimo ?? '—'}</td>
                  <td style={reporteTd}>{item.maximo ?? '—'}</td>
                  <td style={reporteTd}>{item.unidad || '—'}</td>
                  <td style={reporteTd}>{item.ubicacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReporteLayout>
  );
}
