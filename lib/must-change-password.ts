import type { SupabaseClient } from "@supabase/supabase-js";

export function parseMustChangePassword(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  return value === true || value === 1 || value === "true";
}

/**
 * true si el perfil exige cambiar contraseña antes de usar la app.
 */
export async function fetchMustChangePassword(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[must-change-password]", error.message);
    return false;
  }

  const row = data as { must_change_password?: unknown } | null;
  return parseMustChangePassword(row?.must_change_password);
}
