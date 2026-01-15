import { useMemo } from 'react';

// Tipos de roles del módulo
type RolControlInterno = 
  | 'JEFE_OCI' 
  | 'PROFESIONAL_AUDITOR' 
  | 'AUXILIAR_AUDITORIA' 
  | 'CONSULTA';

interface PermisoSubmodulo {
  submodulo: string;
  acciones: ('view' | 'create' | 'edit' | 'delete' | 'approve' | 'export')[];
}

// Mapeo de roles a permisos por submódulo
const PERMISOS_POR_ROL: Record<RolControlInterno, PermisoSubmodulo[]> = {
  'JEFE_OCI': [
    { submodulo: 'dashboard', acciones: ['view', 'export'] },
    { submodulo: 'planificacion', acciones: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
    { submodulo: 'planes-mejoramiento', acciones: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
    { submodulo: 'informes-ley', acciones: ['view', 'create', 'edit', 'delete', 'approve', 'export'] },
    { submodulo: 'expedientes', acciones: ['view', 'create', 'edit', 'delete', 'export'] },
    { submodulo: 'roles-permisos', acciones: ['view', 'create', 'edit', 'delete'] },
    { submodulo: 'config-auditorias', acciones: ['view', 'edit'] },
  ],
  
  'PROFESIONAL_AUDITOR': [
    { submodulo: 'dashboard', acciones: ['view', 'export'] },
    { submodulo: 'planificacion', acciones: ['view', 'edit', 'export'] },
    { submodulo: 'planes-mejoramiento', acciones: ['view', 'create', 'edit', 'export'] },
    { submodulo: 'informes-ley', acciones: ['view', 'create', 'edit', 'export'] },
    { submodulo: 'expedientes', acciones: ['view', 'create', 'edit', 'export'] },
    { submodulo: 'roles-permisos', acciones: ['view'] },
    { submodulo: 'config-auditorias', acciones: ['view'] },
  ],
  
  'AUXILIAR_AUDITORIA': [
    { submodulo: 'dashboard', acciones: ['view'] },
    { submodulo: 'planificacion', acciones: ['view'] },
    { submodulo: 'planes-mejoramiento', acciones: ['view'] },
    { submodulo: 'informes-ley', acciones: ['view', 'create'] },
    { submodulo: 'expedientes', acciones: ['view', 'create'] },
    { submodulo: 'roles-permisos', acciones: [] }, // Sin acceso
    { submodulo: 'config-auditorias', acciones: [] }, // Sin acceso
  ],
  
  'CONSULTA': [
    { submodulo: 'dashboard', acciones: ['view'] },
    { submodulo: 'planificacion', acciones: ['view'] },
    { submodulo: 'planes-mejoramiento', acciones: ['view'] },
    { submodulo: 'informes-ley', acciones: ['view'] },
    { submodulo: 'expedientes', acciones: ['view'] },
    { submodulo: 'roles-permisos', acciones: [] }, // Sin acceso
    { submodulo: 'config-auditorias', acciones: [] }, // Sin acceso
  ],
};

/**
 * Hook para validar permisos del módulo Control Interno
 */
export function useControlInternoPermissions(
  userRoles?: string[],
  userData?: { roles?: string[] }
) {
  // Obtener roles del usuario
  const rolesUsuario = useMemo(() => {
    const roles = userRoles || userData?.roles || [];
    
    // Normalizar roles (convertir a mayúsculas y buscar coincidencias)
    return roles.map((r: any) => {
      const rolStr = typeof r === 'string' ? r : (r?.code || r?.name || '');
      return rolStr.toUpperCase();
    });
  }, [userRoles, userData]);

  // Detectar rol del usuario en Control Interno
  const rolDetectado = useMemo<RolControlInterno | null>(() => {
    // Si es ADMIN, dar acceso completo como JEFE_OCI
    if (rolesUsuario.includes('ADMIN')) {
      return 'JEFE_OCI';
    }
    
    // Buscar rol específico de Control Interno
    for (const rolUsuario of rolesUsuario) {
      if (rolUsuario.includes('JEFE') && (rolUsuario.includes('OCI') || rolUsuario.includes('CONTROL_INTERNO'))) {
        return 'JEFE_OCI';
      }
      if (rolUsuario.includes('PROFESIONAL') && rolUsuario.includes('AUDITOR')) {
        return 'PROFESIONAL_AUDITOR';
      }
      if (rolUsuario.includes('AUXILIAR') && rolUsuario.includes('AUDITORIA')) {
        return 'AUXILIAR_AUDITORIA';
      }
      if (rolUsuario.includes('CONSULTA')) {
        return 'CONSULTA';
      }
    }
    
    // Si tiene rol CONTROL_INTERNO genérico, asignar como Consulta por defecto
    if (rolesUsuario.includes('CONTROL_INTERNO')) {
      return 'CONSULTA';
    }
    
    return null;
  }, [rolesUsuario]);

  // Verificar si puede acceder a un submódulo
  const puedeAcceder = (submodulo: string): boolean => {
    if (!rolDetectado) return false;
    
    const permisos = PERMISOS_POR_ROL[rolDetectado];
    const permiso = permisos.find(p => p.submodulo === submodulo);
    
    return permiso ? permiso.acciones.includes('view') : false;
  };

  // Verificar si puede realizar una acción específica
  const puedeRealizar = (
    submodulo: string, 
    accion: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
  ): boolean => {
    if (!rolDetectado) return false;
    
    const permisos = PERMISOS_POR_ROL[rolDetectado];
    const permiso = permisos.find(p => p.submodulo === submodulo);
    
    return permiso ? permiso.acciones.includes(accion) : false;
  };

  // Obtener submódulos accesibles
  const submódulosAccesibles = useMemo(() => {
    if (!rolDetectado) return [];
    
    const permisos = PERMISOS_POR_ROL[rolDetectado];
    return permisos
      .filter(p => p.acciones.includes('view'))
      .map(p => p.submodulo);
  }, [rolDetectado]);

  return {
    rolDetectado,
    puedeAcceder,
    puedeRealizar,
    submódulosAccesibles,
    rolesUsuario,
  };
}

