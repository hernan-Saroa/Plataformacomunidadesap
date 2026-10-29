import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { expandRundPermissions } from '../../../shared/rund-permissions';
import { usePtaRoleAccess } from '../hooks/usePtaRoleAccess';

export interface AuthSessionLite {
  rol?: string;
  permisos?: string[];
}

export interface AuthContextValue {
  isAuthenticated: boolean;
  userPersonId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  userPersona?: {
    cargo?: string;
    dependencia?: string;
    territorial_ids?: string[];
    programa_ids?: string[];
  };
  isSuperUser: boolean;
  session?: AuthSessionLite;
  hasPermission: (permissionId: string) => boolean;
  hasAnyPermission: (permissionIds: string[]) => boolean;
  refreshPermissions?: () => Promise<void>;
  ptaPermissionsVerified?: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const unauthenticatedSession: AuthSessionLite = { permisos: [] };

export type AuthProviderProps = {
  children: ReactNode;
  userPersonId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  isSuperUser?: boolean;
  permisos?: string[];
  sessionRol?: string;
  userPersona?: AuthContextValue['userPersona'];
  syncPtaRoles?: boolean;
};

export function AuthProvider({
  children,
  userPersonId,
  userEmail,
  userName,
  userRole,
  isSuperUser = false,
  permisos = [],
  sessionRol,
  userPersona,
  syncPtaRoles = false,
}: AuthProviderProps) {
  const sessionKey = JSON.stringify([userPersonId, userEmail]);
  const roleKey = JSON.stringify([userRole, isSuperUser, permisos]);
  const { access, checked, refresh } = usePtaRoleAccess(syncPtaRoles, sessionKey, roleKey);
  const value = useMemo<AuthContextValue>(() => {
    const supplied = Array.isArray(permisos) ? permisos : [];
    const effectivePermissions = syncPtaRoles
      ? [...supplied.filter(permission => !permission.startsWith('pta.') && permission !== '*'), ...(access?.permissions || [])]
      : supplied;
    const effectiveSuperUser = syncPtaRoles ? Boolean(access?.isSuperUser) : isSuperUser;
    const normalizedPermisos = [...expandRundPermissions(effectivePermissions)];
    const hasPermission = (permissionId: string) =>
      Boolean(effectiveSuperUser || normalizedPermisos.includes(permissionId));
    const hasAnyPermission = (permissionIds: string[]) =>
      Boolean(effectiveSuperUser || permissionIds.some((id) => normalizedPermisos.includes(id)));

    return {
      isAuthenticated: Boolean(userEmail || userPersonId),
      userPersonId,
      userEmail,
      userName,
      userRole,
      userPersona,
      isSuperUser: Boolean(effectiveSuperUser),
      session: {
        rol: sessionRol || userRole,
        permisos: normalizedPermisos,
      },
      hasPermission,
      hasAnyPermission,
      refreshPermissions: syncPtaRoles ? refresh : undefined,
      ptaPermissionsVerified: syncPtaRoles && Boolean(access),
    };
  }, [isSuperUser, permisos, sessionRol, userEmail, userPersonId, userName, userRole, userPersona, syncPtaRoles, access, refresh]);

  return <AuthContext.Provider value={value}>
    {syncPtaRoles && !checked ? <div role="status">Verificando permisos PTA…</div>
      : syncPtaRoles && !access ? <div role="alert">
        No fue posible verificar sus permisos. <button onClick={() => { void refresh(); }}>Reintentar</button>
      </div> : children}
  </AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      isAuthenticated: false,
      isSuperUser: false,
      session: unauthenticatedSession,
      hasPermission: () => false,
      hasAnyPermission: () => false,
    };
  }
  return ctx;
}

