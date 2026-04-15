'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLogo } from '@/components/PageLogo';
import { supabase } from '@/lib/supabase';

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
  const router = useRouter();
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

  return (
    <main style={styles.page}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button type="button" onClick={() => router.push('/reportes')} style={styles.backButton}>
          ← Reportes
        </button>
        <PageLogo />
        <h1 style={styles.title}>Inventario USA</h1>

        {loading ? (
          <p style={{ color: '#64748B' }}>Cargando...</p>
        ) : inventario.length === 0 ? (
          <div style={styles.emptyBox}>No hay inventario USA.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Cantidad</th>
                  <th style={styles.th}>Unidad</th>
                  <th style={styles.th}>Ubicación</th>
                  <th style={styles.th}>Mínimo</th>
                  <th style={styles.th}>Máximo</th>
                </tr>
              </thead>
              <tbody>
                {inventario.map((item, index) => (
                  <tr key={item.id} style={{ background: index % 2 === 0 ? '#fff' : '#F8FAFC' }}>
                    <td style={styles.td}>{item.producto || '—'}</td>
                    <td style={styles.td}>{item.cantidad_actual ?? 0}</td>
                    <td style={styles.td}>{item.unidad || '—'}</td>
                    <td style={styles.td}>{item.ubicacion || '—'}</td>
                    <td style={styles.td}>{item.minimo ?? '—'}</td>
                    <td style={styles.td}>{item.maximo ?? '—'}</td>
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
