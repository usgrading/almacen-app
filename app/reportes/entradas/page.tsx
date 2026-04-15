'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLogo } from '@/components/PageLogo';
import { supabase } from '@/lib/supabase';

type Entrada = {
  id: string | number;
  producto: string | null;
  cantidad: number | null;
  unidad: string | null;
  origen: string | null;
  creado_en: string | null;
};

export default function ReporteEntradasPage() {
  const router = useRouter();
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
    <main style={styles.page}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button type="button" onClick={() => router.push('/reportes')} style={styles.backButton}>
          ← Reportes
        </button>
        <PageLogo />
        <h1 style={styles.title}>Reporte de Entradas</h1>

        {loading ? (
          <p style={{ color: '#64748B' }}>Cargando...</p>
        ) : entradas.length === 0 ? (
          <div style={styles.emptyBox}>No hay entradas registradas.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Cantidad</th>
                  <th style={styles.th}>Origen</th>
                  <th style={styles.th}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {entradas.map((item, index) => (
                  <tr key={item.id} style={{ background: index % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <td style={styles.td}>{item.producto || '—'}</td>
                    <td style={styles.td}>{`${item.cantidad ?? 0} ${item.unidad || ''}`.trim()}</td>
                    <td style={styles.td}>{item.origen || '—'}</td>
                    <td style={styles.td}>{formatDate(item.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX');
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#EEF3F8', padding: 20, fontFamily: 'Arial, sans-serif' },
  backButton: {
    marginBottom: 10,
    background: 'none',
    border: 'none',
    color: '#1E40AF',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  title: { marginTop: 0, marginBottom: 14, color: '#1F2937', fontSize: 28 },
  emptyBox: {
    padding: 14,
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 10,
    color: '#64748B',
  },
  tableWrap: { overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid #DCE5EE' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #CBD5E1',
    fontSize: 14,
    color: '#1F2937',
    background: '#E2E8F0',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #E2E8F0', color: '#334155', fontSize: 14 },
};
