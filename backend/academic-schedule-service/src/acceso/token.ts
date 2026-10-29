import type { Request } from 'express';

/**
 * Token de la petición, para reenviarlo al contrato PROG↔PTA (que exige
 * autenticación). Cabecera Authorization o, detrás del gateway, la cookie
 * `esap_access_token`.
 */
export function tokenDe(req: Request): string | null {
  const auth = String(req.headers['authorization'] || '');
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const cookie = String(req.headers['cookie'] || '');
  for (const parte of cookie.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === 'esap_access_token') return v.join('=').trim() || null;
  }
  return null;
}
