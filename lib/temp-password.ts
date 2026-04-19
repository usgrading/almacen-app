import { randomInt } from "crypto";
import { validarPassword } from "@/lib/validar-password";

const SAFE_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function pickChar(): string {
  return SAFE_CHARS[randomInt(SAFE_CHARS.length)]!;
}

/**
 * Contraseña temporal que cumple la política de validarPassword (misma que el resto de la app).
 */
export function generateTemporaryPassword(): string {
  for (let i = 0; i < 80; i++) {
    const body = Array.from({ length: 14 }, () => pickChar()).join("");
    const candidate = `Aa1!${body}`;
    if (validarPassword(candidate)) {
      return candidate;
    }
  }
  throw new Error("No se pudo generar una contraseña temporal.");
}
