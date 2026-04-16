'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ReporteLayout } from '@/components/ReporteLayout';
import { supabase } from '@/lib/supabase';
import { contarAlertasInventario } from '@/lib/alertas-inventario';

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
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#0f172a',
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
  cursor: 'pointer',
  boxShadow:
    '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)',
  transition: 'box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease, background 0.2s ease',
};

const tileHover: CSSProperties = {
  background: '#ffffff',
  boxShadow:
    '0 1px 2px rgba(15, 23, 42, 0.06), 0 12px 28px rgba(15, 23, 42, 0.1)',
  borderColor: '#cbd5e1',
  transform: 'translateY(-2px)',
};

const alertaTileRojo: CSSProperties = {
  background: '#FEF2F2',
  borderColor: '#FECACA',
  color: '#991B1B',
};

const alertaTileRojoHover: CSSProperties = {
  background: '#FEE2E2',
  borderColor: '#FCA5A5',
  boxShadow: '0 10px 28px rgba(185, 28, 28, 0.12)',
  transform: 'translateY(-2px)',
};

const alertaTileVerde: CSSProperties = {
  background: '#F0FDF4',
  borderColor: '#BBF7D0',
  color: '#166534',
};

const alertaTileVerdeHover: CSSProperties = {
  background: '#DCFCE7',
  borderColor: '#86EFAC',
  boxShadow: '0 10px 28px rgba(22, 101, 52, 0.1)',
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

function AccesoAlertaInventario() {
  const router = useRouter();
  const [hover, setHover] = useState(false);
  const [alertCount, setAlertCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('inventario')
        .select('cantidad_actual, minimo');

      if (cancelled) return;
      if (error) {
        setAlertCount(0);
        return;
      }
      setAlertCount(contarAlertasInventario(data ?? []));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cargando = alertCount === null;
  const hayAlertas = !cargando && alertCount > 0;

  const estiloBase: CSSProperties = {
    ...tileBase,
    position: 'relative',
    overflow: 'visible',
    flexDirection: 'column',
    gap: 6,
    ...(cargando ? {} : hayAlertas ? alertaTileRojo : alertaTileVerde),
  };

  let estiloHover: CSSProperties = {};
  if (hover) {
    if (cargando) estiloHover = tileHover;
    else if (hayAlertas) estiloHover = alertaTileRojoHover;
    else estiloHover = alertaTileVerdeHover;
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes reportes-alerta-badge-pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.06); }
            }
          `,
        }}
      />
      <button
        type="button"
        onClick={() => router.push('/reportes/alerta-inventario')}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          ...estiloBase,
          ...estiloHover,
        }}
        aria-label={
          cargando
            ? 'Alerta de inventario, cargando'
            : hayAlertas
              ? `Alerta de inventario: ${alertCount} ${alertCount === 1 ? 'alerta' : 'alertas'}`
              : 'Alerta de inventario, sin alertas'
        }
      >
        {hayAlertas ? (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              minWidth: 22,
              height: 22,
              padding: '0 7px',
              borderRadius: 999,
              background: '#DC2626',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
              animation: 'reportes-alerta-badge-pulse 2.2s ease-in-out infinite',
              zIndex: 1,
            }}
            aria-hidden
          >
            {alertCount}
          </span>
        ) : null}

        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            maxWidth: '100%',
            paddingRight: hayAlertas ? 24 : 0,
          }}
        >
          <span>Alerta de inventario</span>
          {!cargando && !hayAlertas ? (
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                opacity: 0.95,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              Sin alertas
              <span style={{ color: '#22C55E', fontSize: 14 }} aria-hidden>
                ✓
              </span>
            </span>
          ) : null}
        </span>
      </button>
    </>
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
          <AccesoAlertaInventario />
        </div>
      </div>
    </ReporteLayout>
  );
}
