'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ensureMiOrganizationId, getMiOrganizationId } from '@/lib/organization';
import {
  ReporteLayout,
  reporteEmptyBox,
  reporteLoadingBox,
  reporteTd,
  reporteTh,
  reporteTheadRow,
} from '@/components/ReporteLayout';

type Salida = {
  id: string | number;
  producto: string | null;
  cantidad: number | null;
  unidad: string | null;
  origen: string | null;
  destino: string | null;
  created_at: string | null;
};

export default function ReporteSalidasPage() {
  const [loading, setLoading] = useState(true);
  const [salidas, setSalidas] = useState<Salida[]>([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        await ensureMiOrganizationId(supabase);
        const orgId = await getMiOrganizationId(supabase);
        if (!orgId) {
          setSalidas([]);
          return;
        }

        const { data, error } = await supabase
          .from('salidas')
          .select('id, producto, cantidad, unidad, origen, destino, created_at')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;
        setSalidas((data as Salida[]) ?? []);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error cargando salidas');
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  return (
    <ReporteLayout title="Reporte de Salidas">
      {loading ? (
        <div style={reporteLoadingBox}>Cargando...</div>
      ) : salidas.length === 0 ? (
        <div style={reporteEmptyBox}>No hay salidas registradas.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={reporteTheadRow}>
                <th style={reporteTh}>Producto</th>
                <th style={reporteTh}>Cantidad</th>
                <th style={reporteTh}>Origen</th>
                <th style={reporteTh}>Destino</th>
                <th style={reporteTh}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {salidas.map((item, index) => (
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
                  <td style={reporteTd}>{item.destino || '—'}</td>
                  <td style={reporteTd}>{formatDate(item.created_at)}</td>
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
