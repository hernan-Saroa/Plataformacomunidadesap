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
  // Obtener roles del usuario - COMBINAR ambos arrays y también buscar en localStorage
  const rolesUsuario = useMemo(() => {
    // Combinar ambos arrays de roles (userRoles y userData?.roles)
    let rolesCombinados = [
      ...(userRoles || []),
      ...(userData?.roles || [])
    ];
    
    // Si no hay roles en props, intentar obtenerlos desde localStorage
    if (rolesCombinados.length === 0) {
      try {
        const sesion = localStorage.getItem('esap-sesion-activa');
        if (sesion) {
          const sesionData = JSON.parse(sesion);
          
          // Buscar roles en diferentes ubicaciones de la sesión
          if (sesionData.roles) {
            const roles = Array.isArray(sesionData.roles) ? sesionData.roles : [sesionData.roles];
            rolesCombinados.push(...roles);
          }
          
          if (sesionData.user?.roles) {
            const userRoles = Array.isArray(sesionData.user.roles) ? sesionData.user.roles : [sesionData.user.roles];
            rolesCombinados.push(...userRoles);
          }
          
          if (sesionData.userData?.roles) {
            const userDataRoles = Array.isArray(sesionData.userData.roles) ? sesionData.userData.roles : [sesionData.userData.roles];
            rolesCombinados.push(...userDataRoles);
          }
        }
      } catch (error) {
        console.warn('⚠️ [useControlInternoPermissions] Error al leer sesión desde localStorage:', error);
      }
    }
    
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
        return rolEncontrado;
      }
    }
    
    // Si no hay coincidencia exacta, buscar coincidencias parciales (fallback)
    for (const rolUsuario of rolesUsuario) {
      if ((rolUsuario.includes('JEFE') && rolUsuario.includes('OCI')) || 
          (rolUsuario.includes('JEFE') && rolUsuario.includes('CONTROL_INTERNO'))) {
        rolEncontrado = 'JEFE_OCI';
        return rolEncontrado;
      }
      if (rolUsuario.includes('PROFESIONAL') && rolUsuario.includes('AUDITOR')) {
        rolEncontrado = 'PROFESIONAL_AUDITOR';
        return rolEncontrado;
      }
      if (rolUsuario.includes('AUXILIAR') && rolUsuario.includes('AUDITORIA')) {
        rolEncontrado = 'AUXILIAR_AUDITORIA';
        return rolEncontrado;
      }
      if (rolUsuario.includes('CONSULTA')) {
        rolEncontrado = 'CONSULTA';
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
      // ⚠️ TEMPORAL: Mostrar todos los módulos sin validar permisos
      return true;
      
      /* CÓDIGO ORIGINAL COMENTADO TEMPORALMENTE
      // Si el usuario es ADMIN, SUPER_ADMIN o ADMINISTRATIVO, dar acceso completo
      const esAdmin = rolesUsuario.some(r => 
        r.includes('ADMIN') || r.includes('ADMINISTRATIVO')
      );
      
      if (esAdmin) {
        return true;
      }
      
      // Si no hay rol detectado, denegar acceso
      if (!rolDetectado) {
        console.warn('⚠️ [useControlInternoPermissions] Sin rol detectado, acceso denegado a:', submodulo);
        return false;
      }
      
      const permisos = PERMISOS_POR_ROL[rolDetectado];
      const permiso = permisos.find(p => p.submodulo === submodulo);
      
      const tieneAcceso = permiso ? permiso.acciones.includes('view') : false;
      
      return tieneAcceso;
      */
    };
  }, [rolDetectado, rolesUsuario]);

  // Verificar si puede realizar una acción específica
  const puedeRealizar = useMemo(() => {
    return (
      submodulo: string, 
      accion: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export'
    ): boolean => {
      // Si el usuario es ADMIN, SUPER_ADMIN o ADMINISTRATIVO, dar acceso completo
      const esAdmin = rolesUsuario.some(r => 
        r.includes('ADMIN') || r.includes('ADMINISTRATIVO')
      );
      
      if (esAdmin) {
        return true;
      }
      
      if (!rolDetectado) return false;
      
      const permisos = PERMISOS_POR_ROL[rolDetectado];
      const permiso = permisos.find(p => p.submodulo === submodulo);
      
      return permiso ? permiso.acciones.includes(accion) : false;
    };
  }, [rolDetectado, rolesUsuario]);

  // Obtener submódulos accesibles
  const submódulosAccesibles = useMemo(() => {
    // ⚠️ TEMPORAL: Devolver todos los submódulos disponibles
    return [
      'dashboard',
      'planificacion',
      'planes-mejoramiento',
      'informes-ley',
      'expedientes',
      'roles-permisos',
      'config-auditorias'
    ];
    
    /* CÓDIGO ORIGINAL COMENTADO TEMPORALMENTE
    // Si el usuario es ADMIN, dar acceso a todos los submódulos
    const esAdmin = rolesUsuario.some(r => 
      r.includes('ADMIN') || r.includes('ADMINISTRATIVO')
    );
    
    if (esAdmin) {
      // Todos los submódulos disponibles
      return [
        'dashboard',
        'planificacion',
        'planes-mejoramiento',
        'informes-ley',
        'expedientes',
        'roles-permisos',
        'config-auditorias'
      ];
    }
    
    if (!rolDetectado) return [];
    
    const permisos = PERMISOS_POR_ROL[rolDetectado];
    return permisos
      .filter(p => p.acciones.includes('view'))
      .map(p => p.submodulo);
    */
  }, [rolDetectado, rolesUsuario]);

  return {
    rolDetectado,
    puedeAcceder,
    puedeRealizar,
    submódulosAccesibles,
    rolesUsuario,
  };
}
