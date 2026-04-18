import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buscarInventarioEntrada,
  obtenerOrganizacionParaEntrada,
} from '@/lib/entrada-inventario';

export type ItemEntradaGuardado = {
  productoNormalizado: string;
  cantidad: number;
  unidad: string;
  costoUnitarioFinal: number;
  costoTotalFinal: number;
  ubicacion: string;
};

type GrupoInventario = {
  productoNormalizado: string;
  cantidad: number;
  sumCostoTotal: number;
  unidad: string;
  ubicacion: string;
};

function redondear2(valor: number) {
  return Math.round(valor * 100) / 100;
}

function convertirNumeroForm(valor: string) {
  if (!valor.trim()) return 0;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function agruparItemsParaInventario(items: ItemEntradaGuardado[]): GrupoInventario[] {
  const map = new Map<string, GrupoInventario>();
  for (const it of items) {
    const prev = map.get(it.productoNormalizado);
    if (!prev) {
      map.set(it.productoNormalizado, {
        productoNormalizado: it.productoNormalizado,
        cantidad: it.cantidad,
        sumCostoTotal: it.costoTotalFinal,
        unidad: it.unidad,
        ubicacion: it.ubicacion,
      });
    } else {
      prev.cantidad = redondear2(prev.cantidad + it.cantidad);
      prev.sumCostoTotal = redondear2(prev.sumCostoTotal + it.costoTotalFinal);
    }
  }
  return [...map.values()];
}

export type ResultadoGuardarEntrada =
  | { ok: true; entradaId: string }
  | { ok: false; mensaje: string };

/**
 * Inserta cabecera + renglones y actualiza inventario por producto (origen MX/USA).
 */
export async function guardarEntradaConItems(params: {
  supabase: SupabaseClient;
  userId: string;
  origen: 'MX' | 'USA';
  proveedor: string;
  numeroFactura: string;
  fecha: string | null;
  notas: string | null;
  fotoFactura: string | null;
  costoTotalFactura: number | null;
  items: ItemEntradaGuardado[];
  stockNuevoPorProducto: Record<string, { minimo: number; maximo: number }>;
}): Promise<ResultadoGuardarEntrada> {
  const {
    supabase,
    userId,
    origen,
    proveedor,
    numeroFactura,
    fecha,
    notas,
    fotoFactura,
    costoTotalFactura,
    items,
    stockNuevoPorProducto,
  } = params;

  if (items.length === 0) {
    return { ok: false, mensaje: 'Agrega al menos un ítem con datos válidos.' };
  }

  console.log(
    '[guardar-entrada][DIAG] Items recibidos — el nombre para DB es `entrada_items.producto` (viene de `productoNormalizado`; la cabecera `entradas` no lleva `producto` en el esquema actual):',
    JSON.stringify(
      items.map((it) => ({
        productoNormalizado: it.productoNormalizado,
        cantidad: it.cantidad,
        unidad: it.unidad,
        ubicacion: it.ubicacion,
      })),
      null,
      2
    )
  );

  const orgId = await obtenerOrganizacionParaEntrada(supabase);
  if (!orgId) {
    return {
      ok: false,
      mensaje:
        'No hay organización asignada al perfil. Revisa tu sesión o contacta al administrador.',
    };
  }

  const gruposPrev = agruparItemsParaInventario(items);
  for (const g of gruposPrev) {
    const { data: inv, error: errInv } = await buscarInventarioEntrada(
      supabase,
      g.productoNormalizado,
      origen,
      orgId
    );
    if (errInv) {
      return { ok: false, mensaje: 'Error buscando inventario: ' + errInv.message };
    }
    if (inv) continue;

    const stock = stockNuevoPorProducto[g.productoNormalizado];
    if (!stock) {
      return {
        ok: false,
        mensaje: `Falta stock mínimo y máximo para el producto nuevo: "${g.productoNormalizado}".`,
      };
    }
    const minimoNum = stock.minimo;
    const maximoNum = stock.maximo;
    if (!Number.isFinite(minimoNum) || minimoNum <= 0) {
      return {
        ok: false,
        mensaje: `En primera captura debes definir un mínimo válido para "${g.productoNormalizado}".`,
      };
    }
    if (!Number.isFinite(maximoNum) || maximoNum <= 0) {
      return {
        ok: false,
        mensaje: `En primera captura debes definir un máximo válido para "${g.productoNormalizado}".`,
      };
    }
    if (maximoNum < minimoNum) {
      return {
        ok: false,
        mensaje: `El máximo debe ser mayor o igual al mínimo para "${g.productoNormalizado}".`,
      };
    }
  }

  const filaInsertEntradas = {
    proveedor: proveedor.trim() || null,
    numero_factura: numeroFactura.trim() || null,
    fecha: fecha || null,
    notas: (notas ?? '').trim() || null,
    user_id: userId,
    creado_por: userId,
    foto_factura: fotoFactura,
    origen,
    organization_id: orgId,
    costo_total:
      costoTotalFactura !== null && costoTotalFactura > 0 ? costoTotalFactura : null,
  };

  console.log(
    '[guardar-entrada][DIAG] Payload exacto insert `public.entradas` (propiedades enviadas; NO se envía `producto` aquí):',
    JSON.stringify(filaInsertEntradas, null, 2)
  );

  const { data: entradaRow, error: errorEntrada } = await supabase
    .from('entradas')
    .insert([filaInsertEntradas])
    .select('id')
    .single();

  if (errorEntrada || !entradaRow?.id) {
    console.error('Error entrada:', errorEntrada);
    return {
      ok: false,
      mensaje: 'Error al guardar la entrada: ' + (errorEntrada?.message ?? 'desconocido'),
    };
  }

  const entradaId = entradaRow.id as string;

  /** Clave columna PG `"order"` vía string: evita confusiones con palabra reservada y con payloads viejos `orden`. */
  const filasDetalle: Record<string, unknown>[] = items.map((it, index) => {
    const row: Record<string, unknown> = {
      entrada_id: entradaId,
      producto: it.productoNormalizado,
      cantidad: it.cantidad,
      unidad: it.unidad,
      costo_unitario: it.costoUnitarioFinal > 0 ? it.costoUnitarioFinal : null,
      costo_total: it.costoTotalFinal > 0 ? it.costoTotalFinal : null,
      ubicacion: it.ubicacion,
      foto_pieza: null,
    };
    row['order'] = index;
    return row;
  });

  console.log(
    '[guardar-entrada][DIAG] Array final insert `public.entrada_items` — campo NOT NULL `producto` por fila:',
    JSON.stringify(filasDetalle, null, 2)
  );

  const { error: errorItems } = await supabase.from('entrada_items').insert(filasDetalle);

  if (errorItems) {
    console.error('Error entrada_items:', errorItems);
    await supabase.from('entradas').delete().eq('id', entradaId);
    return {
      ok: false,
      mensaje: 'Error al guardar los ítems de la entrada: ' + errorItems.message,
    };
  }

  const grupos = gruposPrev;

  const revertirEntradaGuardada = async () => {
    await supabase.from('entradas').delete().eq('id', entradaId);
  };

  for (const g of grupos) {
    const costoUnitarioGrupo =
      g.cantidad > 0 && g.sumCostoTotal > 0
        ? redondear2(g.sumCostoTotal / g.cantidad)
        : 0;
    const costoTotalGrupo = redondear2(g.sumCostoTotal);

    const { data: inventarioExistente, error: errorInventario } =
      await buscarInventarioEntrada(supabase, g.productoNormalizado, origen, orgId);

    if (errorInventario) {
      console.error('Error inventario:', errorInventario);
      await revertirEntradaGuardada();
      return {
        ok: false,
        mensaje: 'Error buscando inventario: ' + errorInventario.message,
      };
    }

    if (inventarioExistente) {
      const cantidadAnterior = Number(inventarioExistente.cantidad_actual || 0);
      const valorAnterior = Number(inventarioExistente.valor_inventario || 0);
      const costoAnterior = Number(inventarioExistente.costo_unitario || 0);

      const nuevaCantidad = redondear2(cantidadAnterior + g.cantidad);
      const nuevoValorInventario = redondear2(valorAnterior + costoTotalGrupo);

      let nuevoCostoUnitario = costoAnterior;
      if (nuevaCantidad > 0 && nuevoValorInventario > 0) {
        nuevoCostoUnitario = redondear2(nuevoValorInventario / nuevaCantidad);
      } else if (costoUnitarioGrupo > 0) {
        nuevoCostoUnitario = costoUnitarioGrupo;
      }

      const { data: filasActualizadas, error: errorUpdate } = await supabase
        .from('inventario')
        .update({
          cantidad_actual: nuevaCantidad,
          unidad: g.unidad,
          ubicacion: g.ubicacion,
          origen,
          organization_id: orgId,
          costo_unitario: nuevoCostoUnitario > 0 ? nuevoCostoUnitario : null,
          valor_inventario: nuevoValorInventario > 0 ? nuevoValorInventario : null,
        })
        .eq('id', inventarioExistente.id)
        .select('id');

      if (errorUpdate) {
        console.error('Error update inventario:', errorUpdate);
        await revertirEntradaGuardada();
        return {
          ok: false,
          mensaje: 'Error actualizando inventario: ' + errorUpdate.message,
        };
      }
      if (!filasActualizadas?.length) {
        await revertirEntradaGuardada();
        return {
          ok: false,
          mensaje:
            'No se pudo actualizar el inventario (sin filas afectadas). Suele deberse a permisos RLS o a organization_id en inventario.',
        };
      }
    } else {
      const stock = stockNuevoPorProducto[g.productoNormalizado]!;
      const minimoNum = stock.minimo;
      const maximoNum = stock.maximo;

      const { data: filasInsertadas, error: errorInsert } = await supabase
        .from('inventario')
        .insert([
          {
            producto: g.productoNormalizado,
            cantidad_actual: g.cantidad,
            unidad: g.unidad,
            ubicacion: g.ubicacion,
            origen,
            organization_id: orgId,
            costo_unitario: costoUnitarioGrupo > 0 ? costoUnitarioGrupo : null,
            valor_inventario: costoTotalGrupo > 0 ? costoTotalGrupo : null,
            minimo: minimoNum,
            maximo: maximoNum,
          },
        ])
        .select('id');

      if (errorInsert) {
        console.error('Error insert inventario:', errorInsert);
        await revertirEntradaGuardada();
        return {
          ok: false,
          mensaje: 'No se pudo crear el inventario: ' + errorInsert.message,
        };
      }
      if (!filasInsertadas?.length) {
        await revertirEntradaGuardada();
        return {
          ok: false,
          mensaje:
            'No se creó fila en inventario (revisa permisos RLS o organization_id).',
        };
      }
    }
  }

  return { ok: true, entradaId };
}

/** Parsea y valida filas del formulario a ítems listos para guardar (una fila = una línea de detalle). */
export function parsearFilasEntradaParaGuardar(
  filas: Array<{
    producto: string;
    cantidad: string;
    unidad: string;
    costoUnitario: string;
    costoTotal: string;
    ubicacion: string;
  }>,
  redondear: (n: number) => number
): { ok: true; items: ItemEntradaGuardado[] } | { ok: false; mensaje: string } {
  const items: ItemEntradaGuardado[] = [];

  for (const fila of filas) {
    const productoNormalizado = fila.producto.trim().toLowerCase();
    if (!productoNormalizado) continue;

    const cantidadNum = convertirNumeroForm(fila.cantidad);
    if (cantidadNum <= 0) {
      return { ok: false, mensaje: 'La cantidad debe ser mayor a 0 en cada ítem con nombre.' };
    }
    if (!fila.unidad) {
      return { ok: false, mensaje: 'Selecciona la unidad en cada ítem.' };
    }
    if (!fila.ubicacion) {
      return { ok: false, mensaje: 'Selecciona la ubicación en cada ítem.' };
    }

    const costoUnitarioNum = convertirNumeroForm(fila.costoUnitario);
    const costoTotalNum = convertirNumeroForm(fila.costoTotal);

    let costoUnitarioFinal = 0;
    let costoTotalFinal = 0;

    if (costoUnitarioNum > 0) {
      costoUnitarioFinal = redondear(costoUnitarioNum);
      costoTotalFinal = redondear(cantidadNum * costoUnitarioFinal);
    } else if (costoTotalNum > 0) {
      costoUnitarioFinal = redondear(costoTotalNum / cantidadNum);
      costoTotalFinal = redondear(cantidadNum * costoUnitarioFinal);
    }

    items.push({
      productoNormalizado,
      cantidad: cantidadNum,
      unidad: fila.unidad,
      costoUnitarioFinal,
      costoTotalFinal,
      ubicacion: fila.ubicacion,
    });
  }

  if (items.length === 0) {
    return { ok: false, mensaje: 'Agrega al menos un ítem con nombre de pieza.' };
  }

  return { ok: true, items };
}
