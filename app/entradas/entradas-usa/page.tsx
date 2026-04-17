'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { canMutate, getUserRole, isViewer, type AppRole } from '@/lib/roles';
import {
  buscarInventarioEntrada,
  obtenerOrganizacionParaEntrada,
} from '@/lib/entrada-inventario';
import {
  construirStockNuevoPorProducto,
  crearFilaVaciaEntradaItem,
  filasEntradaDesdeAnalisisFactura,
  type EntradaItemFila,
} from '@/lib/entrada-item-fila';
import {
  guardarEntradaConItems,
  parsearFilasEntradaParaGuardar,
} from '@/lib/guardar-entrada-con-items';
import { EntradaItemsSeccion } from '@/components/EntradaItemsSeccion';
import { formatoDosDecimales } from '@/lib/format-money';
import { CampoFormulario } from '@/components/CampoFormulario';
import {
  appBtnPrimario,
  appBtnPrimarioDisabled,
  appCardInner,
  appFondoMain,
  appInput,
  appNavLink,
  appTituloPagina,
} from '@/lib/app-ui';
import { subirImagenFacturaAlBucket } from '@/lib/subir-factura-storage';
import { solicitarAnalisisFactura } from '@/lib/analizar-factura-client';
import { fechaTextoAInputDate, totalTextoACostoTotal } from '@/lib/factura-campos-helpers';
import {
  estiloInputFileOcultoMovil,
  esProbableImagenFactura,
  logFacturaMovil,
} from '@/lib/factura-archivo-movil';

type EntradaItemResumen = {
  producto: string | null;
  cantidad: number | null;
  unidad: string | null;
  costo_unitario: number | null;
  costo_total: number | null;
  ubicacion: string | null;
};

type EntradaResumen = {
  proveedor?: string | null;
  numero_factura?: string | null;
  costo_total?: number | null;
  entrada_items?: EntradaItemResumen[] | null;
};

export default function EntradasPage() {
  const router = useRouter();

  const [cargando, setCargando] = useState(false);
  const [ultimaEntrada, setUltimaEntrada] = useState<EntradaResumen | null>(null);
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [rolListo, setRolListo] = useState(false);

  // Factura
  const [proveedor, setProveedor] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fecha, setFecha] = useState('');
  /** Total del documento (referencia, p. ej. OCR); no sustituye totales por línea. */
  const [costoTotalFactura, setCostoTotalFactura] = useState('');

  const [filasItems, setFilasItems] = useState<EntradaItemFila[]>(() => [
    crearFilaVaciaEntradaItem(),
  ]);
  const [notas, setNotas] = useState('');
  const [primeraCapturaPorProducto, setPrimeraCapturaPorProducto] = useState<
    Record<string, boolean>
  >({});
  const [validandoPrimeraCaptura, setValidandoPrimeraCaptura] = useState(false);
  /** undefined = aún cargando; null/string = listo para filtrar inventario por organización */
  const [orgIdPerfil, setOrgIdPerfil] = useState<string | null | undefined>(
    undefined
  );

  const [archivoFactura, setArchivoFactura] = useState<File | null>(null);
  const [previewFacturaUrl, setPreviewFacturaUrl] = useState<string | null>(
    null
  );
  const refInputArchivoFactura = useRef<HTMLInputElement>(null);
  const refInputCamaraFactura = useRef<HTMLInputElement>(null);
  const [analizandoFactura, setAnalizandoFactura] = useState(false);

  const aplicarArchivoFacturaDesde =
    (origenInput: 'galeria' | 'camara') =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      logFacturaMovil('usa', 'onChange', { origenInput });
      const list = input.files;
      if (!list || list.length === 0) {
        logFacturaMovil('usa', 'onChange: sin archivo (cancelación o vacío)');
        queueMicrotask(() => {
          input.value = '';
        });
        return;
      }
      const file = list[0];
      logFacturaMovil('usa', 'archivo detectado', {
        nombre: file.name,
        tipo: file.type || '(vacío)',
        tamaño: file.size,
      });
      if (!esProbableImagenFactura(file, origenInput)) {
        alert(
          'Solo se permiten archivos de imagen (JPG, PNG, HEIC, etc.). Si el problema continúa, prueba con otra foto o desde galería.'
        );
        queueMicrotask(() => {
          input.value = '';
        });
        return;
      }
      setPreviewFacturaUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        const url = URL.createObjectURL(file);
        logFacturaMovil('usa', 'preview: createObjectURL generado');
        return url;
      });
      setArchivoFactura(file);
      setFilasItems([crearFilaVaciaEntradaItem()]);
      logFacturaMovil('usa', 'estado: archivoFactura actualizado');
      queueMicrotask(() => {
        input.value = '';
      });
    };

  useEffect(() => {
    return () => {
      if (previewFacturaUrl) URL.revokeObjectURL(previewFacturaUrl);
    };
  }, [previewFacturaUrl]);

  const handleAnalizarFactura = async () => {
    if (!archivoFactura) {
      alert('Primero selecciona una factura');
      return;
    }
    logFacturaMovil('usa', 'Analizar Factura: envío a API', {
      nombre: archivoFactura.name,
      tipo: archivoFactura.type || '(vacío)',
      tamaño: archivoFactura.size,
    });
    setAnalizandoFactura(true);
    try {
      const result = await solicitarAnalisisFactura(archivoFactura);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      const { datos } = result;
      if (datos.proveedor.trim()) setProveedor(datos.proveedor.trim());
      if (datos.numero_factura.trim()) {
        setNumeroFactura(datos.numero_factura.trim());
      }
      const f = fechaTextoAInputDate(datos.fecha);
      if (f) setFecha(f);
      const tot = totalTextoACostoTotal(datos.total);
      if (tot) setCostoTotalFactura(tot);
      setFilasItems(filasEntradaDesdeAnalisisFactura(datos.items ?? []));
      console.log('[Entradas USA] Items detectados en factura:', datos.items);
    } catch {
      alert('No se pudo analizar la factura');
    } finally {
      setAnalizandoFactura(false);
    }
  };

  const estiloInputCampo: CSSProperties = {
    ...appInput,
    marginBottom: 0,
  };

  const filaDinero: CSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    width: '100%',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  const prefijoDolar: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 12px',
    fontWeight: 600,
    fontSize: 16,
    color: '#475569',
    background: '#eef2f7',
    borderRight: '1px solid #e2e8f0',
    flexShrink: 0,
  };

  const inputDinero: CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '13px 15px',
    border: 'none',
    borderRadius: 0,
    background: '#f8fafc',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const filaDineroTotal: CSSProperties = {
    ...filaDinero,
    background: '#f1f5f9',
    borderColor: '#cbd5e1',
  };

  const prefijoDolarTotal: CSSProperties = {
    ...prefijoDolar,
    background: '#e2e8f0',
    color: '#64748b',
  };

  const inputDineroTotal: CSSProperties = {
    ...inputDinero,
    background: '#f1f5f9',
    color: '#475569',
  };

  const estiloTituloSeccion: CSSProperties = {
    marginTop: 0,
    marginBottom: 12,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 700,
  };

  const estiloTarjeta: CSSProperties = {
    background: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    marginTop: 20,
  };

  const estiloTextoChico: CSSProperties = {
    margin: '4px 0 0 0',
    color: '#475569',
    fontSize: 14,
  };

  const cargarUltimaEntrada = async () => {
    const { data, error } = await supabase
      .from('entradas')
      .select(
        `
        id,
        proveedor,
        numero_factura,
        costo_total,
        entrada_items ( producto, cantidad, unidad, costo_unitario, costo_total, ubicacion )
      `
      )
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setUltimaEntrada(data as EntradaResumen);
    }
  };

  useEffect(() => {
    cargarUltimaEntrada();
  }, []);

  useEffect(() => {
    void getUserRole(supabase).then((r) => {
      setAppRole(r);
      setRolListo(true);
    });
  }, []);

  useEffect(() => {
    void obtenerOrganizacionParaEntrada(supabase).then(setOrgIdPerfil);
  }, []);

  const redondear2 = (valor: number) => {
    return Math.round(valor * 100) / 100;
  };

  const firmaProductosItems = useMemo(() => {
    return filasItems
      .map((f) => f.producto.trim().toLowerCase())
      .filter(Boolean)
      .sort()
      .join('|');
  }, [filasItems]);

  const puedeRegistrar = rolListo && canMutate(appRole);
  const modoSoloLectura = rolListo && isViewer(appRole);

  const handleSubmit = async () => {
    if (!puedeRegistrar) {
      alert('No tienes permiso para registrar entradas (solo lectura).');
      return;
    }

    const parsed = parsearFilasEntradaParaGuardar(filasItems, redondear2);
    if (!parsed.ok) {
      alert(parsed.mensaje);
      return;
    }

    const stockMap = construirStockNuevoPorProducto(
      filasItems,
      primeraCapturaPorProducto
    );

    setCargando(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) {
        alert(
          'No hay sesión activa o el usuario no es válido. Cierra sesión e inicia sesión de nuevo.'
        );
        setCargando(false);
        return;
      }

      let fotoFacturaPublica: string | null = null;
      if (archivoFactura) {
        logFacturaMovil('usa', 'guardar: inicio upload a Supabase', {
          nombre: archivoFactura.name,
          tipo: archivoFactura.type || '(vacío)',
          tamaño: archivoFactura.size,
        });
        const subida = await subirImagenFacturaAlBucket(supabase, archivoFactura);
        if ('error' in subida) {
          logFacturaMovil('usa', 'guardar: upload falló', { error: subida.error });
          alert(
            subida.error ||
              'No se pudo subir la foto de la factura. Comprueba tu conexión e inténtalo de nuevo.'
          );
          setCargando(false);
          return;
        }
        fotoFacturaPublica = subida.url;
        logFacturaMovil('usa', 'guardar: upload terminado OK');
      } else {
        logFacturaMovil('usa', 'guardar: sin archivoFactura (foto_factura null)');
      }

      const costoDocNum = Number(costoTotalFactura);
      const costoFacturaRef =
        costoTotalFactura.trim() && Number.isFinite(costoDocNum) && costoDocNum > 0
          ? redondear2(costoDocNum)
          : null;

      const result = await guardarEntradaConItems({
        supabase,
        userId,
        origen: 'USA',
        proveedor,
        numeroFactura,
        fecha: fecha || null,
        notas,
        fotoFactura: fotoFacturaPublica,
        costoTotalFactura: costoFacturaRef,
        items: parsed.items,
        stockNuevoPorProducto: stockMap,
      });

      if (!result.ok) {
        alert(result.mensaje);
        setCargando(false);
        return;
      }

      setProveedor('');
      setNumeroFactura('');
      setFecha('');
      setCostoTotalFactura('');
      setFilasItems([crearFilaVaciaEntradaItem()]);
      setNotas('');
      setPrimeraCapturaPorProducto({});

      setArchivoFactura(null);
      setPreviewFacturaUrl(null);
      if (refInputArchivoFactura.current) refInputArchivoFactura.current.value = '';
      if (refInputCamaraFactura.current) refInputCamaraFactura.current.value = '';

      alert('Entrada guardada 🔥');
      await cargarUltimaEntrada();
    } catch (error) {
      console.error('Error inesperado:', error);
      alert('Algo falló al guardar la entrada');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (orgIdPerfil === undefined) {
      return;
    }

    const productos = [
      ...new Set(
        filasItems.map((f) => f.producto.trim().toLowerCase()).filter(Boolean)
      ),
    ];

    if (productos.length === 0) {
      setPrimeraCapturaPorProducto({});
      setValidandoPrimeraCaptura(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setValidandoPrimeraCaptura(true);
      const next: Record<string, boolean> = {};

      for (const p of productos) {
        const { data, error } = await buscarInventarioEntrada(
          supabase,
          p,
          'USA',
          orgIdPerfil
        );
        if (error) {
          setValidandoPrimeraCaptura(false);
          return;
        }
        next[p] = !data;
      }

      setPrimeraCapturaPorProducto(next);
      setValidandoPrimeraCaptura(false);
    }, 380);

    return () => clearTimeout(timeout);
  }, [firmaProductosItems, orgIdPerfil]);

  return (
    <main style={appFondoMain}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div
          style={{
            ...appCardInner,
            padding: 20,
          }}
        >
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

          <button
            type="button"
            className="app-nav-link"
            onClick={() => router.push('/dashboard')}
            style={{ ...appNavLink, marginBottom: 10 }}
          >
            ← Inicio
          </button>

          <h2
            style={{
              ...appTituloPagina,
              marginBottom: 18,
            }}
          >
            Entrada <span className="fi fi-us" style={{ marginLeft: 8 }}></span>
          </h2>

          {modoSoloLectura && (
            <p
              style={{
                margin: '0 0 14px 0',
                textAlign: 'center',
                color: '#B45309',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Modo solo lectura
            </p>
          )}

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <h4 style={estiloTituloSeccion}>Factura</h4>

            <div style={{ marginBottom: 16, position: 'relative' }}>
              <p style={{ marginBottom: 8, fontWeight: 600 }}>Foto de factura</p>

              <input
                ref={refInputArchivoFactura}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
                multiple={false}
                style={estiloInputFileOcultoMovil}
                tabIndex={-1}
                aria-hidden
                onChange={aplicarArchivoFacturaDesde('galeria')}
              />
              <input
                ref={refInputCamaraFactura}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*"
                multiple={false}
                capture="environment"
                style={estiloInputFileOcultoMovil}
                tabIndex={-1}
                aria-hidden
                onChange={aplicarArchivoFacturaDesde('camara')}
              />

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button
                  type="button"
                  className="app-btn-primario"
                  disabled={!puedeRegistrar || cargando || analizandoFactura}
                  style={{
                    ...appBtnPrimario,
                    flex: 1,
                    width: 'auto',
                    minWidth: 0,
                    padding: '12px 14px',
                  }}
                  onClick={() => {
                    logFacturaMovil('usa', 'click Subir Factura');
                    refInputArchivoFactura.current?.click();
                  }}
                >
                  Subir Factura
                </button>

                <button
                  type="button"
                  className="app-btn-primario"
                  disabled={!puedeRegistrar || cargando || analizandoFactura}
                  style={{
                    ...appBtnPrimario,
                    flex: 1,
                    width: 'auto',
                    minWidth: 0,
                    padding: '12px 14px',
                  }}
                  onClick={() => {
                    logFacturaMovil('usa', 'click Tomar Foto');
                    refInputCamaraFactura.current?.click();
                  }}
                >
                  Tomar Foto
                </button>
              </div>

              <button
                type="button"
                className="app-btn-primario"
                disabled={!puedeRegistrar || cargando || analizandoFactura}
                style={{
                  ...appBtnPrimario,
                  width: '100%',
                  padding: '12px 14px',
                  marginBottom: 10,
                  background: '#334155',
                  boxShadow: '0 4px 16px rgba(51, 65, 85, 0.35)',
                }}
                onClick={() => void handleAnalizarFactura()}
              >
                {analizandoFactura ? 'Analizando...' : '🤖 Analizar Factura'}
              </button>

              <div
                style={{
                  height: 150,
                  background: '#F1F5F9',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  fontSize: 14,
                  overflow: 'hidden',
                  padding: previewFacturaUrl ? 8 : 0,
                  boxSizing: 'border-box',
                }}
              >
                {cargando && archivoFactura ? (
                  <span style={{ textAlign: 'center', padding: '0 12px' }}>
                    Subiendo imagen al servidor...
                  </span>
                ) : previewFacturaUrl ? (
                  <img
                    src={previewFacturaUrl}
                    alt="Vista previa de la factura"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <span>Sin imagen</span>
                )}
              </div>
            </div>

            <CampoFormulario etiqueta="Proveedor" htmlFor="entrada-usa-proveedor">
              <input
                id="entrada-usa-proveedor"
                className="app-input-field"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                style={estiloInputCampo}
              />
            </CampoFormulario>

            <CampoFormulario etiqueta="Número de factura" htmlFor="entrada-usa-factura">
              <input
                id="entrada-usa-factura"
                className="app-input-field"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                style={estiloInputCampo}
              />
            </CampoFormulario>

            <CampoFormulario etiqueta="Fecha" htmlFor="entrada-usa-fecha">
              <input
                id="entrada-usa-fecha"
                className="app-input-field"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={estiloInputCampo}
              />
            </CampoFormulario>

            <CampoFormulario
              etiqueta="Total factura (referencia)"
              htmlFor="entrada-usa-total-doc"
            >
              <div style={filaDineroTotal}>
                <span style={prefijoDolarTotal} aria-hidden="true">
                  $
                </span>
                <input
                  id="entrada-usa-total-doc"
                  className="app-input-field"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional — total del documento"
                  value={costoTotalFactura}
                  onChange={(e) => setCostoTotalFactura(e.target.value)}
                  style={inputDineroTotal}
                />
              </div>
            </CampoFormulario>
          </div>

          <EntradaItemsSeccion
            prefijoIds="usa"
            filas={filasItems}
            setFilas={setFilasItems}
            primeraCapturaPorProducto={primeraCapturaPorProducto}
            validandoPrimeraCaptura={validandoPrimeraCaptura}
            puedeRegistrar={puedeRegistrar}
            estiloInputCampo={estiloInputCampo}
            estiloTituloSeccion={estiloTituloSeccion}
            filaDinero={filaDinero}
            prefijoDolar={prefijoDolar}
            inputDinero={inputDinero}
            filaDineroTotal={filaDineroTotal}
            prefijoDolarTotal={prefijoDolarTotal}
            inputDineroTotal={inputDineroTotal}
          />

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              marginTop: 12,
            }}
          >
            <CampoFormulario etiqueta="Notas" htmlFor="entrada-usa-notas">
              <textarea
                id="entrada-usa-notas"
                className="app-input-field"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                style={{
                  ...estiloInputCampo,
                  height: 90,
                  resize: 'vertical',
                }}
              />
            </CampoFormulario>
          </div>

          <button
            type="button"
            className="app-btn-primario"
            onClick={handleSubmit}
            disabled={cargando || !puedeRegistrar}
            style={
              cargando || !puedeRegistrar
                ? { ...appBtnPrimarioDisabled, marginTop: 8 }
                : { ...appBtnPrimario, marginTop: 8 }
            }
          >
            {cargando ? 'Guardando...' : !puedeRegistrar ? 'Solo lectura' : 'Guardar Entrada'}
          </button>

          <div style={{ marginTop: 20 }}>
            {!ultimaEntrada ? (
              <p
                style={{
                  color: '#64748B',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                No hay entradas registradas
              </p>
            ) : (
              <div style={estiloTarjeta}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: 16,
                    color: '#1F2937',
                  }}
                >
                  Última entrada
                </p>
                <p style={{ ...estiloTextoChico, marginTop: 8 }}>
                  <strong>Proveedor:</strong> {ultimaEntrada.proveedor || '—'}
                </p>
                <p style={estiloTextoChico}>
                  <strong>Factura:</strong> {ultimaEntrada.numero_factura || '—'}
                </p>
                <p style={estiloTextoChico}>
                  <strong>Total factura (ref.):</strong>{' '}
                  {formatoDosDecimales(ultimaEntrada.costo_total)}
                </p>
                <div style={{ marginTop: 12 }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 600, fontSize: 14 }}>
                    Ítems
                  </p>
                  {(ultimaEntrada.entrada_items?.length ?? 0) === 0 ? (
                    <p style={{ ...estiloTextoChico, margin: 0 }}>Sin renglones</p>
                  ) : (
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: 18,
                        color: '#334155',
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      {(ultimaEntrada.entrada_items ?? []).map((it, i) => (
                        <li key={i}>
                          <strong>{it.producto || '—'}</strong>
                          {' · '}
                          {it.cantidad ?? 0} {it.unidad || ''}
                          {it.ubicacion ? ` · ${it.ubicacion}` : ''}
                          {' · '}
                          Total {formatoDosDecimales(it.costo_total)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}