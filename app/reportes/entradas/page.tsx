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
import { exportarAExcel, formatearFechaExcel } from '@/lib/export-excel';
import { ConfirmarEliminarModal } from '@/components/ConfirmarEliminarModal';
import { useReporteRolAdmin } from '@/hooks/useReporteRolAdmin';
import { useSeleccionFilas } from '@/hooks/useSeleccionFilas';
import { getUserRole, isAdmin } from '@/lib/roles';

type Entrada = {
  id: string | number;
  producto: string | null;
  cantidad: number | null;
  unidad: string | null;
  origen: string | null;
  creado_en: string | null;
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

export default function ReporteEntradasPage() {
  const [loading, setLoading] = useState(true);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const { esAdmin, listo } = useReporteRolAdmin();
  const { selected, toggle, toggleAll, clear, allSelected, count } =
    useSeleccionFilas(entradas);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('entradas')
          .select('id, producto, cantidad, unidad, origen, creado_en')
          .order('creado_en', { ascending: false })
          .limit(100);

        if (error) throw error;
        setEntradas((data as Entrada[]) ?? []);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Error cargando entradas');
      } finally {
        setLoading(false);
      }
    };

    void cargar();
  }, []);

  const exportar = () => {
    const filas = entradas.map((e) => ({
      producto: e.producto ?? '',
      cantidad: e.cantidad ?? 0,
      unidad: e.unidad ?? '',
      origen: e.origen ?? '',
      fecha: formatearFechaExcel(e.creado_en),
    }));
    exportarAExcel(
      filas,
      [
        { clave: 'producto', encabezado: 'Producto' },
        { clave: 'cantidad', encabezado: 'Cantidad' },
        { clave: 'unidad', encabezado: 'Unidad' },
        { clave: 'origen', encabezado: 'Origen' },
        { clave: 'fecha', encabezado: 'Fecha' },
      ],
      'entradas',
      'Entradas'
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
      const { error } = await supabase.from('entradas').delete().in('id', ids);
      if (error) throw error;
      setEntradas((prev) => prev.filter((e) => !selected.has(String(e.id))));
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
    <ReporteLayout title="Reporte de Entradas">
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
              disabled={loading || entradas.length === 0}
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
        ) : entradas.length === 0 ? (
          <div style={reporteEmptyBox}>No hay entradas registradas.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
              <thead>
                <tr style={reporteTheadRow}>
                  {mostrarSeleccion ? (
                    <th style={reporteThCheckbox}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Seleccionar todas las filas"
                      />
                    </th>
                  ) : null}
                  <th style={reporteTh}>Producto</th>
                  <th style={reporteTh}>Cantidad</th>
                  <th style={reporteTh}>Origen</th>
                  <th style={reporteTh}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {entradas.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      background: index % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                    }}
                  >
                    {mostrarSeleccion ? (
                      <td style={reporteTdCheckbox}>
                        <input
                          type="checkbox"
                          checked={selected.has(String(item.id))}
                          onChange={() => toggle(item.id)}
                          aria-label={`Seleccionar ${item.producto || 'fila'}`}
                        />
                      </td>
                    ) : null}
                    <td style={reporteTd}>{item.producto || '—'}</td>
                    <td style={reporteTd}>
                      {`${item.cantidad ?? 0} ${item.unidad || ''}`.trim()}
                    </td>
                    <td style={reporteTd}>{item.origen || '—'}</td>
                    <td style={reporteTd}>{formatDate(item.creado_en)}</td>
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

function formatDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX');
}
