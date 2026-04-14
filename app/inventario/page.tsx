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

  // TODO: luego esto debe venir del perfil del usuario
  const esAdmin = true;

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

    return base.filter((item) => {
      const producto = String(item.producto || '').toLowerCase();
      const unidad = String(item.unidad || '').toLowerCase();
      const ubicacion = String(item.ubicacion || '').toLowerCase();
      const origen = String(item.origen || '').toLowerCase();

      return (
        producto.includes(texto) ||
        unidad.includes(texto) ||
        ubicacion.includes(texto) ||
        origen.includes(texto)
      );
    });
  }, [inventario, busqueda]);

  const totalProductos = inventarioFiltrado.length;
  const totalPiezas = inventarioFiltrado.reduce(
    (acc, item) => acc + Number(item.cantidad_actual || 0),
    0
  );
  const valorTotal = inventarioFiltrado.reduce(
    (acc, item) => acc + Number(item.valor_inventario || 0),
    0
  );

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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: esCel
              ? '1fr'
              : esAdmin
              ? 'repeat(3, 1fr)'
              : 'repeat(2, 1fr)',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={resumenCardStyle}>
            <div style={resumenLabelStyle}>Productos</div>
            <div style={resumenValueStyle}>{totalProductos}</div>
          </div>

          <div style={resumenCardStyle}>
            <div style={resumenLabelStyle}>Piezas totales</div>
            <div style={resumenValueStyle}>{totalPiezas}</div>
          </div>

          {esAdmin && (
            <div style={resumenCardStyle}>
              <div style={resumenLabelStyle}>Valor inventario</div>
              <div style={resumenValueStyle}>${valorTotal.toLocaleString()}</div>
            </div>
          )}
        </div>

        <input
          placeholder="Buscar producto, ubicación, unidad u origen..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={inputStyle}
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
            <div style={{ padding: 12 }}>
              {inventarioFiltrado.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 17,
                        color: '#1F2937',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {item.producto || '—'}
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      {item.origen === 'MX' ? (
                        <span className="fi fi-mx"></span>
                      ) : item.origen === 'USA' ? (
                        <span className="fi fi-us"></span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>—</span>
                      )}
                    </div>
                  </div>

                  <div style={mobileRowStyle}>
                    <span style={mobileLabelStyle}>Cantidad:</span>
                    <span style={mobileValueStyle}>
                      {item.cantidad_actual ?? 0} {item.unidad || ''}
                    </span>
                  </div>

                  <div style={mobileRowStyle}>
                    <span style={mobileLabelStyle}>Ubicación:</span>
                    <span style={mobileValueStyle}>{item.ubicacion || '—'}</span>
                  </div>

                  {esAdmin && (
                    <div style={mobileRowStyle}>
                      <span style={mobileLabelStyle}>Valor total:</span>
                      <span style={mobileValueStyle}>
                        {item.valor_inventario ?? '—'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: esAdmin ? 920 : 760,
                }}
              >
                <thead>
                  <tr style={{ background: '#E2E8F0' }}>
                    <th style={headerStyle}>Producto</th>
                    <th style={headerStyle}>Cantidad actual</th>
                    <th style={headerStyle}>Unidad</th>
                    <th style={headerStyle}>Ubicación</th>
                    {esAdmin && <th style={headerStyle}>Valor total</th>}
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
                      {esAdmin && (
                        <td style={cellStyle}>{item.valor_inventario ?? '—'}</td>
                      )}
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

const inputStyle: React.CSSProperties = {
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
};

const resumenCardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #DCE5EE',
  borderRadius: 14,
  padding: 14,
  boxShadow: '0 8px 18px rgba(0,0,0,0.05)',
};

const resumenLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#64748B',
  marginBottom: 6,
};

const resumenValueStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#1F2937',
};

const mobileRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 6,
};

const mobileLabelStyle: React.CSSProperties = {
  color: '#64748B',
  fontSize: 14,
};

const mobileValueStyle: React.CSSProperties = {
  color: '#334155',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'right',
};

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
