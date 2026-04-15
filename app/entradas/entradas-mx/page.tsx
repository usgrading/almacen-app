'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { canMutate, getUserRole, isViewer, type AppRole } from '@/lib/roles';

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

  const estiloInput: React.CSSProperties = {
    width: '100%',
    padding: 12,
    marginBottom: 12,
    borderRadius: 10,
    border: '1px solid #D1D5DB',
    background: '#F8FAFC',
    color: '#1F2937',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const estiloTituloSeccion: React.CSSProperties = {
    marginTop: 0,
    marginBottom: 12,
    color: '#1E40AF',
    fontSize: 16,
    fontWeight: 700,
  };

  const estiloInputDeshabilitado: React.CSSProperties = {
    ...estiloInput,
    color: '#94A3B8',
    background: '#F1F5F9',
    cursor: 'not-allowed',
  };

  const estiloTarjeta: React.CSSProperties = {
    background: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    color: '#1F2937',
    border: '1px solid #E2E8F0',
    marginTop: 20,
  };

  const estiloTextoChico: React.CSSProperties = {
    margin: '4px 0 0 0',
    color: '#475569',
    fontSize: 14,
  };

  const cargarUltimaEntrada = async () => {
    const { data, error } = await supabase
      .from('entradas')
      .select('*')
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
      const usuarioId = userData.user?.id;
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

      if (costoUnitarioNum > 0 && costoTotalNum > 0) {
        costoUnitarioFinal = redondear2(costoUnitarioNum);
        costoTotalFinal = redondear2(costoTotalNum);
      } else if (costoUnitarioNum > 0) {
        costoUnitarioFinal = redondear2(costoUnitarioNum);
        costoTotalFinal = redondear2(cantidadNum * costoUnitarioNum);
      } else if (costoTotalNum > 0) {
        costoTotalFinal = redondear2(costoTotalNum);
        costoUnitarioFinal = redondear2(costoTotalNum / cantidadNum);
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
            creado_por: usuarioId || null,
            foto_pieza: null,
            foto_factura: null,
            origen: 'MX',
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

      const { data: inventarioExistente, error: errorInventario } =
        await supabase
          .from('inventario')
          .select('*')
          .eq('producto', productoNormalizado)
          .eq('origen', 'MX')
          .maybeSingle();

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

        const { error: errorUpdate } = await supabase
          .from('inventario')
          .update({
            cantidad_actual: nuevaCantidad,
            unidad,
            ubicacion,
            origen: 'MX',
            costo_unitario: nuevoCostoUnitario > 0 ? nuevoCostoUnitario : null,
            valor_inventario:
              nuevoValorInventario > 0 ? nuevoValorInventario : null,
          })
          .eq('id', inventarioExistente.id);

        if (errorUpdate) {
          console.error('Error update inventario:', errorUpdate);
          alert('Error actualizando inventario: ' + errorUpdate.message);
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

        const { error: errorInsert } = await supabase.from('inventario').insert([
          {
            producto: productoNormalizado,
            cantidad_actual: cantidadNum,
            unidad,
            ubicacion,
            origen: 'MX',
            costo_unitario: costoUnitarioFinal > 0 ? costoUnitarioFinal : null,
            valor_inventario: costoTotalFinal > 0 ? costoTotalFinal : null,
            minimo: minimoNum,
            maximo: maximoNum,
          },
        ]);

        if (errorInsert) {
          console.error('Error insert inventario:', errorInsert);
          alert('Error creando inventario: ' + errorInsert.message);
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
    setCostoTotal(String(total));
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

    const timeout = setTimeout(async () => {
      setValidandoPrimeraCaptura(true);

      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .eq('producto', productoNormalizado)
        .eq('origen', 'MX')
        .maybeSingle();

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
  }, [producto]);

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#EEF3F8',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div
          style={{
            background: '#FFFFFF',
            padding: 20,
            borderRadius: 16,
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #DCE5EE',
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
            onClick={() => router.push('/dashboard')}
            style={{
              marginBottom: 10,
              background: 'none',
              border: 'none',
              color: '#1E40AF',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Inicio
          </button>

          <h2
            style={{
              marginTop: 0,
              marginBottom: 18,
              textAlign: 'center',
              color: '#1F2937',
              fontSize: 22,
            }}
          >
            Entrada <span className="fi fi-mx" style={{ marginLeft: 8 }}></span>
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

              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    background: '#1E40AF',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  Subir Factura
                </button>

                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    background: '#1E40AF',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  Tomar Foto
                </button>
              </div>

              <button
                type="button"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  background: '#334155',
                  color: '#fff',
                  border: 'none',
                  marginBottom: 10,
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
                }}
              >
                Sin imagen
              </div>
            </div>

            <input
              placeholder="Proveedor"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              style={estiloInput}
            />

            <input
              placeholder="Número de factura"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              style={estiloInput}
            />

            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={estiloInput}
            />
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              marginTop: 12,
            }}
          >
            <h4 style={estiloTituloSeccion}>Producto</h4>

            <input
              placeholder="Foto de pieza"
              disabled
              style={estiloInputDeshabilitado}
            />

            <input
              placeholder="Nombre de pieza"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              style={estiloInput}
            />

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

                <select
                  value={minimo}
                  onChange={(e) => setMinimo(e.target.value)}
                  style={estiloInput}
                >
                  <option value="">Mínimo</option>
                  {Array.from({ length: 200 }, (_, i) => i + 1).map((n) => (
                    <option key={`min-${n}`} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>

                <select
                  value={maximo}
                  onChange={(e) => setMaximo(e.target.value)}
                  style={estiloInput}
                >
                  <option value="">Máximo</option>
                  {Array.from({ length: 200 }, (_, i) => i + 1).map((n) => (
                    <option key={`max-${n}`} value={String(n)}>
                      {n}
                    </option>
                  ))}
                </select>
              </>
            )}

            <input
              type="text"
              inputMode="numeric"
              placeholder="Cantidad"
              value={cantidad}
              onChange={(e) =>
                setCantidad(e.target.value.replace(/[^0-9]/g, ''))
              }
              style={estiloInput}
            />

            <select
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              style={estiloInput}
            >
              <option value="" disabled>
                Unidad
              </option>
              <option value="Pieza">Pieza</option>
              <option value="Caja">Caja</option>
              <option value="Litros">Litros</option>
              <option value="Galones">Galones</option>
              <option value="Kilos">Kilos</option>
              <option value="Metros">Metros</option>
              <option value="Paquete">Paquete</option>
            </select>

            <input
  type="text"
  inputMode="decimal"
  placeholder="$ Costo unitario"
  value={costoUnitario}
  onChange={(e) =>
    setCostoUnitario(e.target.value.replace(/[^0-9.]/g, ''))
  }
  style={estiloInput}
/>

            <input
  type="text"
  inputMode="decimal"
  placeholder="$ Costo total"
  value={costoTotal}
  readOnly
  style={{
    ...estiloInput,
    background: '#F1F5F9',
    color: '#475569',
  }}
/>

            <select
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              style={estiloInput}
            >
              <option value="">Ubicación</option>
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

            <textarea
              placeholder="Notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              style={{
                ...estiloInput,
                height: 90,
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={cargando || !puedeRegistrar}
            style={{
              width: '100%',
              padding: 16,
              marginTop: 8,
              borderRadius: 12,
              background: puedeRegistrar ? '#1E40AF' : '#94A3B8',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              cursor: puedeRegistrar && !cargando ? 'pointer' : 'not-allowed',
              boxShadow: '0 8px 18px rgba(30, 64, 175, 0.20)',
              opacity: puedeRegistrar ? 1 : 0.85,
            }}
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
                  {ultimaEntrada.costo_unitario ?? '—'}
                </p>

                <p style={estiloTextoChico}>
                  <strong>Costo total:</strong> {ultimaEntrada.costo_total ?? '—'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}