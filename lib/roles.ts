import type { SupabaseClient } from "@supabase/supabase-js";

/** Valores permitidos en `profiles.rol`. */
export type AppRole = "admin" | "manager" | "viewer";

export const APP_ROLES: readonly AppRole[] = ["admin", "manager", "viewer"];

/** Solo rol válidos; null si falta o no coincide (APIs deben responder 400/403 en lugar de asumir viewer). */
export function parseAppRole(input: unknown): AppRole | null {
  if (input == null) return null;
  if (typeof input !== "string") return null;
  const v = input.trim().toLowerCase();
  if (v === "admin" || v === "manager" || v === "viewer") return v;
  return null;
}

/**
 * Lectura desde BD / UI: valores desconocidos se tratan como viewer.
 * En desarrollo se advierte para detectar datos corruptos en `profiles.rol`.
 */
export function normalizeRole(raw: string | null | undefined): AppRole {
  const parsed = parseAppRole(raw ?? null);
  if (parsed) return parsed;
  const v = String(raw ?? "").trim();
  if (v.length > 0 && process.env.NODE_ENV === "development") {
    console.warn("[roles] profiles.rol inesperado; usando viewer:", raw);
  }
  return "viewer";
}

/**
 * Rol efectivo del usuario autenticado (`profiles.rol`).
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
