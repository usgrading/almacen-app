'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import {
  ReporteLayout,
  reporteEmptyBox,
  reporteLoadingBox,
  reporteTd,
  reporteTdCheckbox,
  reporteTh,
  reporteThCheckbox,
  reporteTheadRow,
} from '@/components/ReporteLayout';
import { ReporteExportarExcelButton } from '@/components/ReporteExportarExcelButton';
import { exportarAExcel } from '@/lib/export-excel';
import { ConfirmarEliminarModal } from '@/components/ConfirmarEliminarModal';
import { useReporteRolAdmin } from '@/hooks/useReporteRolAdmin';
import { useSeleccionFilas } from '@/hooks/useSeleccionFilas';
import { getUserRole, isAdmin } from '@/lib/roles';
import { CampoFormulario } from '@/components/CampoFormulario';

type InventarioItem = {
  id: string | number;
  producto: string | null;
  cantidad_actual: number | null;
  unidad: string | null;
  ubicacion: string | null;
  minimo?: number | null;
  maximo?: number | null;
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

export default function ReporteInventarioMXPage() {
  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const { esAdmin, listo } = useReporteRolAdmin();
  const { selected, toggle, toggleAll, clear, allSelected, count } =
    useSeleccionFilas(inventario);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('inventario')
          .select('id, producto, cantidad_actual, unidad, ubicacion, minimo, maximo')
          .eq('origen', 'MX')
          .order('producto', { ascending: true });

        if (error) throw error;
        setInventario((data as InventarioItem[]) ?? []);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error cargando inventario MX');
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  const exportar = () => {
    const filas = inventario.map((item) => ({
      producto: item.producto ?? '',
      cantidad_actual: item.cantidad_actual ?? 0,
      unidad: item.unidad ?? '',
      ubicacion: item.ubicacion ?? '',
      minimo: item.minimo ?? '',
      maximo: item.maximo ?? '',
    }));
    exportarAExcel(
      filas,
      [
        { clave: 'producto', encabezado: 'Producto' },
        { clave: 'cantidad_actual', encabezado: 'Cantidad' },
        { clave: 'unidad', encabezado: 'Unidad' },
        { clave: 'ubicacion', encabezado: 'Ubicación' },
        { clave: 'minimo', encabezado: 'Mínimo' },
        { clave: 'maximo', encabezado: 'Máximo' },
      ],
      'inventario-mx',
      'Inventario MX'
    );
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

  return (
    <ReporteLayout
      title={
        <>
          Inventario{' '}
          <span className="fi fi-mx" style={{ marginLeft: 8, fontSize: '1.15em' }} aria-hidden />
        </>
      }
    >
      <>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 12,
            alignItems: 'center',
            padding: '0 4px',
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
              disabled={loading || inventario.length === 0}
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

        {loading ? (
          <div style={reporteLoadingBox}>Cargando...</div>
        ) : inventario.length === 0 ? (
          <div style={reporteEmptyBox}>
            No hay inventario{' '}
            <span className="fi fi-mx" style={{ marginLeft: 4, fontSize: '1.1em' }} aria-hidden />.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 720 + (mostrarSeleccion ? 56 : 0),
              }}
            >
              <thead>
                <tr style={reporteTheadRow}>
                  {mostrarSeleccion ? (
                    <th style={reporteThCheckboxSel}>
                      <CampoFormulario
                        etiqueta="Seleccionar todos"
                        htmlFor="rep-inv-mx-sel-todos"
                        margenInferior={2}
                        tamanoEtiqueta={11}
                      >
                        <input
                          id="rep-inv-mx-sel-todos"
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label="Seleccionar todas las filas"
                        />
                      </CampoFormulario>
                    </th>
                  ) : null}
                  <th style={reporteTh}>Producto</th>
                  <th style={reporteTh}>Cantidad</th>
                  <th style={reporteTh}>Unidad</th>
                  <th style={reporteTh}>Ubicación</th>
                  <th style={reporteTh}>Mínimo</th>
                  <th style={reporteTh}>Máximo</th>
                </tr>
              </thead>
              <tbody>
                {inventario.map((item, index) => (
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
                          htmlFor={`rep-inv-mx-tab-${String(item.id)}`}
                          margenInferior={0}
                          tamanoEtiqueta={10}
                        >
                          <input
                            id={`rep-inv-mx-tab-${String(item.id)}`}
                            type="checkbox"
                            checked={selected.has(String(item.id))}
                            onChange={() => toggle(item.id)}
                            aria-label={`Seleccionar ${item.producto || 'fila'}`}
                          />
                        </CampoFormulario>
                      </td>
                    ) : null}
                    <td style={reporteTd}>{item.producto || '—'}</td>
                    <td style={reporteTd}>{item.cantidad_actual ?? 0}</td>
                    <td style={reporteTd}>{item.unidad || '—'}</td>
                    <td style={reporteTd}>{item.ubicacion || '—'}</td>
                    <td style={reporteTd}>{item.minimo ?? '—'}</td>
                    <td style={reporteTd}>{item.maximo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    </ReporteLayout>
  );
}
