/**
 * En producción un secreto/credencial faltante debe detener el arranque, no caer en
 * silencio a un valor por defecto público. En desarrollo conserva el default.
 */
export function requireInProduction(name: string, value: string | undefined, devDefault: string): string {
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Variable de entorno obligatoria en producción: ${name}`);
  }
  return devDefault;
}
