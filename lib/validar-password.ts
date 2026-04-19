export type RequisitosPassword = {
  min8: boolean;
  mayuscula: boolean;
  minuscula: boolean;
  numero: boolean;
  especial: boolean;
};

/**
 * Un carácter no alfanumérico ASCII (p. ej. !@# o espacio con teclado).
 * Suficiente para "especial" en políticas habituales.
 */
const RE_ESPECIAL = /[^A-Za-z0-9]/;

/**
 * Devuelve qué requisitos cumple la contraseña (útil para validación en vivo en UI).
 */
export function analizarRequisitosPassword(
  password: string
): RequisitosPassword {
  return {
    min8: password.length >= 8,
    mayuscula: /[A-Z]/.test(password),
    minuscula: /[a-z]/.test(password),
    numero: /[0-9]/.test(password),
    especial: RE_ESPECIAL.test(password),
  };
}

export function validarPassword(password: string): boolean {
  const r = analizarRequisitosPassword(password);
  return r.min8 && r.mayuscula && r.minuscula && r.numero && r.especial;
}

export const MENSAJE_ERROR_PASSWORD =
  "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.";
