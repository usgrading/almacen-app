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
import { CampoFormulario } from '@/components/CampoFormulario';

type Entrada = {
  /** id del renglón en `entrada_items` */
  id: string;
  entrada_id: string;
  producto: string | null;
  cantidad: number | null;
  unidad: string | null;
  origen: string | null;
  creado_en: string | null;
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
          .from('entrada_items')
          .select(
            `
            id,
            entrada_id,
            producto,
            cantidad,
            unidad,
            entradas ( origen, creado_en )
          `
          )
          .limit(500);

        if (error) throw error;

        const raw = data ?? [];
        const filas: Entrada[] = raw
          .map((row: Record<string, unknown>) => {
            const emb = row.entradas;
            const cab =
              emb && typeof emb === 'object'
                ? Array.isArray(emb)
                  ? (emb[0] as { origen?: string | null; creado_en?: string | null } | undefined)
                  : (emb as { origen?: string | null; creado_en?: string | null })
                : null;
            return {
              id: String(row.id ?? ''),
              entrada_id: String(row.entrada_id ?? ''),
              producto: (row.producto as string | null) ?? null,
              cantidad: (row.cantidad as number | null) ?? null,
              unidad: (row.unidad as string | null) ?? null,
              origen: cab?.origen ?? null,
              creado_en: cab?.creado_en ?? null,
            };
          })
          .sort((a, b) => {
            const ta = a.creado_en ? new Date(a.creado_en).getTime() : 0;
            const tb = b.creado_en ? new Date(b.creado_en).getTime() : 0;
            return tb - ta;
          });

        setEntradas(filas);
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
    const idsItems = Array.from(selected);
    if (idsItems.length === 0) {
      setModalEliminar(false);
      return;
    }

    const filasSel = entradas.filter((e) => idsItems.includes(String(e.id)));
    const idsCabecera = [...new Set(filasSel.map((e) => String(e.entrada_id)))];

    setEliminando(true);
    try {
      const tabla = 'entradas';
      console.info('[reportes/entradas] Solicitando DELETE cabeceras', {
        tabla,
        idsCabecera,
        renglonesSeleccionados: idsItems.length,
      });

      const { data: filasBorradas, error } = await supabase
        .from(tabla)
        .delete()
        .in('id', idsCabecera)
        .select('id');

      console.info('[reportes/entradas] Respuesta DELETE', {
        tabla,
        error: error ?? null,
        filasDevueltas: filasBorradas?.length ?? 0,
        idsCabeceraBorrados: filasBorradas?.map((r) => r.id) ?? [],
      });

      if (error) {
        console.error('[reportes/entradas] Error Supabase DELETE', error);
        throw error;
      }

      if (!filasBorradas?.length) {
        const msg =
          'No se eliminó ningún registro en la base de datos (tabla entradas). Suele deberse a permisos RLS o políticas de borrado. Revisa la consola para el detalle.';
        console.error('[reportes/entradas] DELETE sin filas afectadas', {
          idsCabeceraSolicitados: idsCabecera,
        });
        alert(msg);
        return;
      }

      if (filasBorradas.length < idsCabecera.length) {
        console.warn('[reportes/entradas] Borrado parcial', {
          solicitados: idsCabecera.length,
          borrados: filasBorradas.length,
        });
        alert(
          `Solo se eliminaron ${filasBorradas.length} de ${idsCabecera.length} entradas. El resto no se pudo borrar (permisos o datos).`
        );
      }

      const borrados = new Set(filasBorradas.map((r) => String(r.id)));
      setEntradas((prev) =>
        prev.filter((e) => !borrados.has(String(e.entrada_id)))
      );
      clear();
      setModalEliminar(false);
    } catch (e) {
      console.error('[reportes/entradas] Fallo al eliminar', e);
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
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 560 + (mostrarSeleccion ? 56 : 0),
              }}
            >
              <thead>
                <tr style={reporteTheadRow}>
                  {mostrarSeleccion ? (
                    <th style={reporteThCheckboxSel}>
                      <CampoFormulario
                        etiqueta="Seleccionar todos"
                        htmlFor="rep-ent-sel-todos"
                        margenInferior={2}
                        tamanoEtiqueta={11}
                      >
                        <input
                          id="rep-ent-sel-todos"
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
                      <td style={reporteTdCheckboxSel}>
                        <CampoFormulario
                          etiqueta="Elegir"
                          htmlFor={`rep-ent-tab-${String(item.id)}`}
                          margenInferior={0}
                          tamanoEtiqueta={10}
                        >
                          <input
                            id={`rep-ent-tab-${String(item.id)}`}
                            type="checkbox"
                            checked={selected.has(String(item.id))}
                            onChange={() => toggle(item.id)}
                            aria-label={`Seleccionar ${item.producto || 'fila'}`}
                          />
                        </CampoFormulario>
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
