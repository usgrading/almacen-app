'use client';

import { useEffect, useState } from 'react';
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
  minimo?: number | null;
  maximo?: number | null;
};

export default function ReporteInventarioMXPage() {
  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('inventario')
          .select('id, producto, cantidad_actual, unidad, ubicacion, minimo, maximo')
          .eq('origen', 'MX')
          .order('producto', { ascending: true });

        if (error) throw error;
        setInventario((data as InventarioItem[]) ?? []);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error cargando inventario MX');
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  return (
    <ReporteLayout
      title={
        <>
          Inventario{' '}
          <span className="fi fi-mx" style={{ marginLeft: 8, fontSize: '1.15em' }} aria-hidden />
        </>
      }
    >
      {loading ? (
        <div style={reporteLoadingBox}>Cargando...</div>
      ) : inventario.length === 0 ? (
        <div style={reporteEmptyBox}>
          No hay inventario{' '}
          <span className="fi fi-mx" style={{ marginLeft: 4, fontSize: '1.1em' }} aria-hidden />.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={reporteTheadRow}>
                <th style={reporteTh}>Producto</th>
                <th style={reporteTh}>Cantidad</th>
                <th style={reporteTh}>Unidad</th>
                <th style={reporteTh}>Ubicación</th>
                <th style={reporteTh}>Mínimo</th>
                <th style={reporteTh}>Máximo</th>
              </tr>
            </thead>
            <tbody>
              {inventario.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    background: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  }}
                >
                  <td style={reporteTd}>{item.producto || '—'}</td>
                  <td style={reporteTd}>{item.cantidad_actual ?? 0}</td>
                  <td style={reporteTd}>{item.unidad || '—'}</td>
                  <td style={reporteTd}>{item.ubicacion || '—'}</td>
                  <td style={reporteTd}>{item.minimo ?? '—'}</td>
                  <td style={reporteTd}>{item.maximo ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReporteLayout>
  );
}
