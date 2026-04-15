'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageLogo } from '@/components/PageLogo';
import { supabase } from '@/lib/supabase';

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

export default function ReporteAlertaInventarioPage() {
  const router = useRouter();
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
        alert(
          error instanceof Error ? error.message : 'Error cargando inventario'
        );
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  /** Umbrales min/max vienen de la tabla inventario, cargados en la primera captura del producto en Entradas MX / USA. */
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
    <main style={styles.page}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => router.push('/reportes')}
          style={styles.backButton}
        >
          ← Reportes
        </button>
        <PageLogo />
        <h1 style={styles.title}>Alerta de inventario</h1>
        <p style={styles.subtitle}>
          Lista productos cuya cantidad actual está por debajo del <strong>mínimo</strong>{' '}
          definido en la <strong>primera captura en Entradas</strong> (MX o USA), donde se
          eligieron mínimo y máximo y se guardaron en inventario.
        </p>

        {loading ? (
          <p style={{ color: '#64748B' }}>Cargando...</p>
        ) : alertas.length === 0 ? (
          <div style={styles.emptyBox}>
            No hay alertas: ningún producto queda bajo el mínimo guardado desde la primera
            entrada, o aún no hay productos dados de alta con mínimo/máximo en Entradas.
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Origen</th>
                  <th style={styles.th}>Cantidad actual</th>
                  <th style={styles.th}>Mínimo</th>
                  <th style={styles.th}>Máximo</th>
                  <th style={styles.th}>Unidad</th>
                  <th style={styles.th}>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      background:
                        index % 2 === 0 ? '#fff7ed' : '#ffedd5',
                    }}
                  >
                    <td style={styles.td}>{item.producto || '—'}</td>
                    <td style={styles.td}>{item.origen || '—'}</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#9a3412' }}>
                      {item.cantidad_actual ?? 0}
                    </td>
                    <td style={styles.td}>{item.minimo ?? '—'}</td>
                    <td style={styles.td}>{item.maximo ?? '—'}</td>
                    <td style={styles.td}>{item.unidad || '—'}</td>
                    <td style={styles.td}>{item.ubicacion || '—'}</td>
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
  page: {
    minHeight: '100vh',
    background: '#EEF3F8',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
  },
  backButton: {
    marginBottom: 10,
    background: 'none',
    border: 'none',
    color: '#1E40AF',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  title: { marginTop: 0, marginBottom: 8, color: '#1F2937', fontSize: 28 },
  subtitle: {
    marginTop: 0,
    marginBottom: 16,
    color: '#64748B',
    fontSize: 15,
  },
  emptyBox: {
    padding: 14,
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    borderRadius: 10,
    color: '#64748B',
  },
  tableWrap: {
    overflowX: 'auto',
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #FDBA74',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid #CBD5E1',
    fontSize: 14,
    color: '#1F2937',
    background: '#FED7AA',
  },
  td: { padding: '10px 12px', borderBottom: '1px solid #FED7AA', color: '#334155', fontSize: 14 },
};
