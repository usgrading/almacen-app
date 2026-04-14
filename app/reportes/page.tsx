'use client';

import { useRouter } from 'next/navigation';

export default function ReportesPage() {
  const router = useRouter();

  return (
    <main style={styles.page}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          style={styles.backButton}
        >
          ← Inicio
        </button>

        <h1 style={styles.title}>Reportes</h1>

        <div style={styles.grid}>
          <button onClick={() => router.push('/reportes/entradas')} style={styles.button}>
            Reporte de Entradas
          </button>

          <button onClick={() => router.push('/reportes/salidas')} style={styles.button}>
            Reporte de Salidas
          </button>

          <button
            onClick={() => router.push('/reportes/inventario-general')}
            style={styles.button}
          >
            Inventario General
          </button>

          <button
            onClick={() => router.push('/reportes/inventario-mx')}
            style={styles.button}
          >
            Inventario MX
          </button>

          <button
            onClick={() => router.push('/reportes/inventario-usa')}
            style={styles.button}
          >
            Inventario USA
          </button>
        </div>
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
  title: {
    marginTop: 0,
    marginBottom: 14,
    color: '#1F2937',
    fontSize: 28,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    border: '1px solid #D7E0EA',
    background: '#FFFFFF',
    color: '#1F2937',
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
  },
};
