'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
import { filtrarAlertasInventario } from '@/lib/alertas-inventario';
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
  origen: string | null;
  minimo?: number | null;
  maximo?: number | null;
};

const subtituloAlerta = (
  <>
    Lista productos cuya cantidad actual está por debajo del <strong>mínimo</strong> definido en
    la <strong>primera captura en Entradas</strong> (MX o USA), donde se eligieron mínimo y máximo
    y se guardaron en inventario.
  </>
);

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

export default function ReporteAlertaInventarioPage() {
  const [loading, setLoading] = useState(true);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const { esAdmin, listo } = useReporteRolAdmin();

  const alertas = useMemo(
    () => filtrarAlertasInventario(inventario),
    [inventario]
  );

  const { selected, toggle, toggleAll, clear, allSelected, count } =
    useSeleccionFilas(alertas);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

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
        alert(error instanceof Error ? error.message : 'Error cargando inventario');
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  const exportar = () => {
    const filas = alertas.map((item) => ({
      producto: item.producto ?? '',
      origen: item.origen ?? '',
      cantidad_actual: item.cantidad_actual ?? 0,
      minimo: item.minimo ?? '',
      maximo: item.maximo ?? '',
      unidad: item.unidad ?? '',
      ubicacion: item.ubicacion ?? '',
    }));
    exportarAExcel(
      filas,
      [
        { clave: 'producto', encabezado: 'Producto' },
        { clave: 'origen', encabezado: 'Origen' },
        { clave: 'cantidad_actual', encabezado: 'Cantidad actual' },
        { clave: 'minimo', encabezado: 'Mínimo' },
        { clave: 'maximo', encabezado: 'Máximo' },
        { clave: 'unidad', encabezado: 'Unidad' },
        { clave: 'ubicacion', encabezado: 'Ubicación' },
      ],
      'alertas',
      'Alertas'
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
    <ReporteLayout title="Alerta de inventario" subtitle={subtituloAlerta}>
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
              disabled={loading || alertas.length === 0}
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
        ) : alertas.length === 0 ? (
          <div style={reporteEmptyBox}>
            No hay alertas: ningún producto queda bajo el mínimo guardado desde la primera entrada,
            o aún no hay productos dados de alta con mínimo/máximo en Entradas.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 800 + (mostrarSeleccion ? 56 : 0),
              }}
            >
              <thead>
                <tr style={reporteTheadRow}>
                  {mostrarSeleccion ? (
                    <th style={reporteThCheckboxSel}>
                      <CampoFormulario
                        etiqueta="Seleccionar todos"
                        htmlFor="rep-alerta-sel-todos"
                        margenInferior={2}
                        tamanoEtiqueta={11}
                      >
                        <input
                          id="rep-alerta-sel-todos"
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAll}
                          aria-label="Seleccionar todas las filas"
                        />
                      </CampoFormulario>
                    </th>
                  ) : null}
                  <th style={reporteTh}>Producto</th>
                  <th style={reporteTh}>Origen</th>
                  <th style={reporteTh}>Cantidad actual</th>
                  <th style={reporteTh}>Mínimo</th>
                  <th style={reporteTh}>Máximo</th>
                  <th style={reporteTh}>Unidad</th>
                  <th style={reporteTh}>Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((item, index) => (
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
                          htmlFor={`rep-alerta-tab-${String(item.id)}`}
                          margenInferior={0}
                          tamanoEtiqueta={10}
                        >
                          <input
                            id={`rep-alerta-tab-${String(item.id)}`}
                            type="checkbox"
                            checked={selected.has(String(item.id))}
                            onChange={() => toggle(item.id)}
                            aria-label={`Seleccionar ${item.producto || 'fila'}`}
                          />
                        </CampoFormulario>
                      </td>
                    ) : null}
                    <td style={reporteTd}>{item.producto || '—'}</td>
                    <td style={reporteTd}>{item.origen || '—'}</td>
                    <td style={{ ...reporteTd, fontWeight: 700, color: '#B45309' }}>
                      {item.cantidad_actual ?? 0}
                    </td>
                    <td style={reporteTd}>{item.minimo ?? '—'}</td>
                    <td style={reporteTd}>{item.maximo ?? '—'}</td>
                    <td style={reporteTd}>{item.unidad || '—'}</td>
                    <td style={reporteTd}>{item.ubicacion || '—'}</td>
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
