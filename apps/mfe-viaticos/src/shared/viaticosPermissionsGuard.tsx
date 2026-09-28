/**
 * Mapeo de permisos y Guards para el módulo de Viáticos y Gastos de Viaje.
 *
 * Implementa la resolución de acceso por permisos inmutables específicos
 * (`travel_expenses.general.es_*`, migración 441) en lugar de depender
 * de códigos de roles quemados susceptibles de modificación administrativa.
 *
 * Mantiene compatibilidad hacia atrás mediante fallback a roles legados y
 * permisos granulares de acción.
 */

import React, { useMemo } from 'react';
import { authService as defaultAuthService, AuthService, UsuarioActual } from '../services/api/authService';

/**
 * Permisos generales inmutables por rol funcional en Viáticos (Migración 441).
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

export type ViaticosRoleKey = keyof typeof VIATICOS_PERMISOS_GENERALES;

export interface RolePermissionConfig {
  /** Permiso inmutable específico de primer orden */
  permission: string;
  /** Roles de respaldo legacy para compatibilidad hacia atrás */
  legacyRoles: readonly string[];
  /** Permisos granulares de acción asociados al rol */
  fallbackPermissions: readonly string[];
  /** Descripción humana */
  label: string;
}

/**
 * Mapeo canónico de Roles Funcionales a Permisos Inmutables.
 */
export const VIATICOS_ROLE_PERMISSION_MAP: Record<ViaticosRoleKey, RolePermissionConfig> = {
  SECRETARIO: {
    permission: VIATICOS_PERMISOS_GENERALES.SECRETARIO,
    legacyRoles: ['SECRETARIO', 'SECRETARIO_VIATICOS', 'SUPERVISOR'],
    fallbackPermissions: [
      'travel_expenses:read_inbox',
      'travel_expenses:set_priority',
      'travel_expenses:assign_analyst',
      'travel_expenses:return_request',
    ],
    label: 'Secretaría de Viáticos',
  },
  ANALISTA: {
    permission: VIATICOS_PERMISOS_GENERALES.ANALISTA,
    legacyRoles: ['ANALISTA', 'ANALISTA_VIATICOS'],
    fallbackPermissions: [
      'travel_expenses:verify_request',
      'travel_expenses:request_adjustments',
    ],
    label: 'Analista de Viáticos',
  },
  CONTROL_VIATICOS: {
    permission: VIATICOS_PERMISOS_GENERALES.CONTROL_VIATICOS,
    legacyRoles: ['CONTROL_VIATICOS', 'REVISOR_VIATICOS'],
    fallbackPermissions: [
      'travel_expenses:read_siif_requested',
      'travel_expenses:double_check_request',
      'travel_expenses:return_to_analyst',
    ],
    label: 'Control de Viáticos / Revisor',
  },
  SUBDIRECCION: {
    permission: VIATICOS_PERMISOS_GENERALES.SUBDIRECCION,
    legacyRoles: [
      'SUBDIRECCION_GESTION_CORPORATIVA',
      'SUBDIRECTOR_GESTION_CORPORATIVA',
      'SUBDIRECCION_DE_GESTION_CORPORATIVA',
    ],
    fallbackPermissions: [
      'travel_expenses:read_authorizations',
      'travel_expenses:authorize_expense',
      'travel_expenses:return_authorization',
    ],
    label: 'Subdirección de Gestión Corporativa (Ordenador)',
  },
  DIRECCION_NACIONAL: {
    permission: VIATICOS_PERMISOS_GENERALES.DIRECCION_NACIONAL,
    legacyRoles: [
      'DIRECCION_NACIONAL',
      'DIRECTOR_NACIONAL',
      'DELEGADO_DIRECCION_NACIONAL',
      'DIRECCION_GENERAL',
      'DIRECTOR_GENERAL',
    ],
    fallbackPermissions: [
      'travel_expenses:read_extemporaneous_authorizations',
      'travel_expenses:authorize_extemporaneous',
      'travel_expenses:reject_extemporaneous',
    ],
    label: 'Dirección Nacional',
  },
  PRESUPUESTO: {
    permission: VIATICOS_PERMISOS_GENERALES.PRESUPUESTO,
    legacyRoles: ['PRESUPUESTO', 'GRUPO_PRESUPUESTO', 'ANALISTA_PRESUPUESTO'],
    fallbackPermissions: [
      'travel_expenses:read_budget',
      'travel_expenses:register_rp',
    ],
    label: 'Grupo de Presupuesto',
  },
  TESORERIA: {
    permission: VIATICOS_PERMISOS_GENERALES.TESORERIA,
    legacyRoles: ['TESORERIA', 'GRUPO_TESORERIA', 'ANALISTA_TESORERIA', 'PAGADOR'],
    fallbackPermissions: [
      'travel_expenses:read_payments',
      'travel_expenses:process_payment',
      'travel_expenses:register_payment',
    ],
    label: 'Grupo de Tesorería / Pagador',
  },
  SST: {
    permission: VIATICOS_PERMISOS_GENERALES.SST,
    legacyRoles: [
      'SST',
      'SEGURIDAD_SALUD_TRABAJO',
      'SEGURIDAD_Y_SALUD_EN_EL_TRABAJO',
      'GRUPO_SST',
      'ANALISTA_SST',
    ],
    fallbackPermissions: [
      'travel_expenses:read_sst_logs',
      'travel_expenses:read_sst_requests',
      'travel_expenses:resend_sst_notification',
    ],
    label: 'Seguridad y Salud en el Trabajo',
  },
  TIQUETES: {
    permission: VIATICOS_PERMISOS_GENERALES.TIQUETES,
    legacyRoles: ['RESPONSABLE_TIQUETES', 'TIQUETES', 'GESTION_TIQUETES'],
    fallbackPermissions: [
      'travel_expenses:tickets.view',
      'travel_expenses:tickets.manage',
    ],
    label: 'Responsable de Tiquetes',
  },
  ENLACE: {
    permission: VIATICOS_PERMISOS_GENERALES.ENLACE,
    legacyRoles: ['ENLACE', 'ENLACE_DEPENDENCIA'],
    fallbackPermissions: [
      'travel_expenses:create_request',
      'travel_expenses:read',
      'travel_expenses:read_own',
    ],
    label: 'Enlace de Dependencia',
  },
};

/**
 * Evalúa si un usuario posee la autorización de un rol funcional específico,
 * priorizando el permiso inmutable `travel_expenses.general.es_*`.
 */
export function hasViaticosRolePermission(
  auth: Pick<AuthService, 'getCurrentUserSync' | 'hasPermission' | 'hasAnyPermission'> = defaultAuthService,
  roleKey: ViaticosRoleKey,
): boolean {
  const user: UsuarioActual | null = auth.getCurrentUserSync();
  if (!user) return false;

  const config = VIATICOS_ROLE_PERMISSION_MAP[roleKey];
  if (!config) return false;

  // Para rol analista, si es Super Admin retorna false para no bloquear la vista general
  if (roleKey === 'ANALISTA' && user.esAdmin) {
    return false;
  }

  // 1. Super Admin o bypass administrativo
  if (user.esAdmin) {
    return true;
  }

  // 2. Verificación prioritaria por permiso inmutable
  if (auth.hasPermission(config.permission)) {
    return true;
  }

  // 3. Fallback a permisos granulares de acción
  if (config.fallbackPermissions.length > 0 && auth.hasAnyPermission([...config.fallbackPermissions])) {
    return true;
  }

  // 4. Fallback legacy a roles quemados (por compatibilidad si aún no se refrescan tokens)
  if (user.roles && user.roles.length > 0) {
    const hasLegacyRole = user.roles.some((r) =>
      config.legacyRoles.includes(r) ||
      config.legacyRoles.some((lr) => r.includes(lr)),
    );
    if (hasLegacyRole) {
      return true;
    }
  }

  return false;
}

/**
 * Funciones de conveniencia para cada rol funcional.
 */
export const isSecretarioViaticos = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'SECRETARIO');

export const isAnalistaViaticos = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'ANALISTA');

export const isControlViaticos = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'CONTROL_VIATICOS');

export const isSubdireccionCorporativa = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'SUBDIRECCION');

export const isDireccionNacional = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'DIRECCION_NACIONAL');

export const isPresupuesto = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'PRESUPUESTO');

export const isTesoreria = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'TESORERIA');

export const isSst = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'SST');

export const isResponsableTiquetes = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'TIQUETES');

export const isEnlaceDependencia = (auth: AuthService = defaultAuthService): boolean =>
  hasViaticosRolePermission(auth, 'ENLACE');

/**
 * Hook reactivo para consultar permisos y roles funcionales en Viáticos.
 */
export function useViaticosPermissions(auth: AuthService = defaultAuthService) {
  const user = auth.getCurrentUserSync();

  return useMemo(() => {
    const esSuperAdmin = user?.esAdmin || auth.isSuperAdmin();
    const esSecretario = isSecretarioViaticos(auth);
    const esAnalista = isAnalistaViaticos(auth);
    const esControl = isControlViaticos(auth);
    const esSubdir = isSubdireccionCorporativa(auth);
    const esDirNac = isDireccionNacional(auth);
    const esPresu = isPresupuesto(auth);
    const esTeso = isTesoreria(auth);
    const esSalud = isSst(auth);
    const esTiq = isResponsableTiquetes(auth);
    const esEnlace = isEnlaceDependencia(auth);

    return {
      user,
      esSuperAdmin,
      esSecretario,
      esAnalista,
      esControlViaticos: esControl,
      esSubdireccion: esSubdir,
      esDireccionNacional: esDirNac,
      esPresupuesto: esPresu,
      esTesoreria: esTeso,
      esSst: esSalud,
      esResponsableTiquetes: esTiq,
      esEnlaceDependencia: esEnlace,
      hasPermission: (perm: string) => auth.hasPermission(perm),
      hasAnyPermission: (perms: string[]) => auth.hasAnyPermission(perms),
      hasRolePermission: (roleKey: ViaticosRoleKey) => hasViaticosRolePermission(auth, roleKey),
    };
  }, [user, auth]);
}

/**
 * Componente Guard que renderiza `children` únicamente si el usuario cuenta
 * con el permiso especificado o el permiso asociado al rol funcional.
 */
export interface ViaticosPermissionGuardProps {
  permission?: string;
  roleKey?: ViaticosRoleKey;
  auth?: AuthService;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const ViaticosPermissionGuard: React.FC<ViaticosPermissionGuardProps> = ({
  permission,
  roleKey,
  auth = defaultAuthService,
  fallback = null,
  children,
}) => {
  const tieneAcceso = useMemo(() => {
    if (roleKey && hasViaticosRolePermission(auth, roleKey)) {
      return true;
    }
    if (permission && auth.hasPermission(permission)) {
      return true;
    }
    return false;
  }, [permission, roleKey, auth]);

  if (!tieneAcceso) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Componente Guard específico para validar un rol funcional por su permiso general.
 */
export interface ViaticosRoleGuardProps {
  roleKey: ViaticosRoleKey;
  auth?: AuthService;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const ViaticosRoleGuard: React.FC<ViaticosRoleGuardProps> = ({
  roleKey,
  auth = defaultAuthService,
  fallback = null,
  children,
}) => {
  return (
    <ViaticosPermissionGuard roleKey={roleKey} auth={auth} fallback={fallback}>
      {children}
    </ViaticosPermissionGuard>
  );
};
