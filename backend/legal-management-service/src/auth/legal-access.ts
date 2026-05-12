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
  const headerRoles = headerValue(req?.headers?.['x-user-roles']);
  const userFromHeaders = {
    userId: headerValue(req?.headers?.['x-user-id']),
    email: headerValue(req?.headers?.['x-user-email']),
    name: headerValue(req?.headers?.['x-user-name']),
    username: headerValue(req?.headers?.['x-user-username']),
    roles: headerRoles
      ? headerRoles
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean)
      : undefined,
  };

  return getLegalAccess({
    ...userFromHeaders,
    ...(req?.user || {}),
  });
}
