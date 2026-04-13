'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function InventarioPage() {
  const router = useRouter();

  const [inventario, setInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [esCel, setEsCel] = useState(false);

  const cargarInventario = async () => {
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .order('producto', { ascending: true });

    if (!error && data) {
      setInventario(data);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  useEffect(() => {
    const revisarPantalla = () => {
      setEsCel(window.innerWidth < 768);
    };

    revisarPantalla();
    window.addEventListener('resize', revisarPantalla);

    return () => window.removeEventListener('resize', revisarPantalla);
  }, []);

  const inventarioFiltrado = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    const base = [...inventario].sort((a, b) =>
      String(a.producto || '').localeCompare(String(b.producto || ''), 'es', {
        sensitivity: 'base',
      })
    );

    if (!texto) return base;

    return base.filter((item) =>
      String(item.producto || '').toLowerCase().includes(texto)
    );
  }, [inventario, busqueda]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#EEF3F8',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: esCel ? 520 : 1100, margin: '0 auto' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            marginBottom: 10,
            background: 'none',
            border: 'none',
            color: '#1E40AF',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Inicio
        </button>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{
              width: 100,
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        <h2
          style={{
            marginTop: 0,
            marginBottom: 16,
            color: '#1F2937',
            fontSize: 22,
            textAlign: 'center',
          }}
        >
          Inventario
        </h2>

        <input
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            marginBottom: 16,
            borderRadius: 10,
            border: '1px solid #D1D5DB',
            background: '#FFFFFF',
            color: '#1F2937',
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #DCE5EE',
            overflow: 'hidden',
          }}
        >
          {inventarioFiltrado.length === 0 ? (
            <div
              style={{
                padding: 20,
                textAlign: 'center',
                color: '#64748B',
              }}
            >
              No hay productos
            </div>
          ) : esCel ? (
            <div>
              {inventarioFiltrado.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.7fr 1fr 0.9fr auto auto',
                    gap: 8,
                    alignItems: 'center',
                    padding: '12px 14px',
                    borderBottom:
                      index !== inventarioFiltrado.length - 1
                        ? '1px solid #E2E8F0'
                        : 'none',
                    fontSize: 14,
                    color: '#1F2937',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.producto || '—'}
                  </div>

                  <div
                    style={{
                      color: '#334155',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.cantidad_actual ?? 0} {item.unidad || ''}
                  </div>

                  <div
                    style={{
                      color: '#475569',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.ubicacion || '—'}
                  </div>

                  <div
                    style={{
                      color: '#0F172A',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.valor_inventario ?? '—'}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {item.origen === 'MX' ? (
                      <span className="fi fi-mx"></span>
                    ) : item.origen === 'USA' ? (
                      <span className="fi fi-us"></span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 920,
                }}
              >
                <thead>
                  <tr style={{ background: '#E2E8F0' }}>
                    <th style={headerStyle}>Producto</th>
                    <th style={headerStyle}>Cantidad actual</th>
                    <th style={headerStyle}>Unidad</th>
                    <th style={headerStyle}>Ubicación</th>
                    <th style={headerStyle}>Valor total</th>
                    <th style={headerStyle}>Origen</th>
                  </tr>
                </thead>

                <tbody>
                  {inventarioFiltrado.map((item, index) => (
                    <tr
                      key={item.id}
                      style={{
                        background: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                      }}
                    >
                      <td style={cellStyle}>{item.producto || '—'}</td>
                      <td style={cellStyle}>{item.cantidad_actual ?? 0}</td>
                      <td style={cellStyle}>{item.unidad || '—'}</td>
                      <td style={cellStyle}>{item.ubicacion || '—'}</td>
                      <td style={cellStyle}>
                        {item.valor_inventario ?? '—'}
                      </td>
                      <td style={cellStyle}>
                        {item.origen === 'MX' ? (
                          <span className="fi fi-mx"></span>
                        ) : item.origen === 'USA' ? (
                          <span className="fi fi-us"></span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

const headerStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 700,
  color: '#1F2937',
  borderBottom: '1px solid #CBD5E1',
};

const cellStyle: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 14,
  color: '#334155',
  borderBottom: '1px solid #E2E8F0',
};
