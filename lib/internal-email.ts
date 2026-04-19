import { randomUUID } from "crypto";

/**
 * Correo sintético estable por usuario: prefijo legible + UUID para evitar colisiones en Auth.
 */
export function buildInternalAuthEmail(loginSlug: string): string {
  const safe =
    loginSlug.replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 48) ||
    "user";
  return `${safe}__${randomUUID()}@internal.local`;
}
