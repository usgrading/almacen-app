const REGEX_PASSWORD = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export function validarPassword(password: string): boolean {
  return REGEX_PASSWORD.test(password);
}

export const MENSAJE_ERROR_PASSWORD =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número';
