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
import { ReporteExportarExcelButton } from '@/components/ReporteExportarExcelButton';
import { exportarAExcel } from '@/lib/export-excel';

type InventarioItem = {
  id: string | number;
  producto: string | null;
  cantidad_actual: number | null;
  unidad: string | null;
  ubicacion: string | null;
  minimo?: number | null;
  maximo?: number | null;
};

export default function ReporteInventarioUSAPage() {
  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('inventario')
          .select('id, producto, cantidad_actual, unidad, ubicacion, minimo, maximo')
          .eq('origen', 'USA')
          .order('producto', { ascending: true });

        if (error) throw error;
        setInventario((data as InventarioItem[]) ?? []);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error cargando inventario USA');
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  const exportar = () => {
    const filas = inventario.map((item) => ({
      producto: item.producto ?? '',
      cantidad_actual: item.cantidad_actual ?? 0,
      unidad: item.unidad ?? '',
      ubicacion: item.ubicacion ?? '',
      minimo: item.minimo ?? '',
      maximo: item.maximo ?? '',
    }));
    exportarAExcel(
      filas,
      [
        { clave: 'producto', encabezado: 'Producto' },
        { clave: 'cantidad_actual', encabezado: 'Cantidad' },
        { clave: 'unidad', encabezado: 'Unidad' },
        { clave: 'ubicacion', encabezado: 'Ubicación' },
        { clave: 'minimo', encabezado: 'Mínimo' },
        { clave: 'maximo', encabezado: 'Máximo' },
      ],
      'inventario-usa',
      'Inventario USA'
    );
  };

  return (
    <ReporteLayout
      title={
        <>
          Inventario{' '}
          <span className="fi fi-us" style={{ marginLeft: 8, fontSize: '1.15em' }} aria-hidden />
        </>
      }
    >
      <>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: 12,
            padding: '0 4px',
          }}
        >
          <ReporteExportarExcelButton
            disabled={loading || inventario.length === 0}
            onClick={exportar}
          />
        </div>
        {loading ? (
        <div style={reporteLoadingBox}>Cargando...</div>
      ) : inventario.length === 0 ? (
        <div style={reporteEmptyBox}>
          No hay inventario{' '}
          <span className="fi fi-us" style={{ marginLeft: 4, fontSize: '1.1em' }} aria-hidden />.
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
      </>
    </ReporteLayout>
  );
}
