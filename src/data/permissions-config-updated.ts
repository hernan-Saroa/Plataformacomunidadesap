/**
 * Configuración de permisos por módulos
 */

export const PERMISSION_MODULES = {
  dashboard: {
    name: 'Dashboard',
    permissions: ['view', 'export']
  },
  usuarios: {
    name: 'Usuarios',
    permissions: ['view', 'create', 'edit', 'delete']
  },
  roles: {
    name: 'Roles y Permisos',
    permissions: ['view', 'create', 'edit', 'delete']
  },
  auditoria: {
    name: 'Auditoría',
    permissions: ['view', 'export']
  }
};
