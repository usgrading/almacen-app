'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ensureMiOrganizationId, getMiOrganizationId } from '@/lib/organization';
import { canMutate, getUserRole, isViewer, type AppRole } from '@/lib/roles';
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

type Salida = {
  id: string | number;
  producto: string;
  cantidad: number;
  unidad: string;
  destino: string;
  vehiculo: string;
  autorizado_por: string;
  foto_pieza?: string | null;
  origen: 'MX' | 'USA' | string;
  organization_id?: string | null;
};

type ProductoInventario = {
  id: string | number;
  producto: string;
  unidad: string | null;
  cantidad_actual: number | null;
  origen: 'MX' | 'USA' | string | null;
  minimo?: number | null;
};

export default function SalidasPage() {
  const router = useRouter();

  const [producto, setProducto] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('');
  const [destino, setDestino] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [autorizo, setAutorizo] = useState('');
  const [fotoPieza, setFotoPieza] = useState('');
  const [origen, setOrigen] = useState('');
  const [loading, setLoading] = useState(false);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [productosInventario, setProductosInventario] = useState<ProductoInventario[]>([]);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ProductoInventario[]>([]);
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [rolListo, setRolListo] = useState(false);

  useEffect(() => {
    const cargarSalidas = async () => {
      await ensureMiOrganizationId(supabase);
      const orgId = await getMiOrganizationId(supabase);
      if (!orgId) {
        setSalidas([]);
        return;
      }

      const { data, error } = await supabase
        .from('salidas')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('salidas:', error);
        setSalidas([]);
        return;
      }

      setSalidas((data as Salida[]) || []);
    };

    void cargarSalidas();
  }, []);

  useEffect(() => {
    const cargarProductos = async () => {
      const { data, error } = await supabase
        .from('inventario')
        .select('id, producto, unidad, cantidad_actual, origen')
        .order('producto', { ascending: true });

      if (!error && data) {
        setProductosInventario(data as ProductoInventario[]);
      }
    };

    void cargarProductos();
  }, []);

  useEffect(() => {
    void getUserRole(supabase).then((r) => {
      setAppRole(r);
      setRolListo(true);
    });
  }, []);

  const puedeRegistrar = rolListo && canMutate(appRole);
  const modoSoloLectura = rolListo && isViewer(appRole);

  const handleGuardar = async () => {
    if (!puedeRegistrar) {
      alert('No tienes permiso para registrar salidas (solo lectura).');
      return;
    }

    if (!producto || !cantidad || !unidad || !destino || !vehiculo || !autorizo) {
      alert('Llena todos los campos');
      return;
    }

    if (!origen) {
      alert('Selecciona un producto de la lista para tomar su origen');
      return;
    }

    setLoading(true);

    await ensureMiOrganizationId(supabase);
    const orgId = await getMiOrganizationId(supabase);
    if (!orgId) {
      alert('No se pudo determinar tu organización. Vuelve a iniciar sesión.');
      setLoading(false);
      return;
    }

    const productoNormalizado = producto.trim().toLowerCase();

    const { data: inventarioExistente, error: errorInventario } =
      await supabase
        .from('inventario')
        .select('*')
        .eq('producto', productoNormalizado)
        .eq('origen', origen)
        .maybeSingle();

    if (errorInventario) {
      alert('Error buscando inventario');
      setLoading(false);
      return;
    }

    if (!inventarioExistente) {
      alert('Producto no existe en inventario');
      setLoading(false);
      return;
    }

    if (Number(inventarioExistente.cantidad_actual) < Number(cantidad)) {
      alert('No hay suficiente stock');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('salidas')
      .insert([
        {
          producto: productoNormalizado,
          cantidad: Number(cantidad),
          unidad,
          destino,
          vehiculo,
          autorizado_por: autorizo,
          foto_pieza: fotoPieza,
          origen,
          organization_id: orgId,
        },
      ])
      .select()
      .single();

    if (error) {
      alert('Error: ' + error.message);
      setLoading(false);
      return;
    }

    const nuevaCantidad =
      Number(inventarioExistente.cantidad_actual) - Number(cantidad);
    const minimoConfigurado = Number(inventarioExistente.minimo);
    const hayMinimoValido =
      Number.isFinite(minimoConfigurado) && minimoConfigurado > 0;
    const quedaBajoMinimo = hayMinimoValido && nuevaCantidad < minimoConfigurado;

    await supabase
      .from('inventario')
      .update({
        cantidad_actual: nuevaCantidad,
      })
      .eq('id', inventarioExistente.id);

    if (data) {
      setSalidas((prev) => [data, ...prev]);
    }

    setProducto('');
    setCantidad('');
    setUnidad('');
    setDestino('');
    setVehiculo('');
    setAutorizo('');
    setFotoPieza('');
    setOrigen('');
    setResultadosBusqueda([]);
    setLoading(false);

    if (quedaBajoMinimo) {
      alert(
        `Alarma de stock: "${productoNormalizado}" quedó por debajo del mínimo (${nuevaCantidad} < ${minimoConfigurado}).`
      );
    } else {
      alert('Salida guardada');
    }
  };

  return (
    <main style={appFondoMain}>
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '0 auto',
        }}
      >
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
            Salidas
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

          <CampoFormulario etiqueta="Foto de pieza (opcional)" htmlFor="salidas-foto">
            <input
              id="salidas-foto"
              className="app-input-field"
              value={fotoPieza}
              onChange={(e) => setFotoPieza(e.target.value)}
              style={inputStyleCampo}
            />
          </CampoFormulario>

          <CampoFormulario etiqueta="Producto" htmlFor="salidas-producto">
            <div
              style={{
                position: 'relative',
              }}
            >
              <input
                id="salidas-producto"
                className="app-input-field"
                value={producto}
                onChange={(e) => {
                  const valor = e.target.value;
                  setProducto(valor);
                  setOrigen('');

                  if (!valor.trim()) {
                    setResultadosBusqueda([]);
                    return;
                  }

                  const filtrados = productosInventario.filter((item) =>
                    item.producto.toLowerCase().includes(valor.toLowerCase())
                  );

                  setResultadosBusqueda(filtrados.slice(0, 8));
                }}
                style={{
                  ...inputStyleCampo,
                  paddingRight: 44,
                }}
              />

            {origen && (
              <div
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none',
                }}
              >
                {origen === 'MX' ? (
                  <span className="fi fi-mx"></span>
                ) : origen === 'USA' ? (
                  <span className="fi fi-us"></span>
                ) : null}
              </div>
            )}
            </div>
          </CampoFormulario>

          {resultadosBusqueda.length > 0 && (
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: 10,
                marginTop: -8,
                marginBottom: 12,
                overflow: 'hidden',
                boxShadow: '0 8px 18px rgba(0,0,0,0.08)',
              }}
            >
              {resultadosBusqueda.map((item, index) => (
                <div
                  key={`${item.producto}-${item.origen}-${index}`}
                  onClick={() => {
                    setProducto(item.producto);
                    if (item.unidad) {
                      setUnidad(item.unidad);
                    }
                    setOrigen(item.origen || '');
                    setResultadosBusqueda([]);
                  }}
                  style={{
                    padding: 12,
                    cursor: 'pointer',
                    borderBottom:
                      index !== resultadosBusqueda.length - 1
                        ? '1px solid #E2E8F0'
                        : 'none',
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        color: '#1F2937',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.producto}
                    </div>

                    <div style={{ fontSize: 13, color: '#64748B' }}>
                      {item.cantidad_actual ?? 0} {item.unidad || ''}
                    </div>
                  </div>

                  <div
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 28,
                    }}
                  >
                    {item.origen === 'MX' ? (
                      <span className="fi fi-mx"></span>
                    ) : item.origen === 'USA' ? (
                      <span className="fi fi-us"></span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <CampoFormulario etiqueta="Cantidad" htmlFor="salidas-cantidad">
            <input
              id="salidas-cantidad"
              className="app-input-field"
              type="text"
              inputMode="numeric"
              value={cantidad}
              onChange={(e) =>
                setCantidad(e.target.value.replace(/[^0-9]/g, ''))
              }
              style={inputStyleCampo}
            />
          </CampoFormulario>

          <CampoFormulario etiqueta="Unidad" htmlFor="salidas-unidad">
            <select
              id="salidas-unidad"
              className="app-input-field"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              style={inputStyleCampo}
            >
              <option value="">Selecciona unidad</option>
              <option value="Pieza">Pieza</option>
              <option value="Caja">Caja</option>
              <option value="Litros">Litros</option>
              <option value="Galones">Galones</option>
              <option value="Kilos">Kilos</option>
              <option value="Metros">Metros</option>
              <option value="Paquete">Paquete</option>
            </select>
          </CampoFormulario>

          <CampoFormulario etiqueta="Destino" htmlFor="salidas-destino">
            <input
              id="salidas-destino"
              className="app-input-field"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              style={inputStyleCampo}
            />
          </CampoFormulario>

          <CampoFormulario etiqueta="Vehículo" htmlFor="salidas-vehiculo">
            <input
              id="salidas-vehiculo"
              className="app-input-field"
              value={vehiculo}
              onChange={(e) => setVehiculo(e.target.value)}
              style={inputStyleCampo}
            />
          </CampoFormulario>

          <CampoFormulario etiqueta="Autorizó" htmlFor="salidas-autorizo">
            <input
              id="salidas-autorizo"
              className="app-input-field"
              value={autorizo}
              onChange={(e) => setAutorizo(e.target.value)}
              style={inputStyleCampo}
            />
          </CampoFormulario>

          <button
            type="button"
            className="app-btn-primario"
            onClick={handleGuardar}
            disabled={loading || !puedeRegistrar}
            style={
              loading || !puedeRegistrar
                ? { ...appBtnPrimarioDisabled, marginTop: 4 }
                : { ...appBtnPrimario, marginTop: 4 }
            }
          >
            {loading ? 'Guardando...' : !puedeRegistrar ? 'Solo lectura' : 'Guardar salida'}
          </button>

          <div style={{ marginTop: 20 }}>
            {salidas.length === 0 ? (
              <p
                style={{
                  color: '#64748B',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                No hay salidas registradas
              </p>
            ) : (
              <div style={cardStyle}>
                <div
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#1F2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {salidas[0].producto}
                  </span>

                  <span style={{ flexShrink: 0 }}>
                    {salidas[0].origen === 'MX' ? (
                      <span className="fi fi-mx"></span>
                    ) : salidas[0].origen === 'USA' ? (
                      <span className="fi fi-us"></span>
                    ) : null}
                  </span>
                </div>

                <p
                  style={{
                    margin: '6px 0 10px 0',
                    color: '#475569',
                    fontSize: 15,
                  }}
                >
                  {salidas[0].cantidad} {salidas[0].unidad} - {salidas[0].destino}
                </p>

                <p style={smallText}>
                  <strong>Vehículo:</strong> {salidas[0].vehiculo}
                </p>

                <p style={smallText}>
                  <strong>Autorizó:</strong> {salidas[0].autorizado_por}
                </p>

                {salidas[0].foto_pieza && (
                  <p style={smallText}>
                    <strong>Foto:</strong> {salidas[0].foto_pieza}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

const inputStyle: CSSProperties = {
  ...appInput,
  marginBottom: 12,
};

const inputStyleCampo: CSSProperties = {
  ...appInput,
  marginBottom: 0,
};

const cardStyle: CSSProperties = {
  background: '#f8fafc',
  padding: 16,
  borderRadius: 12,
  color: '#0f172a',
  border: '1px solid #e2e8f0',
};

const smallText: React.CSSProperties = {
  margin: '4px 0 0 0',
  color: '#475569',
  fontSize: 14,
};
