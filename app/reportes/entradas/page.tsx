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

type Entrada = {
  id: string | number;
  producto: string | null;
  cantidad: number | null;
  unidad: string | null;
  origen: string | null;
  creado_en: string | null;
};

export default function ReporteEntradasPage() {
  const [loading, setLoading] = useState(true);
  const [entradas, setEntradas] = useState<Entrada[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('entradas')
          .select('id, producto, cantidad, unidad, origen, creado_en')
          .order('creado_en', { ascending: false })
          .limit(100);

        if (error) throw error;
        setEntradas((data as Entrada[]) ?? []);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error cargando entradas');
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  return (
    <ReporteLayout title="Reporte de Entradas">
      {loading ? (
        <div style={reporteLoadingBox}>Cargando...</div>
      ) : entradas.length === 0 ? (
        <div style={reporteEmptyBox}>No hay entradas registradas.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={reporteTheadRow}>
                <th style={reporteTh}>Producto</th>
                <th style={reporteTh}>Cantidad</th>
                <th style={reporteTh}>Origen</th>
                <th style={reporteTh}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    background: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  }}
                >
                  <td style={reporteTd}>{item.producto || '—'}</td>
                  <td style={reporteTd}>
                    {`${item.cantidad ?? 0} ${item.unidad || ''}`.trim()}
                  </td>
                  <td style={reporteTd}>{item.origen || '—'}</td>
                  <td style={reporteTd}>{formatDate(item.creado_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReporteLayout>
  );
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX');
}
