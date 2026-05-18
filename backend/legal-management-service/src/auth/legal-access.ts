export const GLOBAL_LEGAL_ROLES = new Set([
  'SUPER_ADMIN',
  'JEFE_GESTION_LEGAL',
  'SECRETARIADO_GESTION_LEGAL',
  'MONITOREO_GESTION_LEGAL',
]);

export interface LegalAccess {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userKeys: string[];
  roles: string[];
  esResuelve: boolean;
  tieneVistaGlobal: boolean;
  esResuelveSolo: boolean;
}

export function normalizeRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role: any) => (typeof role === 'string' ? role : role?.code ?? role?.name ?? ''))
    .filter(Boolean)
    .map((role: string) => role.toUpperCase().trim());
}

export function getLegalAccess(user: any): LegalAccess {
  const roles = normalizeRoles(user?.roles);
  const tieneVistaGlobal = roles.some((role) => GLOBAL_LEGAL_ROLES.has(role));
  const esResuelve = roles.includes('RESUELVE_GESTION_LEGAL');
  const userId = user?.userId || user?.id_user || user?.id || user?.sub;
  const userEmail = user?.email || user?.person?.email || user?.mail;
  const userName =
    user?.fullName ||
    user?.full_name ||
    user?.name ||
    user?.person?.full_name ||
    [user?.person?.first_name, user?.person?.last_name].filter(Boolean).join(' ') ||
    user?.username;
  const userKeys = Array.from(
    new Set(
      [userId, userEmail, userName]
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  );

  return {
    userId,
    userEmail,
    userName,
    userKeys,
    roles,
    esResuelve,
    tieneVistaGlobal,
    esResuelveSolo: esResuelve && !tieneVistaGlobal,
  };
}

function headerValue(value: unknown): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getLegalAccessFromRequest(req: any): LegalAccess {
  let headerRoles = headerValue(req?.headers?.['x-user-roles']);
  let userId = headerValue(req?.headers?.['x-user-id']);
  let email = headerValue(req?.headers?.['x-user-email']);
  let name = headerValue(req?.headers?.['x-user-name']);
  let username = headerValue(req?.headers?.['x-user-username']);

  // Fallback: Si el frontend en modo local (direct) no envió los headers por una condición de carrera,
  // rescatamos la información directamente del token de sesión (cookie) que el navegador siempre envía.
  if (!headerRoles && !userId && req?.headers?.cookie) {
    const match = req.headers.cookie.match(/esap_access_token=([^;]+)/);
    if (match && match[1]) {
      try {
        const token = match[1];
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payloadStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
          const payload = JSON.parse(payloadStr);
          
          userId = payload.sub || payload.id_user || payload.userId;
          email = payload.email || email;
          name = payload.name || payload.fullName || payload.full_name || name;
          username = payload.username || username;
          
          if (payload.roles && Array.isArray(payload.roles)) {
            headerRoles = payload.roles.map((r: any) => typeof r === 'string' ? r : r.code || r.name).filter(Boolean).join(',');
          }
        }
      } catch (e) {
        console.error('[DEBUG] Error decodificando token local en legal-access:', e.message);
      }
    }
  }

  const userFromHeaders = {
    userId,
    email,
    name,
    username,
    roles: headerRoles
      ? headerRoles
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean)
      : undefined,
  };

  const finalUser = {
    ...userFromHeaders,
    ...(req?.user || {}),
  };

  const access = getLegalAccess(finalUser);

  return access;
}
