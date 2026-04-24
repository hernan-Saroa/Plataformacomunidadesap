/**
 * PermissionGate - Control declarativo de acceso basado en permisos/roles
 * 
 * Consume AuthContext para verificar permisos en tiempo real.
 * Permite ocultar o deshabilitar UI segun el rol/permiso del usuario.
 * 
 * @version 1.0.0
 * @date 2026-03-12
 */

import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionGateProps {
  /** Permiso requerido (se verifica con hasPermission) */
  permission?: string;
  /** Cualquiera de estos permisos es suficiente */
  anyPermission?: string[];
  /** Todos estos permisos son requeridos */
  allPermissions?: string[];
  /** Rol requerido */
  role?: string;
  /** Cualquiera de estos roles es suficiente */
  anyRole?: string[];
  /** Condicion adicional custom */
  condition?: boolean;
  /** Componente a renderizar si no tiene acceso (por defecto: null) */
  fallback?: ReactNode;
  /** Si true, muestra el children pero deshabilitado visualmente */
  disableInsteadOfHide?: boolean;
  /** Children a renderizar si tiene acceso */
  children: ReactNode;
}

export function PermissionGate({
  permission,
  anyPermission,
  allPermissions,
  role,
  anyRole,
  condition,
  fallback = null,
  disableInsteadOfHide = false,
  children,
}: PermissionGateProps) {
  const auth = useAuth();

  // Super users siempre pasan
  if (auth.isSuperUser) {
    return <>{children}</>;
  }

  let hasAccess = true;

  // Verificar permiso individual
  if (permission) {
    hasAccess = hasAccess && auth.hasPermission(permission);
  }

  // Verificar cualquiera de los permisos
  if (anyPermission && anyPermission.length > 0) {
    hasAccess = hasAccess && auth.hasAnyPermission(anyPermission);
  }

  // Verificar todos los permisos
  if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAccess && auth.hasAllPermissions(allPermissions);
  }

  // Verificar rol individual
  if (role) {
    hasAccess = hasAccess && auth.hasRole(role);
  }

  // Verificar cualquiera de los roles
  if (anyRole && anyRole.length > 0) {
    hasAccess = hasAccess && anyRole.some(r => auth.hasRole(r));
  }

  // Condicion custom adicional
  if (condition !== undefined) {
    hasAccess = hasAccess && condition;
  }

  if (!hasAccess) {
    if (disableInsteadOfHide) {
      return (
        <div className="opacity-40 pointer-events-none select-none" aria-disabled="true">
          {children}
        </div>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Hook para verificar acceso de forma imperativa
 */
export function usePermissionCheck() {
  const auth = useAuth();

  return {
    can: (permission: string) => auth.isSuperUser || auth.hasPermission(permission),
    canAny: (permissions: string[]) => auth.isSuperUser || auth.hasAnyPermission(permissions),
    canAll: (permissions: string[]) => auth.isSuperUser || auth.hasAllPermissions(permissions),
    isRole: (role: string) => auth.isSuperUser || auth.hasRole(role),
    isAnyRole: (roles: string[]) => auth.isSuperUser || roles.some(r => auth.hasRole(r)),
  };
}
