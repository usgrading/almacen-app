'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ReporteLayout } from '@/components/ReporteLayout';

const banderaEnTarjeta: CSSProperties = {
  marginLeft: 8,
  fontSize: '1.25em',
  lineHeight: 1,
  verticalAlign: 'middle',
};

const ACCESOS_REPORTES: readonly { href: string; label: ReactNode }[] = [
  { href: '/reportes/entradas', label: 'Reporte de Entradas' },
  { href: '/reportes/salidas', label: 'Reporte de Salidas' },
  { href: '/reportes/inventario-general', label: 'Inventario General' },
  {
    href: '/reportes/inventario-mx',
    label: (
      <>
        Inventario{' '}
        <span className="fi fi-mx" style={banderaEnTarjeta} aria-hidden />
      </>
    ),
  },
  {
    href: '/reportes/inventario-usa',
    label: (
      <>
        Inventario{' '}
        <span className="fi fi-us" style={banderaEnTarjeta} aria-hidden />
      </>
    ),
  },
  { href: '/reportes/alerta-inventario', label: 'Alerta de inventario' },
];

const contenedorGridStyle: CSSProperties = {
  padding: '26px 22px 28px',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
  gap: 16,
  alignItems: 'stretch',
};

const tileBase: CSSProperties = {
  minHeight: 96,
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: '16px 14px',
  borderRadius: 14,
  border: '1px solid #E2E8F0',
  background: '#FAFBFC',
  color: '#1F2937',
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
  cursor: 'pointer',
  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
  transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease, background 0.2s ease',
};

const tileHover: CSSProperties = {
  background: '#FFFFFF',
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.09)',
  borderColor: '#CBD5E1',
  transform: 'translateY(-2px)',
};

function AccesoReporte({ href, label }: { href: string; label: ReactNode }) {
  const router = useRouter();
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...tileBase,
        ...(hover ? tileHover : {}),
      }}
    >
      {label}
    </button>
  );
}

export default function ReportesPage() {
  return (
    <ReporteLayout
      title="Reportes"
      encabezadoAmplio
      secondaryNav={{ label: 'Inventario →', href: '/inventario' }}
    >
      <div style={contenedorGridStyle}>
        <div style={gridStyle}>
          {ACCESOS_REPORTES.map((item) => (
            <AccesoReporte key={item.href} href={item.href} label={item.label} />
          ))}
        </div>
      </div>
    </ReporteLayout>
  );
}
