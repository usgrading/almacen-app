'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ReporteLayout,
  reporteTdCheckbox,
  reporteThCheckbox,
} from '@/components/ReporteLayout';
import { ReporteExportarExcelButton } from '@/components/ReporteExportarExcelButton';
import { exportarAExcel } from '@/lib/export-excel';
import { ConfirmarEliminarModal } from '@/components/ConfirmarEliminarModal';
import { useReporteRolAdmin } from '@/hooks/useReporteRolAdmin';
import { useSeleccionFilas } from '@/hooks/useSeleccionFilas';
import { getUserRole, isAdmin } from '@/lib/roles';
import { CampoFormulario } from '@/components/CampoFormulario';
import { appCardInner, appInput } from '@/lib/app-ui';

type FiltroOrigen = 'TODOS' | 'MX' | 'USA';

type InventarioItem = {
  id: string | number;
  producto?: string | null;
  cantidad_actual?: number | string | null;
  unidad?: string | null;
  ubicacion?: string | null;
  origen?: string | null;
  valor_inventario?: number | string | null;
  costo_unitario?: number | string | null;
};

export default function InventarioPage() {
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [esCel, setEsCel] = useState(false);
  const [filtroOrigen, setFiltroOrigen] = useState<FiltroOrigen>('TODOS');

  const { esAdmin, listo } = useReporteRolAdmin();
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const cargarInventario = async () => {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('producto', { ascending: true });

      if (!error && data) {
        setInventario(data as InventarioItem[]);
      }
    };

    void cargarInventario();
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

    let base = [...inventario];

    if (filtroOrigen !== 'TODOS') {
      base = base.filter((item) => item.origen === filtroOrigen);
    }

    base.sort((a, b) =>
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
  }, [inventario, busqueda, filtroOrigen]);

  const { selected, toggle, toggleAll, clear, allSelected, count } =
    useSeleccionFilas(inventarioFiltrado);

  const totalProductos = inventarioFiltrado.length;

  const totalPiezas = inventarioFiltrado.reduce(
    (acc, item) => acc + toNumber(item.cantidad_actual),
    0
  );

  const itemsMX = inventarioFiltrado.filter((item) => item.origen === 'MX');
  const itemsUSA = inventarioFiltrado.filter((item) => item.origen === 'USA');

  const valorMX = itemsMX.reduce(
    (acc, item) =>
      acc +
      getValorCalculado(
        item.valor_inventario,
        item.cantidad_actual,
        item.costo_unitario
      ),
    0
  );

  const valorUSA = itemsUSA.reduce(
    (acc, item) =>
      acc +
      getValorCalculado(
        item.valor_inventario,
        item.cantidad_actual,
        item.costo_unitario
      ),
    0
  );

  const renderBandera = (origen?: string | null) => {
    if (origen === 'MX') {
      return <span className="fi fi-mx"></span>;
    }

    if (origen === 'USA') {
      return <span className="fi fi-us"></span>;
    }

    return <span style={{ color: '#94A3B8' }}>—</span>;
  };

  const exportar = () => {
    const filas = inventarioFiltrado.map((item) => {
      const fila: Record<string, unknown> = {
        producto: item.producto ?? '',
        cantidad_actual: toNumber(item.cantidad_actual),
        unidad: item.unidad ?? '',
        ubicacion: item.ubicacion ?? '',
        origen: item.origen ?? '',
      };
      if (esAdmin) {
        fila.valor_total = renderValor(
          item.valor_inventario,
          item.cantidad_actual,
          item.costo_unitario
        );
      }
      return fila;
    });
    const columnas: { clave: string; encabezado: string }[] = [
      { clave: 'producto', encabezado: 'Producto' },
      { clave: 'cantidad_actual', encabezado: 'Cantidad actual' },
      { clave: 'unidad', encabezado: 'Unidad' },
      { clave: 'ubicacion', encabezado: 'Ubicación' },
    ];
    if (esAdmin) {
      columnas.push({ clave: 'valor_total', encabezado: 'Valor total' });
    }
    columnas.push({ clave: 'origen', encabezado: 'Origen' });
    exportarAExcel(filas, columnas, 'inventario', 'Inventario');
  };

  const solicitarEliminar = () => {
    if (!listo || !esAdmin || count === 0) return;
    setModalEliminar(true);
  };

  const ejecutarEliminar = async () => {
    const rol = await getUserRole(supabase);
    if (!isAdmin(rol)) {
      alert('Solo un administrador puede eliminar registros.');
      setModalEliminar(false);
      return;
    }
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setModalEliminar(false);
      return;
    }
    setEliminando(true);
    try {
      const { error } = await supabase.from('inventario').delete().in('id', ids);
      if (error) throw error;
      setInventario((prev) => prev.filter((it) => !selected.has(String(it.id))));
      clear();
      setModalEliminar(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setEliminando(false);
    }
  };

  const mostrarSeleccion = listo && esAdmin;

  const btnEliminar: CSSProperties = {
    padding: '10px 16px',
    borderRadius: 12,
    border: '1px solid #FECACA',
    background: '#FEF2F2',
    color: '#991B1B',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Arial, sans-serif',
  };

  return (
    <ReporteLayout title="Inventario general" noCard>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          {mostrarSeleccion ? (
            <button
              type="button"
              disabled={count === 0 || eliminando}
              onClick={solicitarEliminar}
              style={{
                ...btnEliminar,
                opacity: count === 0 || eliminando ? 0.5 : 1,
                cursor: count === 0 || eliminando ? 'not-allowed' : 'pointer',
              }}
            >
              Eliminar seleccionados ({count})
            </button>
          ) : null}
          <div style={{ marginLeft: 'auto' }}>
            <ReporteExportarExcelButton
              disabled={inventarioFiltrado.length === 0}
              onClick={exportar}
            />
          </div>
        </div>

        <ConfirmarEliminarModal
          abierto={modalEliminar}
          mensaje="¿Seguro que quieres eliminar los registros seleccionados?"
          onCancelar={() => !eliminando && setModalEliminar(false)}
          onConfirmar={ejecutarEliminar}
          cargando={eliminando}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: esCel ? '1fr' : 'repeat(4, minmax(0, 1fr))',
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
            <>
              <div style={resumenCardStyle}>
                <div style={resumenLabelWithFlagStyle}>
                  <span>Valor MX</span>
                  <span style={flagInlineStyle}>
                    <span className="fi fi-mx"></span>
                  </span>
                </div>
                <div style={resumenValueStyle}>
                  {formatMoney(valorMX)}

                </div>
              </div>

              <div style={resumenCardStyle}>
                <div style={resumenLabelWithFlagStyle}>
                  <span>Valor USA</span>
                  <span style={flagInlineStyle}>
                    <span className="fi fi-us"></span>
                  </span>
                </div>
                <div style={resumenValueStyle}>
                  {formatMoney(valorUSA)}

                </div>
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 12,
          }}
        >
          <button
            onClick={() => setFiltroOrigen('TODOS')}
            style={getFiltroStyle(filtroOrigen === 'TODOS')}
          >
            <span style={filtroContenidoStyle}>
              <span>Todos</span>
            </span>
          </button>

          <button
            onClick={() => setFiltroOrigen('MX')}
            style={getFiltroStyle(filtroOrigen === 'MX')}
          >
            <span style={filtroContenidoStyle}>
              <span style={flagInlineStyle}>
                <span className="fi fi-mx"></span>
              </span>
              <span>MX</span>
            </span>
          </button>

          <button
            onClick={() => setFiltroOrigen('USA')}
            style={getFiltroStyle(filtroOrigen === 'USA')}
          >
            <span style={filtroContenidoStyle}>
              <span style={flagInlineStyle}>
                <span className="fi fi-us"></span>
              </span>
              <span>USA</span>
            </span>
          </button>
        </div>

        <CampoFormulario etiqueta="Buscar" htmlFor="rep-inv-gen-busqueda">
          <input
            id="rep-inv-gen-busqueda"
            className="app-input-field"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={inputStyleCampo}
          />
        </CampoFormulario>

        <div
          style={{
            ...appCardInner,
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
                    {mostrarSeleccion ? (
                      <CampoFormulario
                        etiqueta="Seleccionar"
                        htmlFor={`rep-inv-gen-mob-${String(item.id)}`}
                        margenInferior={0}
                        tamanoEtiqueta={11}
                      >
                        <input
                          id={`rep-inv-gen-mob-${String(item.id)}`}
                          type="checkbox"
                          checked={selected.has(String(item.id))}
                          onChange={() => toggle(item.id)}
                          aria-label={`Seleccionar ${item.producto || 'fila'}`}
                          style={{ flexShrink: 0 }}
                        />
                      </CampoFormulario>
                    ) : null}
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

                    <div style={{ flexShrink: 0 }}>{renderBandera(item.origen)}</div>
                  </div>

                  <div style={mobileRowStyle}>
                    <span style={mobileLabelStyle}>Cantidad:</span>
                    <span style={mobileValueStyle}>
                      {toNumber(item.cantidad_actual)} {item.unidad || ''}
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
                        {renderValor(
                          item.valor_inventario,
                          item.cantidad_actual,
                          item.costo_unitario
                        )}
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
                  minWidth:
                    (esAdmin ? 920 : 760) + (mostrarSeleccion ? 100 : 0),
                }}
              >
                <thead>
                  <tr style={{ background: '#E2E8F0' }}>
                    {mostrarSeleccion ? (
                      <th style={reporteThCheckboxSel}>
                        <CampoFormulario
                          etiqueta="Seleccionar todos"
                          htmlFor="rep-inv-gen-sel-todos"
                          margenInferior={2}
                          tamanoEtiqueta={11}
                        >
                          <input
                            id="rep-inv-gen-sel-todos"
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            aria-label="Seleccionar todas las filas"
                          />
                        </CampoFormulario>
                      </th>
                    ) : null}
                    <th style={headerStyle}>Producto</th>
                    <th style={headerStyle}>Cantidad actual</th>
                    <th style={headerStyle}>Unidad</th>
                    <th style={headerStyle}>Ubicación</th>
                    {esAdmin && <th style={headerStyle}>Valor total</th>}
                    <th style={headerStyleCenter}>Origen</th>
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
                      {mostrarSeleccion ? (
                        <td style={reporteTdCheckboxSel}>
                          <CampoFormulario
                            etiqueta="Elegir"
                            htmlFor={`rep-inv-gen-tab-${String(item.id)}`}
                            margenInferior={0}
                            tamanoEtiqueta={10}
                          >
                            <input
                              id={`rep-inv-gen-tab-${String(item.id)}`}
                              type="checkbox"
                              checked={selected.has(String(item.id))}
                              onChange={() => toggle(item.id)}
                              aria-label={`Seleccionar ${item.producto || 'fila'}`}
                            />
                          </CampoFormulario>
                        </td>
                      ) : null}
                      <td style={cellStyle}>{item.producto || '—'}</td>
                      <td style={cellStyle}>{toNumber(item.cantidad_actual)}</td>
                      <td style={cellStyle}>{item.unidad || '—'}</td>
                      <td style={cellStyle}>{item.ubicacion || '—'}</td>
                      {esAdmin && (
                        <td style={cellStyle}>
                          {renderValor(
                            item.valor_inventario,
                            item.cantidad_actual,
                            item.costo_unitario
                          )}
                        </td>
                      )}
                      <td style={cellStyleCenter}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: 20,
                          }}
                        >
                          {renderBandera(item.origen)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </ReporteLayout>
  );
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasRealValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function getValorCalculado(
  valor: unknown,
  cantidad: unknown,
  costo: unknown
): number {
  if (hasRealValue(valor)) {
    return toNumber(valor);
  }

  const cantidadNum = toNumber(cantidad);
  const costoNum = toNumber(costo);

  if (cantidadNum > 0 && costoNum > 0) {
    return cantidadNum * costoNum;
  }

  return 0;
}

function hasRenderableValor(
  valor: unknown,
  cantidad: unknown,
  costo: unknown
): boolean {
  if (hasRealValue(valor)) return true;

  const cantidadNum = toNumber(cantidad);
  const costoNum = toNumber(costo);

  return cantidadNum > 0 && costoNum > 0;
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function renderValor(
  valor: unknown,
  cantidad: unknown,
  costo: unknown
): string {
  const calculado = getValorCalculado(valor, cantidad, costo);
  const tieneValor = hasRenderableValor(valor, cantidad, costo);

  if (!tieneValor) {
    return 'Sin valor';
  }

  return formatMoney(calculado);
}

const getFiltroStyle = (activo: boolean): CSSProperties => ({
  flex: 1,
  padding: 10,
  borderRadius: 12,
  border: activo ? '2px solid #1e40af' : '1px solid #e2e8f0',
  background: activo ? '#dbeafe' : '#ffffff',
  color: '#0f172a',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'border-color 0.2s ease, background 0.2s ease',
});

const filtroContenidoStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  lineHeight: 1,
};

const inputStyle: CSSProperties = {
  ...appInput,
  marginBottom: 16,
};

const inputStyleCampo: CSSProperties = {
  ...appInput,
  marginBottom: 0,
};

const reporteThCheckboxSel: CSSProperties = {
  ...reporteThCheckbox,
  width: 100,
  maxWidth: 100,
  verticalAlign: 'top',
};

const reporteTdCheckboxSel: CSSProperties = {
  ...reporteTdCheckbox,
  width: 100,
  maxWidth: 100,
  verticalAlign: 'top',
};

const resumenCardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  borderRadius: 12,
  padding: 14,
  boxShadow:
    '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 18px rgba(15, 23, 42, 0.06)',
};

const resumenLabelStyle: CSSProperties = {
  fontSize: 13,
  color: '#64748B',
  marginBottom: 6,
  whiteSpace: 'nowrap',
};

const resumenLabelWithFlagStyle: CSSProperties = {
  fontSize: 13,
  color: '#64748B',
  marginBottom: 6,
  whiteSpace: 'nowrap',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const flagInlineStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};

const resumenValueStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#1F2937',
};

const mobileRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 6,
};

const mobileLabelStyle: CSSProperties = {
  color: '#64748B',
  fontSize: 14,
};

const mobileValueStyle: CSSProperties = {
  color: '#334155',
  fontSize: 14,
  fontWeight: 600,
  textAlign: 'right',
};

const headerStyle: CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 700,
  color: '#1F2937',
  borderBottom: '1px solid #CBD5E1',
};

const headerStyleCenter: CSSProperties = {
  textAlign: 'center',
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 700,
  color: '#1F2937',
  borderBottom: '1px solid #CBD5E1',
};

const cellStyle: CSSProperties = {
  padding: '12px 14px',
  fontSize: 14,
  color: '#334155',
  borderBottom: '1px solid #E2E8F0',
};

const cellStyleCenter: CSSProperties = {
  padding: '12px 14px',
  fontSize: 14,
  color: '#334155',
  borderBottom: '1px solid #E2E8F0',
  textAlign: 'center',
};
