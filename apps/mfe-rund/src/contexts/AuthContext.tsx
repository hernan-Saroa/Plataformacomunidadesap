import { createContext, useContext, useMemo, type ReactNode } from 'react';

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
}

const AuthContext = createContext<AuthContextValue | null>(null);

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
}: AuthProviderProps) {
  const value = useMemo<AuthContextValue>(() => {
    const normalizedPermisos = Array.isArray(permisos) ? permisos : [];
    const hasPermission = (permissionId: string) =>
      Boolean(isSuperUser || normalizedPermisos.includes(permissionId));
    const hasAnyPermission = (permissionIds: string[]) =>
      Boolean(isSuperUser || permissionIds.some((id) => normalizedPermisos.includes(id)));

    return {
      isAuthenticated: Boolean(userEmail || userPersonId),
      userPersonId,
      userEmail,
      userName,
      userRole,
      userPersona,
      isSuperUser: Boolean(isSuperUser),
      session: {
        rol: sessionRol || userRole,
        permisos: normalizedPermisos,
      },
      hasPermission,
      hasAnyPermission,
    };
  }, [isSuperUser, permisos, sessionRol, userEmail, userPersonId, userName, userRole, userPersona]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      isAuthenticated: false,
      isSuperUser: false,
      session: { permisos: [] },
      hasPermission: () => false,
      hasAnyPermission: () => false,
    };
  }
  return ctx;
}

