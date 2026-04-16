import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureMiOrganizationId, getMiOrganizationId } from "@/lib/organization";

/**
 * Asegura perfil con organization_id y devuelve el id de organización del usuario.
 */
export async function obtenerOrganizacionParaEntrada(
  client: SupabaseClient
): Promise<string | null> {
  await ensureMiOrganizationId(client);
  return getMiOrganizationId(client);
}

/**
 * Busca una fila de inventario por producto + origen, priorizando organization_id
 * y haciendo fallback a filas legacy con organization_id nulo.
 */
export async function buscarInventarioEntrada(
  client: SupabaseClient,
  productoNormalizado: string,
  origen: "MX" | "USA",
  orgId: string | null
) {
  if (!orgId) {
    return client
      .from("inventario")
      .select("*")
      .eq("producto", productoNormalizado)
      .eq("origen", origen)
      .maybeSingle();
  }

  const conOrg = await client
    .from("inventario")
    .select("*")
    .eq("producto", productoNormalizado)
    .eq("origen", origen)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (conOrg.error) return conOrg;
  if (conOrg.data) return conOrg;

  return client
    .from("inventario")
    .select("*")
    .eq("producto", productoNormalizado)
    .eq("origen", origen)
    .is("organization_id", null)
    .maybeSingle();
}
