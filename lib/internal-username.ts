/**
 * Username de login para usuarios internos: único global (minúsculas en BD).
 */

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,62}[a-z0-9]$/;

export function normalizeInternalLoginUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateInternalLoginUsername(normalized: string): string | null {
  if (!USERNAME_PATTERN.test(normalized)) {
    return "El usuario debe tener entre 3 y 64 caracteres, solo letras minúsculas, números, punto, guion y guion bajo; no puede empezar ni terminar con punto o guion.";
  }
  return null;
}
