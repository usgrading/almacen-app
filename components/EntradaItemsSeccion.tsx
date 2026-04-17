'use client';

import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import { CampoFormulario } from '@/components/CampoFormulario';
import {
  crearFilaVaciaEntradaItem,
  type EntradaItemFila,
} from '@/lib/entrada-item-fila';

const OPCIONES_UBICACION = (() => {
  const opts: string[] = [];
  for (const seccion of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']) {
    for (const nivel of [1, 2, 3, 4]) {
      opts.push(`${seccion}-${nivel}`);
    }
  }
  return opts;
})();

type Props = {
  prefijoIds: string;
  filas: EntradaItemFila[];
  setFilas: Dispatch<SetStateAction<EntradaItemFila[]>>;
  primeraCapturaPorProducto: Record<string, boolean>;
  validandoPrimeraCaptura: boolean;
  puedeRegistrar: boolean;
  estiloInputCampo: CSSProperties;
  estiloTituloSeccion: CSSProperties;
  filaDinero: CSSProperties;
  prefijoDolar: CSSProperties;
  inputDinero: CSSProperties;
  filaDineroTotal: CSSProperties;
  prefijoDolarTotal: CSSProperties;
  inputDineroTotal: CSSProperties;
};

function esPrimeraFilaDelProducto(filas: EntradaItemFila[], index: number) {
  const p = filas[index]?.producto.trim().toLowerCase();
  if (!p) return false;
  const firstIdx = filas.findIndex((f) => f.producto.trim().toLowerCase() === p);
  return firstIdx === index;
}

export function EntradaItemsSeccion({
  prefijoIds,
  filas,
  setFilas,
  primeraCapturaPorProducto,
  validandoPrimeraCaptura,
  puedeRegistrar,
  estiloInputCampo,
  estiloTituloSeccion,
  filaDinero,
  prefijoDolar,
  inputDinero,
  filaDineroTotal,
  prefijoDolarTotal,
  inputDineroTotal,
}: Props) {
  const actualizarFila = (id: string, parcial: Partial<EntradaItemFila>) => {
    setFilas((prev) => prev.map((f) => (f.id === id ? { ...f, ...parcial } : f)));
  };

  const recalcularTotalDesdeUnitario = (
    cantStr: string,
    unitStr: string
  ): string => {
    const cant = Number(cantStr.replace(/[^0-9.]/g, ''));
    const cu = Number(unitStr);
    if (Number.isFinite(cant) && cant > 0 && Number.isFinite(cu) && cu > 0) {
      return (Math.round(cant * cu * 100) / 100).toFixed(2);
    }
    return '';
  };

  const recalcularUnitarioDesdeTotal = (
    cantStr: string,
    totalStr: string
  ): string => {
    const cant = Number(cantStr.replace(/[^0-9.]/g, ''));
    const ct = Number(totalStr);
    if (Number.isFinite(cant) && cant > 0 && Number.isFinite(ct) && ct > 0) {
      return (Math.round((ct / cant) * 100) / 100).toFixed(2);
    }
    return '';
  };

  const agregarItem = () => {
    setFilas((prev) => [...prev, crearFilaVaciaEntradaItem()]);
  };

  const eliminarItem = (id: string) => {
    setFilas((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((f) => f.id !== id);
    });
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        marginTop: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <h4 style={estiloTituloSeccion}>Items de la entrada</h4>
        <button
          type="button"
          className="app-btn-primario"
          disabled={!puedeRegistrar}
          onClick={agregarItem}
          style={{
            padding: '8px 12px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            background: '#f1f5f9',
            color: '#0f172a',
            cursor: puedeRegistrar ? 'pointer' : 'not-allowed',
            opacity: puedeRegistrar ? 1 : 0.6,
          }}
        >
          + Agregar ítem
        </button>
      </div>

      <p
        style={{
          margin: '0 0 12px 0',
          fontSize: 13,
          color: '#64748b',
          lineHeight: 1.45,
        }}
      >
        Cada renglón es una pieza o concepto de la entrada. Puedes editar cantidades y costos
        antes de guardar.
      </p>

      <div
        style={{
          maxHeight: 'min(65vh, 520px)',
          overflowY: 'auto',
          paddingRight: 4,
        }}
      >
        {filas.map((fila, index) => {
          const idBase = `entrada-${prefijoIds}-item-${index}`;
          const pNorm = fila.producto.trim().toLowerCase();
          const mostrarStockNuevo =
            pNorm &&
            primeraCapturaPorProducto[pNorm] &&
            esPrimeraFilaDelProducto(filas, index);

          return (
            <div
              key={fila.id}
              style={{
                marginBottom: 16,
                padding: 14,
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
                  Ítem {index + 1}
                </span>
                {filas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => eliminarItem(fila.id)}
                    disabled={!puedeRegistrar}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#b91c1c',
                      background: 'transparent',
                      border: 'none',
                      cursor: puedeRegistrar ? 'pointer' : 'not-allowed',
                      opacity: puedeRegistrar ? 1 : 0.5,
                      padding: '4px 8px',
                    }}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>

              <CampoFormulario
                etiqueta="Nombre de pieza"
                htmlFor={`${idBase}-producto`}
              >
                <input
                  id={`${idBase}-producto`}
                  className="app-input-field"
                  value={fila.producto}
                  onChange={(e) => actualizarFila(fila.id, { producto: e.target.value })}
                  style={estiloInputCampo}
                />
              </CampoFormulario>

              {validandoPrimeraCaptura && pNorm ? (
                <p
                  style={{
                    marginTop: -6,
                    marginBottom: 10,
                    color: '#64748B',
                    fontSize: 13,
                  }}
                >
                  Revisando inventario para este producto...
                </p>
              ) : null}

              {mostrarStockNuevo ? (
                <>
                  <p
                    style={{
                      marginTop: -2,
                      marginBottom: 8,
                      color: '#1E40AF',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Primera captura: define stock mínimo y máximo
                  </p>
                  <CampoFormulario etiqueta="Stock mínimo" htmlFor={`${idBase}-min`}>
                    <select
                      id={`${idBase}-min`}
                      className="app-input-field"
                      value={fila.minimo}
                      onChange={(e) => actualizarFila(fila.id, { minimo: e.target.value })}
                      style={estiloInputCampo}
                    >
                      <option value="">Selecciona</option>
                      {Array.from({ length: 200 }, (_, i) => i + 1).map((n) => (
                        <option key={`min-${fila.id}-${n}`} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </CampoFormulario>
                  <CampoFormulario etiqueta="Stock máximo" htmlFor={`${idBase}-max`}>
                    <select
                      id={`${idBase}-max`}
                      className="app-input-field"
                      value={fila.maximo}
                      onChange={(e) => actualizarFila(fila.id, { maximo: e.target.value })}
                      style={estiloInputCampo}
                    >
                      <option value="">Selecciona</option>
                      {Array.from({ length: 200 }, (_, i) => i + 1).map((n) => (
                        <option key={`max-${fila.id}-${n}`} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </CampoFormulario>
                </>
              ) : null}

              <CampoFormulario etiqueta="Cantidad" htmlFor={`${idBase}-cant`}>
                <input
                  id={`${idBase}-cant`}
                  className="app-input-field"
                  type="text"
                  inputMode="numeric"
                  value={fila.cantidad}
                  onChange={(e) => {
                    const cant = e.target.value.replace(/[^0-9]/g, '');
                    const nuevoTotal = recalcularTotalDesdeUnitario(
                      cant,
                      fila.costoUnitario
                    );
                    actualizarFila(fila.id, {
                      cantidad: cant,
                      costoTotal: nuevoTotal,
                    });
                  }}
                  style={estiloInputCampo}
                />
              </CampoFormulario>

              <CampoFormulario etiqueta="Unidad" htmlFor={`${idBase}-unidad`}>
                <select
                  id={`${idBase}-unidad`}
                  className="app-input-field"
                  value={fila.unidad}
                  onChange={(e) => actualizarFila(fila.id, { unidad: e.target.value })}
                  style={estiloInputCampo}
                >
                  <option value="" disabled>
                    Selecciona unidad
                  </option>
                  <option value="Pieza">Pieza</option>
                  <option value="Caja">Caja</option>
                  <option value="Litros">Litros</option>
                  <option value="Galones">Galones</option>
                  <option value="Kilos">Kilos</option>
                  <option value="Metros">Metros</option>
                  <option value="Paquete">Paquete</option>
                </select>
              </CampoFormulario>

              <CampoFormulario etiqueta="Costo unitario" htmlFor={`${idBase}-cu`}>
                <div style={filaDinero}>
                  <span style={prefijoDolar} aria-hidden="true">
                    $
                  </span>
                  <input
                    id={`${idBase}-cu`}
                    className="app-input-field"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={fila.costoUnitario}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        actualizarFila(fila.id, { costoUnitario: '', costoTotal: '' });
                        return;
                      }
                      const nuevoTotal = recalcularTotalDesdeUnitario(fila.cantidad, v);
                      actualizarFila(fila.id, { costoUnitario: v, costoTotal: nuevoTotal });
                    }}
                    style={inputDinero}
                  />
                </div>
              </CampoFormulario>

              <CampoFormulario etiqueta="Costo total (línea)" htmlFor={`${idBase}-ct`}>
                <div style={filaDineroTotal}>
                  <span style={prefijoDolarTotal} aria-hidden="true">
                    $
                  </span>
                  <input
                    id={`${idBase}-ct`}
                    className="app-input-field"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={fila.costoTotal}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') {
                        actualizarFila(fila.id, { costoTotal: '', costoUnitario: '' });
                        return;
                      }
                      const nuevoCu = recalcularUnitarioDesdeTotal(fila.cantidad, v);
                      actualizarFila(fila.id, { costoTotal: v, costoUnitario: nuevoCu });
                    }}
                    style={inputDineroTotal}
                  />
                </div>
              </CampoFormulario>

              <CampoFormulario etiqueta="Ubicación" htmlFor={`${idBase}-ubic`}>
                <select
                  id={`${idBase}-ubic`}
                  className="app-input-field"
                  value={fila.ubicacion}
                  onChange={(e) => actualizarFila(fila.id, { ubicacion: e.target.value })}
                  style={estiloInputCampo}
                >
                  <option value="">Selecciona ubicación</option>
                  {OPCIONES_UBICACION.map((valor) => (
                    <option key={valor} value={valor}>
                      {valor}
                    </option>
                  ))}
                </select>
              </CampoFormulario>
            </div>
          );
        })}
      </div>
    </div>
  );
}
