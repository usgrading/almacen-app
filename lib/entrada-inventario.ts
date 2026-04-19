import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMiOrganizationId } from "@/lib/organization";

/**
 * Devuelve el `organization_id` del perfil o lanza si falta (sin asignación automática).
 */
export async function obtenerOrganizacionParaEntrada(
  client: SupabaseClient
): Promise<string> {
  return requireMiOrganizationId(client);
}

/**
 * Busca inventario por producto + origen dentro de la organización del perfil,
 * con fallback opcional a filas legacy (`organization_id` null).
 */
export async function buscarInventarioEntrada(
  client: SupabaseClient,
  productoNormalizado: string,
  origen: "MX" | "USA",
  orgId: string
) {
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
