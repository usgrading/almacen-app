'use client';

import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ReporteLayout } from '@/components/ReporteLayout';

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
};

const buttonStyle: CSSProperties = {
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
};

export default function ReportesPage() {
  const router = useRouter();

  return (
    <ReporteLayout
      title="Reportes"
      secondaryNav={{ label: 'Inventario →', href: '/inventario' }}
    >
      <div style={gridStyle}>
        <button
          type="button"
          onClick={() => router.push('/reportes/entradas')}
          style={buttonStyle}
        >
          Reporte de Entradas
        </button>

        <button
          type="button"
          onClick={() => router.push('/reportes/salidas')}
          style={buttonStyle}
        >
          Reporte de Salidas
        </button>

        <button
          type="button"
          onClick={() => router.push('/reportes/inventario-general')}
          style={buttonStyle}
        >
          Inventario General
        </button>

        <button
          type="button"
          onClick={() => router.push('/reportes/inventario-mx')}
          style={buttonStyle}
        >
          Inventario MX
        </button>

        <button
          type="button"
          onClick={() => router.push('/reportes/inventario-usa')}
          style={buttonStyle}
        >
          Inventario USA
        </button>

        <button
          type="button"
          onClick={() => router.push('/reportes/alerta-inventario')}
          style={buttonStyle}
        >
          Alerta de inventario
        </button>
      </div>
    </ReporteLayout>
  );
}
