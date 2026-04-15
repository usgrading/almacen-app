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
import { filtrarAlertasInventario } from '@/lib/alertas-inventario';
import { ReporteExportarExcelButton } from '@/components/ReporteExportarExcelButton';
import { exportarAExcel } from '@/lib/export-excel';

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

  const alertas = useMemo(
    () => filtrarAlertasInventario(inventario),
    [inventario]
  );

  const exportar = () => {
    const filas = alertas.map((item) => ({
      producto: item.producto ?? '',
      origen: item.origen ?? '',
      cantidad_actual: item.cantidad_actual ?? 0,
      minimo: item.minimo ?? '',
      maximo: item.maximo ?? '',
      unidad: item.unidad ?? '',
      ubicacion: item.ubicacion ?? '',
    }));
    exportarAExcel(
      filas,
      [
        { clave: 'producto', encabezado: 'Producto' },
        { clave: 'origen', encabezado: 'Origen' },
        { clave: 'cantidad_actual', encabezado: 'Cantidad actual' },
        { clave: 'minimo', encabezado: 'Mínimo' },
        { clave: 'maximo', encabezado: 'Máximo' },
        { clave: 'unidad', encabezado: 'Unidad' },
        { clave: 'ubicacion', encabezado: 'Ubicación' },
      ],
      'alertas',
      'Alertas'
    );
  };

  return (
    <ReporteLayout title="Alerta de inventario" subtitle={subtituloAlerta}>
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
            disabled={loading || alertas.length === 0}
            onClick={exportar}
          />
        </div>
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
      </>
    </ReporteLayout>
  );
}
