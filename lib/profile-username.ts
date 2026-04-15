/**
 * Evita colisiones en username (mismo local-part en distintos dominios, o dos
 * usuarios con el mismo handle), que suelen provocar "Database error saving new user"
 * si hay UNIQUE(username) o un trigger que inserta en profiles.
 *
 * `emailOrHandle` puede ser un email completo o solo el texto que quieras usar como base.
 */
export function uniqueProfileUsername(
  emailOrHandle: string,
  userId: string
): string {
  const raw = emailOrHandle.trim();
  const local = (
    raw.includes("@") ? raw.split("@")[0] : raw
  )?.trim().toLowerCase() || "user";
  const safe =
    local.replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 32) ||
    "user";
  const shortId = userId.replace(/-/g, "").slice(0, 12);
  const combined = `${safe}_${shortId}`;
  return combined.length <= 80 ? combined : combined.slice(0, 80);
}
