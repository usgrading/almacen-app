import type { SupabaseClient } from "@supabase/supabase-js";

/** Roles permitidos en `profiles.role` / `profiles.rol`. */
export type AppRole = "admin" | "manager" | "viewer";

export function normalizeRole(raw: string | null | undefined): AppRole {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "admin" || v === "manager" || v === "viewer") return v;
  return "viewer";
}

/**
 * Rol efectivo del usuario autenticado (lee `role` y cae a `rol` por compatibilidad).
 */
export async function getUserRole(client: SupabaseClient): Promise<AppRole | null> {
  const {
    data: { session },
  } = await client.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return null;

  const { data, error } = await client
    .from("profiles")
    .select("role, rol")
    .eq("id", uid)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { role?: string | null; rol?: string | null };
  return normalizeRole(row.role ?? row.rol ?? null);
}

export function isAdmin(role: AppRole | null): boolean {
  return role === "admin";
}

export function isManager(role: AppRole | null): boolean {
  return role === "manager";
}

export function isViewer(role: AppRole | null): boolean {
  return role === "viewer";
}

/** Inventario, entradas, salidas: admin y manager. */
export function canMutateStock(role: AppRole | null): boolean {
  return role === "admin" || role === "manager";
}

/** Alta de usuarios y /usuarios: solo admin. */
export function canManageUsers(role: AppRole | null): boolean {
  return role === "admin";
}
