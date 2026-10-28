import { sanitizeText } from './textSanitizer';

/** Las referencias de auditoría se conservan para operar, pero nunca se imprimen como nombres. */
export function rundActorName(nombre: unknown, referencia?: unknown): string {
  const name = sanitizeText(String(nombre ?? '')).trim().replace(/\s+/g, ' ');
  if (name && /^[\p{L}\p{M} .’'()-]+$/u.test(name) && !/^[a-f0-9]{24,}$/i.test(name)) return name;
  const reference = String(referencia ?? '').trim();
  if (/^(SISTEMA|SYSTEM)$/i.test(reference)) return 'Sistema';
  if (/^AUTOGESTION:/i.test(reference)) return 'Docente (autogestión)';
  return 'Usuario no disponible';
}
