import type { Request } from 'express';

/**
 * Códigos de rol del request. El gateway no propaga `req.user`: reenvía la
 * identidad en `x-user-roles`; sin cabecera, se usan los roles del token.
 * Mismo criterio que los `permisosDe` de cada controlador.
 */
export function rolesDe(req: Request): string[] {
  const desdeHeader = String(req.headers['x-user-roles'] || '')
    .split(',').map((r) => r.trim()).filter(Boolean);
  const desdeUser = Array.isArray((req as any)?.user?.roles)
    ? (req as any).user.roles
        .map((r: any) => (typeof r === 'string' ? r : r?.code ?? r?.name)).filter(Boolean)
    : [];
  return desdeHeader.length > 0 ? desdeHeader : desdeUser;
}
