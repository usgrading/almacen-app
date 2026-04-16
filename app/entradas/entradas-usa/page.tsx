'use client';

import {
  useEffect,
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

type EntradaResumen = {
  producto?: string | null;
  cantidad?: number | null;
  unidad?: string | null;
  ubicacion?: string | null;
  proveedor?: string | null;
  numero_factura?: string | null;
  costo_unitario?: number | null;
  costo_total?: number | null;
};

type InventarioLookup = {
  minimo?: number | null;
  maximo?: number | null;
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

  // Producto
  const [producto, setProducto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [notas, setNotas] = useState('');
  const [minimo, setMinimo] = useState('');
  const [maximo, setMaximo] = useState('');
  const [esPrimeraCaptura, setEsPrimeraCaptura] = useState<boolean | null>(null);
  const [validandoPrimeraCaptura, setValidandoPrimeraCaptura] = useState(false);
  const [orgIdPerfil, setOrgIdPerfil] = useState<string | null | undefined>(
    undefined
  );

  const [archivoFactura, setArchivoFactura] = useState<File | null>(null);
  const [previewFacturaUrl, setPreviewFacturaUrl] = useState<string | null>(
    null
  );
  const refInputArchivoFactura = useRef<HTMLInputElement>(null);
  const refInputCamaraFactura = useRef<HTMLInputElement>(null);

  const aplicarArchivoFactura = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const list = input.files;
    input.value = '';
    if (!list || list.length === 0) return;
    const file = list[0];
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen (JPG, PNG, etc.).');
      return;
    }
    setPreviewFacturaUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setArchivoFactura(file);
  };

  useEffect(() => {
    return () => {
      if (previewFacturaUrl) URL.revokeObjectURL(previewFacturaUrl);
    };
  }, [previewFacturaUrl]);

  const estiloInput: CSSProperties = {
    ...appInput,
    marginBottom: 12,
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

  const estiloInputDeshabilitado: CSSProperties = {
    ...estiloInput,
    color: '#94a3b8',
    background: '#f1f5f9',
    cursor: 'not-allowed',
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
      .select('*')
      .eq('origen', 'USA')
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setUltimaEntrada(data);
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

  const convertirNumero = (valor: string) => {
    if (!valor.trim()) return 0;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  };

  const redondear2 = (valor: number) => {
    return Math.round(valor * 100) / 100;
  };

  const puedeRegistrar = rolListo && canMutate(appRole);
  const modoSoloLectura = rolListo && isViewer(appRole);

  const handleSubmit = async () => {
    if (!puedeRegistrar) {
      alert('No tienes permiso para registrar entradas (solo lectura).');
      return;
    }

    if (!producto.trim()) {
      alert('Escribe el nombre de pieza');
      return;
    }

    if (!cantidad.trim()) {
      alert('Escribe la cantidad');
      return;
    }

    if (!unidad) {
      alert('Selecciona la unidad');
      return;
    }

    if (!ubicacion) {
      alert('Selecciona la ubicación');
      return;
    }

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
        const subida = await subirImagenFacturaAlBucket(supabase, archivoFactura);
        if ('error' in subida) {
          alert(subida.error);
          setCargando(false);
          return;
        }
        fotoFacturaPublica = subida.url;
      }

      const productoNormalizado = producto.trim().toLowerCase();

      const cantidadNum = convertirNumero(cantidad);
      const costoUnitarioNum = convertirNumero(costoUnitario);
      const costoTotalNum = convertirNumero(costoTotal);

      if (cantidadNum <= 0) {
        alert('La cantidad debe ser mayor a 0');
        setCargando(false);
        return;
      }

      let costoUnitarioFinal = 0;
      let costoTotalFinal = 0;

      // Regla: cantidad × costo_unitario = costo_total (ambos con 2 decimales).
      if (costoUnitarioNum > 0) {
        costoUnitarioFinal = redondear2(costoUnitarioNum);
        costoTotalFinal = redondear2(cantidadNum * costoUnitarioFinal);
      } else if (costoTotalNum > 0) {
        costoUnitarioFinal = redondear2(costoTotalNum / cantidadNum);
        costoTotalFinal = redondear2(cantidadNum * costoUnitarioFinal);
      }

      const { data: nuevaEntrada, error: errorEntrada } = await supabase
        .from('entradas')
        .insert([
          {
            proveedor: proveedor.trim() || null,
            numero_factura: numeroFactura.trim() || null,
            fecha: fecha || null,
            producto: productoNormalizado,
            cantidad: cantidadNum,
            unidad,
            costo_unitario: costoUnitarioFinal > 0 ? costoUnitarioFinal : null,
            costo_total: costoTotalFinal > 0 ? costoTotalFinal : null,
            ubicacion,
            notas: notas.trim() || null,
            user_id: userId,
            creado_por: userId,
            foto_pieza: null,
            foto_factura: fotoFacturaPublica,
            origen: 'USA',
          },
        ])
        .select()
        .single();

      if (errorEntrada) {
        console.error('Error entrada:', errorEntrada);
        alert('Error al guardar la entrada: ' + errorEntrada.message);
        setCargando(false);
        return;
      }

      const orgId = await obtenerOrganizacionParaEntrada(supabase);
      if (!orgId) {
        alert(
          'La entrada se guardó, pero no se pudo actualizar el inventario: no hay organización asignada al perfil. Revisa tu sesión o contacta al administrador.'
        );
        setCargando(false);
        return;
      }

      const { data: inventarioExistente, error: errorInventario } =
        await buscarInventarioEntrada(
          supabase,
          productoNormalizado,
          'USA',
          orgId
        );

      if (errorInventario) {
        console.error('Error inventario:', errorInventario);
        alert('Error buscando inventario: ' + errorInventario.message);
        setCargando(false);
        return;
      }

      if (inventarioExistente) {
        const cantidadAnterior = Number(inventarioExistente.cantidad_actual || 0);
        const valorAnterior = Number(inventarioExistente.valor_inventario || 0);
        const costoAnterior = Number(inventarioExistente.costo_unitario || 0);

        const nuevaCantidad = redondear2(cantidadAnterior + cantidadNum);
        const nuevoValorInventario = redondear2(valorAnterior + costoTotalFinal);

        let nuevoCostoUnitario = costoAnterior;

        if (nuevaCantidad > 0 && nuevoValorInventario > 0) {
          nuevoCostoUnitario = redondear2(nuevoValorInventario / nuevaCantidad);
        } else if (costoUnitarioFinal > 0) {
          nuevoCostoUnitario = costoUnitarioFinal;
        }

        const { data: filasActualizadas, error: errorUpdate } = await supabase
          .from('inventario')
          .update({
            cantidad_actual: nuevaCantidad,
            unidad,
            ubicacion,
            origen: 'USA',
            organization_id: orgId,
            costo_unitario: nuevoCostoUnitario > 0 ? nuevoCostoUnitario : null,
            valor_inventario:
              nuevoValorInventario > 0 ? nuevoValorInventario : null,
          })
          .eq('id', inventarioExistente.id)
          .select('id');

        if (errorUpdate) {
          console.error('Error update inventario:', errorUpdate);
          alert('Error actualizando inventario: ' + errorUpdate.message);
          setCargando(false);
          return;
        }
        if (!filasActualizadas?.length) {
          alert(
            'La entrada se guardó, pero el inventario no se actualizó (sin filas afectadas). Suele deberse a permisos RLS o a organization_id en inventario.'
          );
          setCargando(false);
          return;
        }
      } else {
        const minimoNum = Number(minimo);
        const maximoNum = Number(maximo);

        if (!Number.isFinite(minimoNum) || minimoNum <= 0) {
          alert('En primera captura debes seleccionar un mínimo válido');
          setCargando(false);
          return;
        }

        if (!Number.isFinite(maximoNum) || maximoNum <= 0) {
          alert('En primera captura debes seleccionar un máximo válido');
          setCargando(false);
          return;
        }

        if (maximoNum < minimoNum) {
          alert('El máximo debe ser mayor o igual al mínimo');
          setCargando(false);
          return;
        }

        const { data: filasInsertadas, error: errorInsert } = await supabase
          .from('inventario')
          .insert([
            {
              producto: productoNormalizado,
              cantidad_actual: cantidadNum,
              unidad,
              ubicacion,
              origen: 'USA',
              organization_id: orgId,
              costo_unitario: costoUnitarioFinal > 0 ? costoUnitarioFinal : null,
              valor_inventario: costoTotalFinal > 0 ? costoTotalFinal : null,
              minimo: minimoNum,
              maximo: maximoNum,
            },
          ])
          .select('id');

        if (errorInsert) {
          console.error('Error insert inventario:', errorInsert);
          alert(
            'La entrada se guardó, pero no se pudo crear el inventario: ' +
              errorInsert.message
          );
          setCargando(false);
          return;
        }
        if (!filasInsertadas?.length) {
          alert(
            'La entrada se guardó, pero no se creó fila en inventario (revisa permisos RLS o organization_id).'
          );
          setCargando(false);
          return;
        }
      }

      if (nuevaEntrada) {
        setUltimaEntrada(nuevaEntrada);
      }

      setProveedor('');
      setNumeroFactura('');
      setFecha('');
      setProducto('');
      setCantidad('');
      setUnidad('');
      setCostoUnitario('');
      setCostoTotal('');
      setUbicacion('');
      setNotas('');
      setMinimo('');
      setMaximo('');
      setEsPrimeraCaptura(null);

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
  const cantidadNum = Number(cantidad);
  const costoUnitarioNum = Number(costoUnitario);

  if (
    Number.isFinite(cantidadNum) &&
    cantidadNum > 0 &&
    Number.isFinite(costoUnitarioNum) &&
    costoUnitarioNum > 0
  ) {
    const total = Math.round(cantidadNum * costoUnitarioNum * 100) / 100;
    setCostoTotal(total.toFixed(2));
  } else if (!costoUnitario.trim()) {
    setCostoTotal('');
  }
}, [cantidad, costoUnitario]);

  useEffect(() => {
    const productoNormalizado = producto.trim().toLowerCase();

    if (!productoNormalizado) {
      setEsPrimeraCaptura(null);
      setMinimo('');
      setMaximo('');
      return;
    }

    if (orgIdPerfil === undefined) {
      return;
    }

    const timeout = setTimeout(async () => {
      setValidandoPrimeraCaptura(true);

      const { data, error } = await buscarInventarioEntrada(
        supabase,
        productoNormalizado,
        'USA',
        orgIdPerfil
      );

      if (error) {
        setEsPrimeraCaptura(null);
        setValidandoPrimeraCaptura(false);
        return;
      }

      if (data) {
        const item = data as InventarioLookup;
        setEsPrimeraCaptura(false);
        setMinimo(
          item.minimo !== null && item.minimo !== undefined ? String(item.minimo) : ''
        );
        setMaximo(
          item.maximo !== null && item.maximo !== undefined ? String(item.maximo) : ''
        );
      } else {
        setEsPrimeraCaptura(true);
        setMinimo('');
        setMaximo('');
      }

      setValidandoPrimeraCaptura(false);
    }, 350);

    return () => clearTimeout(timeout);
  }, [producto, orgIdPerfil]);

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

            <div style={{ marginBottom: 16 }}>
              <p style={{ marginBottom: 8, fontWeight: 600 }}>Foto de factura</p>

              <input
                ref={refInputArchivoFactura}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                aria-hidden
                onChange={aplicarArchivoFactura}
              />
              <input
                ref={refInputCamaraFactura}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                aria-hidden
                onChange={aplicarArchivoFactura}
              />

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button
                  type="button"
                  className="app-btn-primario"
                  disabled={!puedeRegistrar || cargando}
                  style={{
                    ...appBtnPrimario,
                    flex: 1,
                    width: 'auto',
                    minWidth: 0,
                    padding: '12px 14px',
                  }}
                  onClick={() => refInputArchivoFactura.current?.click()}
                >
                  Subir Factura
                </button>

                <button
                  type="button"
                  className="app-btn-primario"
                  disabled={!puedeRegistrar || cargando}
                  style={{
                    ...appBtnPrimario,
                    flex: 1,
                    width: 'auto',
                    minWidth: 0,
                    padding: '12px 14px',
                  }}
                  onClick={() => refInputCamaraFactura.current?.click()}
                >
                  Tomar Foto
                </button>
              </div>

              <button
                type="button"
                className="app-btn-primario"
                style={{
                  ...appBtnPrimario,
                  width: '100%',
                  padding: '12px 14px',
                  marginBottom: 10,
                  background: '#334155',
                  boxShadow: '0 4px 16px rgba(51, 65, 85, 0.35)',
                }}
              >
                🤖 Analizar Factura
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

            <CampoFormulario etiqueta="Supplier" htmlFor="entrada-usa-proveedor">
              <input
                id="entrada-usa-proveedor"
                className="app-input-field"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                style={estiloInputCampo}
              />
            </CampoFormulario>

            <CampoFormulario etiqueta="Invoice number" htmlFor="entrada-usa-factura">
              <input
                id="entrada-usa-factura"
                className="app-input-field"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                style={estiloInputCampo}
              />
            </CampoFormulario>

            <CampoFormulario etiqueta="Date" htmlFor="entrada-usa-fecha">
              <input
                id="entrada-usa-fecha"
                className="app-input-field"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={estiloInputCampo}
              />
            </CampoFormulario>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              marginTop: 12,
            }}
          >
            <h4 style={estiloTituloSeccion}>Producto</h4>

            <CampoFormulario etiqueta="Part photo" htmlFor="entrada-usa-foto-pieza">
              <input
                id="entrada-usa-foto-pieza"
                className="app-input-field"
                disabled
                style={{ ...estiloInputDeshabilitado, marginBottom: 0 }}
              />
            </CampoFormulario>

            <CampoFormulario etiqueta="Part name" htmlFor="entrada-usa-producto">
              <input
                id="entrada-usa-producto"
                className="app-input-field"
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                style={estiloInputCampo}
              />
            </CampoFormulario>

            {validandoPrimeraCaptura && (
              <p
                style={{
                  marginTop: -6,
                  marginBottom: 10,
                  color: '#64748B',
                  fontSize: 13,
                }}
              >
                Revisando si es primera captura...
              </p>
            )}

            {esPrimeraCaptura && (
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

                <CampoFormulario etiqueta="Minimum stock" htmlFor="entrada-usa-minimo">
                  <select
                    id="entrada-usa-minimo"
                    className="app-input-field"
                    value={minimo}
                    onChange={(e) => setMinimo(e.target.value)}
                    style={estiloInputCampo}
                  >
                    <option value="">Select</option>
                    {Array.from({ length: 200 }, (_, i) => i + 1).map((n) => (
                      <option key={`min-${n}`} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </CampoFormulario>

                <CampoFormulario etiqueta="Maximum stock" htmlFor="entrada-usa-maximo">
                  <select
                    id="entrada-usa-maximo"
                    className="app-input-field"
                    value={maximo}
                    onChange={(e) => setMaximo(e.target.value)}
                    style={estiloInputCampo}
                  >
                    <option value="">Select</option>
                    {Array.from({ length: 200 }, (_, i) => i + 1).map((n) => (
                      <option key={`max-${n}`} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </CampoFormulario>
              </>
            )}

            <CampoFormulario etiqueta="Quantity" htmlFor="entrada-usa-cantidad">
              <input
                id="entrada-usa-cantidad"
                className="app-input-field"
                type="text"
                inputMode="numeric"
                value={cantidad}
                onChange={(e) =>
                  setCantidad(e.target.value.replace(/[^0-9]/g, ''))
                }
                style={estiloInputCampo}
              />
            </CampoFormulario>

            <CampoFormulario etiqueta="Unit" htmlFor="entrada-usa-unidad">
              <select
                id="entrada-usa-unidad"
                className="app-input-field"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                style={estiloInputCampo}
              >
                <option value="" disabled>
                  Select unit
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

            <CampoFormulario etiqueta="Unit cost" htmlFor="entrada-usa-costo-unit">
              <div style={filaDinero}>
                <span style={prefijoDolar} aria-hidden="true">
                  $
                </span>
                <input
                  id="entrada-usa-costo-unit"
                  className="app-input-field"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costoUnitario}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setCostoUnitario('');
                      return;
                    }
                    setCostoUnitario(v);
                  }}
                  style={inputDinero}
                />
              </div>
            </CampoFormulario>

            <CampoFormulario etiqueta="Total cost" htmlFor="entrada-usa-costo-total">
              <div style={filaDineroTotal}>
                <span style={prefijoDolarTotal} aria-hidden="true">
                  $
                </span>
                <input
                  id="entrada-usa-costo-total"
                  className="app-input-field"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Calculated automatically"
                  value={costoTotal}
                  readOnly
                  tabIndex={-1}
                  aria-readonly="true"
                  style={inputDineroTotal}
                />
              </div>
            </CampoFormulario>
            <CampoFormulario etiqueta="Location" htmlFor="entrada-usa-ubicacion">
              <select
                id="entrada-usa-ubicacion"
                className="app-input-field"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                style={estiloInputCampo}
              >
                <option value="">Select location</option>
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((seccion) =>
                  [1, 2, 3, 4].map((nivel) => {
                    const valor = `${seccion}-${nivel}`;
                    return (
                      <option key={valor} value={valor}>
                        {valor}
                      </option>
                    );
                  })
                )}
              </select>
            </CampoFormulario>

            <CampoFormulario etiqueta="Notes" htmlFor="entrada-usa-notas">
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
                    fontSize: 18,
                    color: '#1F2937',
                  }}
                >
                  {ultimaEntrada.producto}
                </p>

                <p
                  style={{
                    margin: '6px 0 10px 0',
                    color: '#475569',
                    fontSize: 15,
                  }}
                >
                  {ultimaEntrada.cantidad} {ultimaEntrada.unidad} -{' '}
                  {ultimaEntrada.ubicacion}
                </p>

                <p style={estiloTextoChico}>
                  <strong>Proveedor:</strong> {ultimaEntrada.proveedor || '—'}
                </p>

                <p style={estiloTextoChico}>
                  <strong>Factura:</strong> {ultimaEntrada.numero_factura || '—'}
                </p>

                <p style={estiloTextoChico}>
                  <strong>Costo unitario:</strong>{' '}
                  {formatoDosDecimales(ultimaEntrada.costo_unitario)}
                </p>

                <p style={estiloTextoChico}>
                  <strong>Costo total:</strong>{' '}
                  {formatoDosDecimales(ultimaEntrada.costo_total)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
