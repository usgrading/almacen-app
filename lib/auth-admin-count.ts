import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Total de usuarios en Auth (antes de crear otro). Null si la API falla (el caller puede ignorar).
 */
export async function contarUsuariosAuth(
  admin: SupabaseClient
): Promise<number | null> {
  let total = 0;
  let page = 1;
  const perPage = 1000;
  const maxPages = 50;

  while (page <= maxPages) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || data?.users == null) return null;
    total += data.users.length;
    if (data.users.length < perPage) break;
    page++;
  }

  return total;
}
