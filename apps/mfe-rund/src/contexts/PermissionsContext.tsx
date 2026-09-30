import { createContext, ReactNode, useContext, useMemo } from 'react';

type PermissionsContextValue = {
  modules: string[];
  permissions: string[];
  hasModule: (moduleCode: string) => boolean;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissionCodes: string[]) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

interface PermissionsProviderProps {
  modules?: string[];
  permissions?: string[];
  children: ReactNode;
}

export function PermissionsProvider({
  modules = [],
  permissions = [],
  children,
}: PermissionsProviderProps) {
  const normalizedModules = useMemo(
    () => Array.from(new Set(modules.filter(Boolean))),
    [modules],
  );

  const normalizedPermissions = useMemo(
    () => Array.from(new Set(permissions.filter(Boolean))),
    [permissions],
  );

  const hasModule = (moduleCode: string) =>
    normalizedModules.includes('all') || normalizedModules.includes(moduleCode);

  const hasPermission = (permissionCode: string) =>
    normalizedModules.includes('all') ||
    normalizedPermissions.includes(permissionCode);

  const hasAnyPermission = (permissionCodes: string[]) =>
    permissionCodes.some(hasPermission);

  const value = useMemo(
    () => ({
      modules: normalizedModules,
      permissions: normalizedPermissions,
      hasModule,
      hasPermission,
      hasAnyPermission,
    }),
    [normalizedModules, normalizedPermissions],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return ctx;
}
