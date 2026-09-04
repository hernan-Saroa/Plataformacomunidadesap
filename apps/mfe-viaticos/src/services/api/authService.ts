import apiClient from './apiClient';

/**
 * Códigos de rol que habilitan permisos administrativos en el módulo de
 * viáticos. Incluye las variantes usadas por el auth-service
 * (ver BackofficeApp.tsx) y el shell (getUserContextHeaders):
 * SUPER_ADMIN, SUPERADMIN, SUPER_ADMINISTRADOR, ADMIN, ADMINISTRADOR y
 * ADMINISTRATIVO.
 */
export const ROLES_ADMIN_VIATICOS = [
  'ADMIN',
  'ADMINISTRADOR',
  'SUPER_ADMIN',
  'SUPERADMIN',
  'SUPER_ADMINISTRADOR',
  'ADMINISTRATIVO',
];

export interface DependenciaUsuario {
  idDependencia?: number;
  codDependencia?: string;
  nomDependencia?: string;
}

export interface UsuarioActual {
  userId: string;
  username: string;
  email?: string;
  /** Códigos de rol normalizados a forma canónica (ej. 'SUPER_ADMIN'). */
  roles: string[];
  /** `true` cuando el usuario posee alguno de `ROLES_ADMIN_VIATICOS`. */
  esAdmin: boolean;
  person?: {
    id?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    dependencia?: DependenciaUsuario | null;
  };
}

/**
 * Normaliza el código de un rol a su forma canónica:
 * - si el rol viene como objeto `{ code, name }`, usa `code` (o `name`).
 * - quita tildes (NFD), pasa a mayúsculas y reemplaza espacios/guiones
 *   por `_` (ej. 'SUPER-ADMIN' → 'SUPER_ADMIN', 'Súper Admin' → 'SUPER_ADMIN').
 *
 * Es el complemento frontend de `getUserContextHeaders` en
 * `apps/shell/src/config/environment.ts` (líneas 521-529), que también
 * soporta roles como string y como objeto `{ code, name }`.
 */
function normalizarRoleCode(
  role: string | { code?: string; name?: string } | undefined | null,
): string {
  const raw =
    typeof role === 'string'
      ? role
      : role && typeof role === 'object'
        ? role.code || role.name || ''
        : '';
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Extrae la dependencia asociada a la persona de forma tolerante. El
 * auth-service puede serializar:
 *  - `person.dependencia` como objeto anidado (idDependencia /
 *    codDependencia / nomDependencia), o
 *  - únicamente `person.idDependencia` (FK numérica) sin el objeto anidado.
 * En el segundo caso conservamos el idDependencia numérico para que el
 * consumidor pueda resolver el código contra el catálogo de dependencias.
 */
function extraerDependencia(persona: any): DependenciaUsuario | null {
  if (!persona || typeof persona !== 'object') return null;

  const dep = persona.dependencia ?? persona.person?.dependencia ?? null;
  const idNumerico =
    persona.idDependencia ??
    persona.id_dependencia ??
    persona.person?.idDependencia ??
    undefined;

  if (!dep) {
    if (idNumerico != null) {
      return { idDependencia: Number(idNumerico) };
    }
    return null;
  }

  return {
    idDependencia:
      dep.idDependencia != null
        ? Number(dep.idDependencia)
        : idNumerico != null
          ? Number(idNumerico)
          : undefined,
    codDependencia:
      dep.codDependencia ??
      dep.cod ??
      (dep.idDependencia != null ? String(dep.idDependencia) : undefined),
    nomDependencia:
      dep.nomDependencia ?? dep.nombre ?? dep.nombreDependencia ?? dep.name,
  };
}

/**
 * Resuelve los roles del usuario considerando las variantes del auth-service:
 * `data.roles` (array de string u objeto) o `data.user.roles` /
 * `data.person.roles` como respaldo.
 */
function extraerRoles(data: any): string[] {
  const rolesRaw: any[] = Array.isArray(data?.roles)
    ? data.roles
    : data?.person?.roles
      ? data.person.roles
      : (data?.user?.roles ?? []);
  return rolesRaw.map(normalizarRoleCode).filter(Boolean);
}

export class AuthService {
  async getCurrentUser(): Promise<UsuarioActual | null> {
    // 1) Verificación directa vía gateway (auth-service).
    let data: any = null;
    try {
      data = await apiClient.get<any>('auth/api/v1/verify');
    } catch (e) {
      console.warn(
        '[authService] verify HTTP no disponible; usando caché compartida del shell.',
        e,
      );
    }

    // 2) Sesión autoritativa en memoria que mantiene el shell
    //    (`window.__esap_auth_cache`, escrita al iniciar/refrescar sesión).
    //    Es el mismo payload que consumen otros MFEs e incluye la persona
    //    con su dependencia (idDependencia/codDependencia/nomDependencia).
    const cached: any =
      typeof window !== 'undefined' ? (window as any).__esap_auth_cache : null;

    const httpUsable = Boolean(data && (data?.id || data?.userId || data?.sub));
    const cacheUsable = Boolean(
      cached &&
        (cached?.id || cached?.id_user || cached?.userId || cached?.sub),
    );
    if (!httpUsable && !cacheUsable) return null;

    // Roles: se unen ambas fuentes para tolerar payloads parciales.
    const roles = Array.from(
      new Set([...extraerRoles(data), ...extraerRoles(cached)]),
    );
    const esAdmin = roles.some((r) => ROLES_ADMIN_VIATICOS.includes(r));

    const personaHttp = data?.person;
    const personaCache = cached?.person ?? cached?.user?.person;
    const persona =
      personaHttp &&
      typeof personaHttp === 'object' &&
      Object.keys(personaHttp).length > 0
        ? personaHttp
        : personaCache;

    const dependencia = extraerDependencia(
      persona ? { ...persona, person: persona } : null,
    );

    const userId =
      data?.id ||
      data?.userId ||
      data?.sub ||
      cached?.id_user ||
      cached?.userId ||
      cached?.id ||
      cached?.sub ||
      '';

    return {
      userId,
      username:
        data?.username ||
        data?.email ||
        cached?.username ||
        cached?.fullName ||
        cached?.full_name ||
        persona?.full_name ||
        '',
      email: data?.email || cached?.email || persona?.email,
      roles,
      esAdmin,
      person: persona
        ? {
            id: persona.id ?? persona.id_person,
            full_name: persona.full_name,
            first_name: persona.first_name,
            last_name: persona.last_name,
            email: persona.email,
            dependencia,
          }
        : undefined,
    };
  }
}

export const authService = new AuthService();
export default authService;
