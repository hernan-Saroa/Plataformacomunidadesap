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
  'SUPERUSER',
] as const;

export const ROLES_ANALISTA_VIATICOS = [
  'ANALISTA',
  'ANALISTA_VIATICOS',
];

/**
 * Permisos generales inmutables por rol funcional en Viáticos (Migración 441).
 * Evitan depender de códigos de rol modificables administrativamente.
 */
export const VIATICOS_PERMISOS_GENERALES = {
  ENLACE: 'travel_expenses.general.es_enlace_dependencia',
  SECRETARIO: 'travel_expenses.general.es_secretario_viaticos',
  ANALISTA: 'travel_expenses.general.es_analista_viaticos',
  CONTROL_VIATICOS: 'travel_expenses.general.es_control_viaticos',
  SUBDIRECCION: 'travel_expenses.general.es_subdireccion_corporativa',
  DIRECCION_NACIONAL: 'travel_expenses.general.es_direccion_nacional',
  PRESUPUESTO: 'travel_expenses.general.es_presupuesto',
  TESORERIA: 'travel_expenses.general.es_tesoreria',
  SST: 'travel_expenses.general.es_sst',
  TIQUETES: 'travel_expenses.general.es_responsable_tiquetes',
} as const;

export const ROLES_SUBDIRECCION_GESTION_CORPORATIVA = [
  'SUBDIRECCION_GESTION_CORPORATIVA',
  'SUBDIRECTOR_GESTION_CORPORATIVA',
  'SUBDIRECCION_DE_GESTION_CORPORATIVA',
] as const;

export const ROLES_DIRECCION_NACIONAL = [
  'DIRECCION_NACIONAL',
  'DIRECTOR_NACIONAL',
  'DELEGADO_DIRECCION_NACIONAL',
  'DIRECCION_GENERAL',
  'DIRECTOR_GENERAL',
] as const;

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
  /** Permisos granulares del usuario (ej. 'travel_expenses:create_request'). */
  permissions: string[];
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

function extraerPermisos(data: any): string[] {
  const raw = Array.isArray(data?.permissions)
    ? data.permissions
    : data?.user?.permissions
      ? data.user.permissions
      : [];
  return raw
    .map((p: any) => (typeof p === 'string' ? p : p?.code))
    .filter(Boolean);
}

export class AuthService {
  async getCurrentUser(): Promise<UsuarioActual | null> {
    let data: any = null;
    try {
      data = await apiClient.get<any>('auth/api/v1/verify');
    } catch (e) {
      console.warn(
        '[authService] verify HTTP no disponible; usando caché compartida del shell.',
        e,
      );
    }

    const cached: any =
      typeof window !== 'undefined' ? (window as any).__esap_auth_cache : null;

    const httpUsable = Boolean(data && (data?.id || data?.userId || data?.sub));
    const cacheUsable = Boolean(
      cached &&
        (cached?.id || cached?.id_user || cached?.userId || cached?.sub),
    );
    if (!httpUsable && !cacheUsable) return null;

    const roles = Array.from(
      new Set([...extraerRoles(data), ...extraerRoles(cached)]),
    );
    const permissions = Array.from(
      new Set([...extraerPermisos(data), ...extraerPermisos(cached)]),
    );
    const esAdmin = roles.some((r) =>
      (ROLES_ADMIN_VIATICOS as readonly string[]).includes(r),
    );

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
      permissions,
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

  hasRole(role: string): boolean {
    const user = this.getCurrentUserSync();
    if (!user || !user.roles.length) return false;
    return user.roles.some((r) => r === role || r.includes(role));
  }

  hasPermission(permission: string): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    return user.permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((p) => this.hasPermission(p));
  }

  isSuperAdmin(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    return user.esAdmin || user.roles.some((r) => /SUPER.*ADMIN|ADMIN/.test(r));
  }

  /**
   * Determina si el usuario autenticado tiene la función de Secretario/a de Viáticos.
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_secretario_viaticos` (Migración 441).
   */
  isSecretario(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.SECRETARIO)) return true;
    if (
      this.hasAnyPermission([
        'travel_expenses:read_inbox',
        'travel_expenses:set_priority',
        'travel_expenses:assign_analyst',
        'travel_expenses:return_request',
      ])
    ) {
      return true;
    }
    return user.roles.some((r) =>
      ['SECRETARIO', 'SECRETARIO_VIATICOS', 'SUPERVISOR'].includes(r) ||
      r.includes('SECRETARIO'),
    );
  }

  /**
   * Determina si el usuario autenticado es Analista de Viáticos.
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_analista_viaticos` (Migración 441).
   */
  isAnalista(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return false;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.ANALISTA)) return true;
    return user.roles.some((r) => ROLES_ANALISTA_VIATICOS.includes(r));
  }

  /**
   * Determina si el usuario autenticado tiene el rol técnico / función
   * `CONTROL_VIATICOS` (segunda revisión / control cruzado).
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_control_viaticos` (Migración 441).
   */
  isControlViaticos(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.CONTROL_VIATICOS)) return true;
    if (
      this.hasAnyPermission([
        'travel_expenses:read_siif_requested',
        'travel_expenses:double_check_request',
        'travel_expenses:return_to_analyst',
      ])
    ) {
      return true;
    }
    return user.roles.some((r) => r === 'CONTROL_VIATICOS' || r.includes('CONTROL_VIATICOS'));
  }

  /**
   * Determina si el usuario autenticado tiene función de Ordenador /
   * Subdirección de Gestión Corporativa (Etapa 6 - RF-AUT-001).
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_subdireccion_corporativa` (Migración 441).
   */
  isSubdireccionGestionCorporativa(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) {
      return this.hasPermission(VIATICOS_PERMISOS_GENERALES.SUBDIRECCION) ||
        this.hasPermission('travel_expenses:read_authorizations');
    }
    if (user.esAdmin) return true;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.SUBDIRECCION)) return true;
    if (
      this.hasPermission('travel_expenses:read_authorizations') ||
      this.hasPermission('travel_expenses:authorize_expense')
    ) {
      return true;
    }
    return user.roles.some((r) =>
      (ROLES_SUBDIRECCION_GESTION_CORPORATIVA as readonly string[]).includes(r) ||
      r.includes('SUBDIRECCION_GESTION_CORPORATIVA'),
    );
  }

  /**
   * Determina si el usuario autenticado tiene el rol / función de
   * Dirección Nacional o delegado (Etapa 6 - RF-AUT-002).
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_direccion_nacional` (Migración 441).
   */
  isDireccionNacional(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) {
      return (
        this.hasPermission(VIATICOS_PERMISOS_GENERALES.DIRECCION_NACIONAL) ||
        this.hasPermission('travel_expenses:read_extemporaneous_authorizations') ||
        this.hasPermission('travel_expenses:authorize_extemporaneous')
      );
    }
    if (user.esAdmin) return true;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.DIRECCION_NACIONAL)) return true;
    if (
      this.hasPermission('travel_expenses:read_extemporaneous_authorizations') ||
      this.hasPermission('travel_expenses:authorize_extemporaneous')
    ) {
      return true;
    }
    return user.roles.some((r) =>
      (ROLES_DIRECCION_NACIONAL as readonly string[]).includes(r) ||
      r.includes('DIRECCION_NACIONAL') ||
      r.includes('DIRECTOR_NACIONAL'),
    );
  }

  /**
   * Determina si el usuario autenticado tiene permiso para cancelar una
   * comisión (RF-AUT-003, Etapa 6).
   */
  canCancelarComision(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    return user.permissions.some((p) =>
      ['travel_expenses:cancel_request',
        'travel_expenses:create_request',
        'travel_expenses:read_inbox',
        'travel_expenses:authorize_expense',
        'travel_expenses:*',
        '*'].includes(p),
    );
  }

  /**
   * Determina si el usuario pertenece al Grupo de Presupuesto (Etapa 7 — RF-PRE-001).
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_presupuesto` (Migración 441).
   */
  isPresupuesto(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.PRESUPUESTO)) return true;
    if (
      this.hasPermission('travel_expenses:read_budget') ||
      this.hasPermission('travel_expenses:register_rp')
    ) {
      return true;
    }
    return user.roles.some((r) =>
      ['PRESUPUESTO', 'GRUPO_PRESUPUESTO', 'ANALISTA_PRESUPUESTO'].includes(r) ||
      r.includes('PRESUPUESTO'),
    );
  }

  /**
   * Determina si el usuario puede remitir paquetes autorizados a Presupuesto.
   */
  canEnviarPresupuesto(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    return (
      this.isAnalista() ||
      this.hasPermission('travel_expenses:send_to_budget') ||
      this.hasPermission('travel_expenses:verify_request') ||
      this.hasPermission('travel_expenses:authorize_expense')
    );
  }

  /**
   * Determina si el usuario puede expedir RP en SIIF Nación.
   */
  canExpedirRp(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    return this.isPresupuesto() || this.hasPermission('travel_expenses:register_rp');
  }

  /**
   * Determina si el usuario puede crear y registrar la obligación en SIIF Nación (Etapa 8 — RF-PAG-001).
   */
  canCrearObligacion(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    return (
      this.isAnalista() ||
      this.hasPermission('travel_expenses:create_obligation') ||
      this.hasPermission('travel_expenses:register_obligation') ||
      this.hasPermission('travel_expenses:verify_request')
    );
  }

  /**
   * Determina si el usuario pertenece al área de Tesorería (Etapa 8 — RF-PAG-003).
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_tesoreria` (Migración 441).
   */
  isTesoreria(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.TESORERIA)) return true;
    if (
      this.hasPermission('travel_expenses:process_payment') ||
      this.hasPermission('travel_expenses:read_payments')
    ) {
      return true;
    }
    return user.roles.some((r) =>
      ['TESORERIA', 'GRUPO_TESORERIA', 'ANALISTA_TESORERIA', 'PAGADOR'].includes(r) ||
      r.includes('TESORERIA') ||
      r.includes('PAGADOR'),
    );
  }

  /**
   * Determina si el usuario puede procesar el desembolso y pago en SIIF Nación (Etapa 8 — RF-PAG-003).
   */
  canProcesarPago(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    return (
      this.isTesoreria() ||
      this.hasPermission('travel_expenses:process_payment') ||
      this.hasPermission('travel_expenses:register_payment')
    );
  }

  /**
   * Determina si el usuario pertenece al área de Seguridad y Salud en el Trabajo (SST) (Etapa 8 — RF-PAG-002).
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_sst` (Migración 441).
   */
  isSst(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.SST)) return true;
    if (
      this.hasPermission('travel_expenses:read_sst_logs') ||
      this.hasPermission('travel_expenses:read_sst_requests') ||
      this.hasPermission('travel_expenses:resend_sst_notification')
    ) {
      return true;
    }
    return user.roles.some((r) =>
      ['SST', 'SEGURIDAD_SALUD_TRABAJO', 'SEGURIDAD_Y_SALUD_EN_EL_TRABAJO', 'GRUPO_SST', 'ANALISTA_SST'].includes(r) ||
      r.includes('SST') ||
      (r.includes('SEGURIDAD') && r.includes('TRABAJO')),
    );
  }

  /**
   * Determina si el usuario es Responsable de Tiquetes (Etapa de Tiquetes).
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_responsable_tiquetes` (Migración 441).
   */
  isResponsableTiquetes(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (user.esAdmin) return true;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.TIQUETES)) return true;
    if (
      this.hasPermission('travel_expenses:tickets.view') ||
      this.hasPermission('travel_expenses:tickets.manage')
    ) {
      return true;
    }
    return user.roles.some((r) => r.includes('TIQUETES'));
  }

  /**
   * Determina si el usuario es Enlace de Dependencia (Radicación inicial).
   * Prioriza el permiso inmutable específico `travel_expenses.general.es_enlace_dependencia` (Migración 441).
   */
  isEnlaceDependencia(): boolean {
    const user = this.getCurrentUserSync();
    if (!user) return false;
    if (this.hasPermission(VIATICOS_PERMISOS_GENERALES.ENLACE)) return true;
    return user.roles.some((r) => r.includes('ENLACE'));
  }

  getCurrentUserSync(): UsuarioActual | null {
    try {
      const cached: any =
        typeof window !== 'undefined' ? (window as any).__esap_auth_cache : null;
      if (!cached) return null;
      const rolesRaw: any[] = Array.isArray(cached?.roles)
        ? cached.roles
        : cached?.person?.roles
          ? cached.person.roles
          : cached?.user?.roles ?? [];
      const roles = rolesRaw.map(normalizarRoleCode).filter(Boolean);
      const permissionsRaw: any[] = Array.isArray(cached?.permissions)
        ? cached.permissions
        : cached?.user?.permissions
          ? cached.user.permissions
          : [];
      const permissions = permissionsRaw
        .map((p: any) => (typeof p === 'string' ? p : p?.code))
        .filter(Boolean);
      const esAdmin = roles.some((r) =>
      (ROLES_ADMIN_VIATICOS as readonly string[]).includes(r),
    );
      return {
        userId: cached?.id_user || cached?.userId || cached?.id || '',
        username: cached?.username || cached?.fullName || cached?.full_name || '',
        email: cached?.email,
        roles,
        permissions,
        esAdmin,
        person: cached?.person || cached?.user?.person,
      };
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;
