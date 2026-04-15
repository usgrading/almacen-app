import type { SupabaseClient } from "@supabase/supabase-js";

/** Valores permitidos en `profiles.rol`. */
export type AppRole = "admin" | "manager" | "viewer";

export function normalizeRole(raw: string | null | undefined): AppRole {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "admin" || v === "manager" || v === "viewer") return v;
  return "viewer";
}

/**
 * Rol efectivo del usuario autenticado (solo `profiles.rol`).
 */
export async function getUserRole(client: SupabaseClient): Promise<AppRole | null> {
  const {
    data: { session },
  } = await client.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;

  const { data, error } = await client
    .from("profiles")
    .select("rol")
    .eq("id", uid)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { rol?: string | null };
  return normalizeRole(row.rol ?? null);
}

export function isAdmin(rol: AppRole | null): boolean {
  return rol === "admin";
}

export function isManager(rol: AppRole | null): boolean {
  return rol === "manager";
}

export function isViewer(rol: AppRole | null): boolean {
  return rol === "viewer";
}

/** Inventario, entradas, salidas: admin y manager. */
export function canMutate(rol: AppRole | null): boolean {
  return rol === "admin" || rol === "manager";
}

/** Alta de usuarios y /usuarios: solo admin. */
export function canManageUsers(rol: AppRole | null): boolean {
  return rol === "admin";
}
