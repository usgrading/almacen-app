import type { SupabaseClient } from "@supabase/supabase-js";

/** Perfil sin `organization_id` válido (solo debe corregirse con admin/API). */
export class MissingOrganizationError extends Error {
  constructor(
    message = "Tu perfil no tiene organization_id asignado. Contacta al administrador."
  ) {
    super(message);
    this.name = "MissingOrganizationError";
  }
}

/**
 * Lee `profiles.organization_id` del usuario en sesión.
 * Sin fallback: si falta o está vacío → `null`.
 */
export async function getMiOrganizationId(
  client: SupabaseClient
): Promise<string | null> {
  const {
    data: { session },
  } = await client.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;

  const { data: row } = await client
    .from("profiles")
    .select("organization_id")
    .eq("id", uid)
    .maybeSingle();

  const org = (row as { organization_id?: string | null } | null)
    ?.organization_id;
  if (typeof org === "string" && org.trim().length > 0) {
    return org.trim();
  }
  return null;
}

/**
 * Exige `organization_id` en el perfil; si no existe, lanza {@link MissingOrganizationError}.
 */
export async function requireMiOrganizationId(
  client: SupabaseClient
): Promise<string> {
  const id = await getMiOrganizationId(client);
  if (!id) {
    throw new MissingOrganizationError();
  }
  return id;
}
