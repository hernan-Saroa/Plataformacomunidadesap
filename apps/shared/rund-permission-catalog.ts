import { RUND_PROFILE_PERMISSIONS } from './rund-permissions';

const profiles = new Set<string>(Object.values(RUND_PROFILE_PERMISSIONS));
const photoPermissions = new Set(['banco-docentes.rund.photos.manage', 'banco-docentes.rund.photos.validate']);
export const isRundProfilePermission = (permission: { id: string; code?: string }) => profiles.has(permission.code || permission.id);
export const isLegacyRundPermission = (permission: { id: string; code?: string }) => {
  const code = permission.code || permission.id;
  return code.startsWith('banco-docentes.rund.') && !profiles.has(code) && !photoPermissions.has(code);
};

export function simplifyRundPermissionModules<T extends {
  permissions: { id: string; code?: string }[];
  permissionGroups?: { group: string; permissions: { id: string; code?: string }[] }[];
}>(modules: T[]): T[] {
  // During a rolling deployment the old catalog remains usable until the new
  // profile permissions have actually been installed.
  if (!modules.some(module => module.permissions.some(isRundProfilePermission))) return modules;
  return modules.map(module => ({ ...module,
    permissions: module.permissions.filter(permission => !isLegacyRundPermission(permission)),
    permissionGroups: module.permissionGroups?.map(group => ({ ...group,
      permissions: group.permissions.filter(permission => !isLegacyRundPermission(permission)),
    })).filter(group => group.permissions.length),
  })) as T[];
}

export function retainLegacyRundPermissions(selected: Set<string>, initialProfiles: Set<string>, profileIds: Set<string>, legacyIds: Set<string>) {
  const selectedProfiles = [...selected].filter(id => profileIds.has(id));
  const changed = selectedProfiles.length !== initialProfiles.size || selectedProfiles.some(id => !initialProfiles.has(id));
  return [...new Set([...selected, ...(!changed ? legacyIds : [])])];
}
