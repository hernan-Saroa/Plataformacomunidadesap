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
  // Obtener roles del usuario - COMBINAR ambos arrays
  const rolesUsuario = useMemo(() => {
    // Combinar ambos arrays de roles (userRoles y userData?.roles)
    const rolesCombinados = [
      ...(userRoles || []),
      ...(userData?.roles || [])
    ];
    
    // Normalizar roles (extraer código si es objeto, convertir a mayúsculas)
    const rolesNormalizados = rolesCombinados.map((r: any) => {
      if (typeof r === 'string') {
        return r.toUpperCase().trim();
      }
      // Si es objeto, extraer code o name
      const rolStr = r?.code || r?.name || '';
      return rolStr.toUpperCase().trim();
    }).filter(Boolean); // Filtrar valores vacíos
    
    // Eliminar duplicados
    const rolesUnicos = Array.from(new Set(rolesNormalizados));
    
    // Debug: Log para ver qué roles se están recibiendo
    if (rolesUnicos.length > 0) {
      console.log('🔍 [useControlInternoPermissions] Roles recibidos:', {
        userRoles,
        userDataRoles: userData?.roles,
        rolesCombinados,
        rolesNormalizados,
        rolesUnicos
      });
    }
    
    return rolesUnicos;
  }, [userRoles, userData]);

  // Detectar rol del usuario en Control Interno
  const rolDetectado = useMemo<RolControlInterno | null>(() => {
    let rolEncontrado: RolControlInterno | null = null;

    // Si es ADMIN, SUPER_ADMIN o ADMINISTRATIVO, dar acceso completo como JEFE_OCI
    if (rolesUsuario.includes('ADMIN') || 
        rolesUsuario.includes('SUPER_ADMIN') || 
        rolesUsuario.includes('ADMINISTRATIVO')) {
      rolEncontrado = 'JEFE_OCI';
      console.log('✅ [useControlInternoPermissions] Rol detectado (ADMIN):', rolEncontrado, 'de roles:', rolesUsuario);
      return rolEncontrado;
    }
    
    // Primero buscar coincidencias EXACTAS (más preciso)
    const rolesExactos: Record<string, RolControlInterno> = {
      'JEFE_OCI': 'JEFE_OCI',
      'PROFESIONAL_AUDITOR': 'PROFESIONAL_AUDITOR',
      'AUXILIAR_AUDITORIA': 'AUXILIAR_AUDITORIA',
      'CONSULTA': 'CONSULTA',
      // Roles antiguos para compatibilidad
      'JEFE_CONTROL_INTERNO': 'JEFE_OCI',
      'AUDITOR_LIDER': 'JEFE_OCI',
      'CONTROL_INTERNO': 'CONSULTA',
    };
    
    for (const rolUsuario of rolesUsuario) {
      // Buscar coincidencia exacta primero
      if (rolesExactos[rolUsuario]) {
        rolEncontrado = rolesExactos[rolUsuario];
        console.log('✅ [useControlInternoPermissions] Rol detectado (exacto):', rolEncontrado, 'de roles:', rolesUsuario);
        return rolEncontrado;
      }
    }
    
    // Si no hay coincidencia exacta, buscar coincidencias parciales (fallback)
    for (const rolUsuario of rolesUsuario) {
      if ((rolUsuario.includes('JEFE') && rolUsuario.includes('OCI')) || 
          (rolUsuario.includes('JEFE') && rolUsuario.includes('CONTROL_INTERNO'))) {
        rolEncontrado = 'JEFE_OCI';
        console.log('✅ [useControlInternoPermissions] Rol detectado (parcial):', rolEncontrado, 'de roles:', rolesUsuario);
        return rolEncontrado;
      }
      if (rolUsuario.includes('PROFESIONAL') && rolUsuario.includes('AUDITOR')) {
        rolEncontrado = 'PROFESIONAL_AUDITOR';
        console.log('✅ [useControlInternoPermissions] Rol detectado (parcial):', rolEncontrado, 'de roles:', rolesUsuario);
        return rolEncontrado;
      }
      if (rolUsuario.includes('AUXILIAR') && rolUsuario.includes('AUDITORIA')) {
        rolEncontrado = 'AUXILIAR_AUDITORIA';
        console.log('✅ [useControlInternoPermissions] Rol detectado (parcial):', rolEncontrado, 'de roles:', rolesUsuario);
        return rolEncontrado;
      }
      if (rolUsuario.includes('CONSULTA')) {
        rolEncontrado = 'CONSULTA';
        console.log('✅ [useControlInternoPermissions] Rol detectado (parcial):', rolEncontrado, 'de roles:', rolesUsuario);
        return rolEncontrado;
      }
    }
    
    // Debug: Log si no se detectó ningún rol
    if (!rolesUsuario.length) {
      console.warn('⚠️ [useControlInternoPermissions] No se recibieron roles del usuario');
    } else {
      console.warn('⚠️ [useControlInternoPermissions] Roles recibidos pero ninguno coincide con Control Interno:', rolesUsuario);
    }
    
    return null;
  }, [rolesUsuario]);

  // Verificar si puede acceder a un submódulo
  const puedeAcceder = useMemo(() => {
    return (submodulo: string): boolean => {
      if (!rolDetectado) return false;
      
      const permisos = PERMISOS_POR_ROL[rolDetectado];
      const permiso = permisos.find(p => p.submodulo === submodulo);
      
      return permiso ? permiso.acciones.includes('view') : false;
    };
  }, [rolDetectado]);

  // Verificar si puede realizar una acción específica
  const puedeRealizar = useMemo(() => {
    return (
      submodulo: string, 
      accion: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
    ): boolean => {
      if (!rolDetectado) return false;
      
      const permisos = PERMISOS_POR_ROL[rolDetectado];
      const permiso = permisos.find(p => p.submodulo === submodulo);
      
      return permiso ? permiso.acciones.includes(accion) : false;
    };
  }, [rolDetectado]);

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
