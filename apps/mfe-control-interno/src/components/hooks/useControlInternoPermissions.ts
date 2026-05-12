import { useMemo } from 'react';
import { Permissions } from '@esap-mfe/shared-types/permissions';

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE PERMISOS FLEXIBLE - CONTROL INTERNO
// ═══════════════════════════════════════════════════════════════════════════
// Este sistema es EXTENSIBLE y NO depende de nombres de roles hardcodeados.
// Los permisos se definen en src/enums/permissions.ts y pueden ser asignados
// a cualquier rol desde el backend o configuración.
// ═══════════════════════════════════════════════════════════════════════════

// Tipos de acciones disponibles (extensible)
type AccionPermiso = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'assign' | 'activate' | 'follow-up' | 'execute';

// Módulos del sistema Control Interno (extensible)
type ModuloControlInterno = 
  | 'dashboard'
  | 'plan-anual'
  | 'planificacion'
  | 'planes-mejoramiento'
  | 'informes-ley'
  | 'expedientes'
  | 'auditorias'
  | 'listas-chequeo'
  | 'roles-permisos'
  | 'config-auditorias'
  | 'configuraciones';

// Mapeo de módulo+acción a permiso del enum (fuente de verdad)
const MAPA_PERMISOS: Record<string, string> = {
  // Plan Anual 5 Roles
  'plan-anual:view': Permissions.CONTROL_INTERNO_PLAN_ANUAL_VIEW,
  'plan-anual:create': Permissions.CONTROL_INTERNO_PLAN_ANUAL_CREATE,
  'plan-anual:edit': Permissions.CONTROL_INTERNO_PLAN_ANUAL_EDIT,
  'plan-anual:delete': Permissions.CONTROL_INTERNO_PLAN_ANUAL_DELETE,
  'plan-anual:approve': Permissions.CONTROL_INTERNO_PLAN_ANUAL_APPROVE,
  'plan-anual:activate': Permissions.CONTROL_INTERNO_PLAN_ANUAL_ACTIVATE,
  'plan-anual:export': Permissions.CONTROL_INTERNO_PLAN_ANUAL_EXPORT,
  'plan-anual:assign': Permissions.CONTROL_INTERNO_PLAN_ANUAL_ASSIGN,
  'plan-anual:follow-up': Permissions.CONTROL_INTERNO_PLAN_ANUAL_FOLLOW_UP,
  
  // Planificación (compatibilidad con código existente)
  'planificacion:view': Permissions.CONTROL_INTERNO_PLANEACION_MANAGE,
  'planificacion:create': Permissions.CONTROL_INTERNO_PLANEACION_CREATE,
  'planificacion:edit': Permissions.CONTROL_INTERNO_PLANEACION_PLAN_EDIT,
  'planificacion:delete': Permissions.CONTROL_INTERNO_PLANEACION_MANAGE,
  'planificacion:approve': Permissions.CONTROL_INTERNO_PLAN_ANUAL_APPROVE, // Redirige a plan-anual
  'planificacion:export': Permissions.CONTROL_INTERNO_PLAN_ANUAL_EXPORT,
  
  // Auditorías
  'auditorias:view': Permissions.CONTROL_INTERNO_AUDITORIA_VIEW,
  'auditorias:create': Permissions.CONTROL_INTERNO_AUDITORIA_CREATE,
  'auditorias:edit': Permissions.CONTROL_INTERNO_AUDITORIA_EDIT,
  'auditorias:delete': Permissions.CONTROL_INTERNO_AUDITORIA_DELETE,
  'auditorias:approve': Permissions.CONTROL_INTERNO_AUDITORIA_APPROVE,
  'auditorias:export': Permissions.CONTROL_INTERNO_AUDITORIA_EXPORT,
  'auditorias:manage': Permissions.CONTROL_INTERNO_AUDITORIA_MANAGE,
  'auditorias:assign': Permissions.CONTROL_INTERNO_AUDITORIA_MANAGE,
  'auditorias:execute': Permissions.CONTROL_INTERNO_AUDITORIA_EDIT, // Permiso para gestionar progreso de las asignaciones propias
  
  // Hallazgos
  'hallazgos:view': Permissions.CONTROL_INTERNO_HALLAZGOS_VIEW,
  'hallazgos:create': Permissions.CONTROL_INTERNO_HALLAZGOS_CREATE,
  'hallazgos:edit': Permissions.CONTROL_INTERNO_HALLAZGOS_EDIT,
  'hallazgos:delete': Permissions.CONTROL_INTERNO_HALLAZGOS_DELETE,
  'hallazgos:approve': Permissions.CONTROL_INTERNO_HALLAZGOS_APPROVE,
  'hallazgos:manage': Permissions.CONTROL_INTERNO_HALLAZGOS_MANAGE,
  
  // Planes de Mejoramiento
  'planes-mejoramiento:view': Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_VIEW,
  'planes-mejoramiento:create': Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_CREATE,
  'planes-mejoramiento:edit': Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_EDIT,
  'planes-mejoramiento:delete': Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_DELETE,
  'planes-mejoramiento:approve': Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_APPROVE,
  'planes-mejoramiento:follow-up': Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_FOLLOW_UP,
  'planes-mejoramiento:manage': Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_MANAGE,
  
  // Informes de Ley
  'informes-ley:view': Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_VIEW,
  'informes-ley:create': Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_CREATE,
  'informes-ley:edit': Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_EDIT,
  'informes-ley:delete': Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_DELETE,
  'informes-ley:approve': Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_APPROVE,
  'informes-ley:export': Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_EXPORT,
  'informes-ley:generate': Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_GENERATE,
  'informes-ley:manage': Permissions.CONTROL_INTERNO_INFORMES_DE_LEY_MANAGE,
  
  // Evidencias
  'evidencias:view': Permissions.CONTROL_INTERNO_EVIDENCIAS_VIEW,
  'evidencias:create': Permissions.CONTROL_INTERNO_EVIDENCIAS_CREATE,
  'evidencias:delete': Permissions.CONTROL_INTERNO_EVIDENCIAS_DELETE,
  'evidencias:validate': Permissions.CONTROL_INTERNO_EVIDENCIAS_VALIDATE,
  
  // Documentos
  'documentos:view': Permissions.CONTROL_INTERNO_DOCUMENTOS_VIEW,
  'documentos:create': Permissions.CONTROL_INTERNO_DOCUMENTOS_CREATE,
  'documentos:edit': Permissions.CONTROL_INTERNO_DOCUMENTOS_EDIT,
  'documentos:delete': Permissions.CONTROL_INTERNO_DOCUMENTOS_DELETE,
  
  // Expedientes
  'expedientes:view': Permissions.CONTROL_INTERNO_EXPEDIENTES_MANAGE,
  'expedientes:create': Permissions.CONTROL_INTERNO_EXPEDIENTES_UPLOAD,
  'expedientes:edit': Permissions.CONTROL_INTERNO_EXPEDIENTES_MANAGE,
  'expedientes:export': Permissions.CONTROL_INTERNO_EXPEDIENTES_MANAGE,
  
  // Configuraciones
  'configuraciones:view': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
  'configuraciones:edit': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
  'config-auditorias:view': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
  'config-auditorias:edit': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
  'configuraciones:capacidades': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
  
  // Biblioteca / Listas de Chequeo
  'listas-chequeo:view': Permissions.CONTROL_INTERNO_LISTAS_CHEQUEO_VIEW,
  'listas-chequeo:create': Permissions.CONTROL_INTERNO_LISTAS_CHEQUEO_CREATE,
  'listas-chequeo:edit': Permissions.CONTROL_INTERNO_LISTAS_CHEQUEO_EDIT,
  'listas-chequeo:delete': Permissions.CONTROL_INTERNO_LISTAS_CHEQUEO_DELETE,
  'listas-chequeo:apply': Permissions.CONTROL_INTERNO_LISTAS_CHEQUEO_APPLY,
  'listas-chequeo:export': Permissions.CONTROL_INTERNO_LISTAS_CHEQUEO_EXPORT,
  
  // Dashboard (permiso general)
  'dashboard:view': Permissions.CONTROL_INTERNO_PLANEACION_MANAGE,
  'dashboard:export': Permissions.CONTROL_INTERNO_PLANEACION_MANAGE,
  
  // Roles y Permisos
  'roles-permisos:view': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
  'roles-permisos:create': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
  'roles-permisos:edit': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
  'roles-permisos:delete': Permissions.CONTROL_INTERNO_CONFIGURACIONES_MANAGE,
};

// Roles que tienen TODOS los permisos (superusuarios)
const ROLES_SUPERUSUARIO = ['ADMIN', 'SUPER_ADMIN', 'ADMINISTRATIVO'];

/**
 * Hook flexible para validar permisos del módulo Control Interno
 * 
 * @description Este hook verifica permisos basándose en:
 * 1. Lista de permisos del usuario (strings como 'control-interno.plan-anual.approve')
 * 2. Roles de superusuario (ADMIN, SUPER_ADMIN) que tienen acceso total
 * 3. Mapeo flexible de módulo+acción a permiso específico
 * 
 * NO depende de nombres de roles específicos como 'JEFE_OCI' o 'AUDITOR'.
 * Los permisos se pueden asignar a CUALQUIER rol desde el backend.
 */
export function useControlInternoPermissions(
  userRoles?: string[],
  userData?: { roles?: string[]; permissions?: string[] }
) {
  // Obtener permisos y roles del usuario
  const { permisosUsuario, rolesUsuario } = useMemo(() => {
    let permisos: string[] = [];
    let roles: string[] = [];
    
    // Combinar roles de props
    roles = [
      ...(userRoles || []),
      ...(userData?.roles || [])
    ];
    
    // Obtener permisos de props
    if (userData?.permissions) {
      permisos = [...userData.permissions];
    }
    
    // Si no hay datos en props, leer del caché en memoria compartido por el shell (OTIC-002)
    if (roles.length === 0 && permisos.length === 0) {
      try {
        // window.__esap_auth_cache es el puente en-memoria que setea el shell tras verifyToken/login
        const windowUser = (window as any).__esap_auth_cache;
        if (windowUser) {
          const userRoles: any[] = Array.isArray(windowUser.roles) ? windowUser.roles : [];

          const roleCodes = userRoles
            .map((r: any) => (typeof r === 'string' ? r : r?.code || ''))
            .filter(Boolean);
          roles.push(...roleCodes);

          // Permisos directos del usuario
          if (Array.isArray(windowUser.permissions)) {
            permisos.push(...windowUser.permissions.filter(Boolean));
          }

          // Permisos dentro de cada rol
          const rolePerms = userRoles.flatMap((r: any) =>
            Array.isArray(r?.permissions)
              ? r.permissions
                  .map((p: any) => (typeof p === 'string' ? p : p?.code || ''))
                  .filter(Boolean)
              : [],
          );
          permisos.push(...rolePerms);
        }
      } catch (error) {
        console.warn('⚠️ [useControlInternoPermissions] Error al leer caché de usuario:', error);
      }
    }
    
    // Normalizar roles
    const rolesNormalizados = roles
      .map((r: any) => {
        if (typeof r === 'string') return r.toUpperCase().trim();
        return (r?.code || r?.name || '').toUpperCase().trim();
      })
      .filter(Boolean);
    
    // Normalizar permisos
    const permisosNormalizados = permisos
      .map((p: any) => typeof p === 'string' ? p.toLowerCase().trim() : '')
      .filter(Boolean);
    
    return {
      permisosUsuario: Array.from(new Set(permisosNormalizados)),
      rolesUsuario: Array.from(new Set(rolesNormalizados))
    };
  }, [userRoles, userData]);

  // Verificar si es superusuario
  const esSuperUsuario = useMemo(() => {
    return rolesUsuario.some(rol => ROLES_SUPERUSUARIO.includes(rol));
  }, [rolesUsuario]);

  // Función para verificar un permiso específico
  const tienePermiso = useMemo(() => {
    return (permiso: string): boolean => {
      // Superusuarios tienen todo
      if (esSuperUsuario) return true;
      
      // Verificar permiso exacto
      const permisoLower = permiso.toLowerCase();
      if (permisosUsuario.includes(permisoLower)) return true;
      
      // Verificar permiso con wildcard (ej: 'control-interno.plan-anual.*')
      const permisoBase = permisoLower.split('.').slice(0, -1).join('.');
      if (permisosUsuario.includes(`${permisoBase}.*`)) return true;
      if (permisosUsuario.includes(`${permisoBase}.manage`)) return true;
      
      return false;
    };
  }, [permisosUsuario, esSuperUsuario]);

  // Verificar si puede realizar una acción en un módulo
  const puedeRealizar = useMemo(() => {
    return (modulo: string, accion: AccionPermiso): boolean => {
      // Superusuarios tienen todo
      if (esSuperUsuario) return true;
      
      // Buscar el permiso en el mapeo
      const clave = `${modulo}:${accion}`;
      const permisoRequerido = MAPA_PERMISOS[clave];
      
      if (!permisoRequerido) {
        console.warn(`⚠️ [useControlInternoPermissions] Permiso no mapeado: ${clave}`);
        return false;
      }
      
      return tienePermiso(permisoRequerido);
    };
  }, [tienePermiso, esSuperUsuario]);

  // Verificar si puede acceder a un submódulo (tiene al menos view)
  const puedeAcceder = useMemo(() => {
    return (submodulo: string): boolean => {
      // Superusuarios tienen acceso total
      if (esSuperUsuario) return true;
      
      // Verificar permiso de vista para el submódulo
      return puedeRealizar(submodulo, 'view');
    };
  }, [puedeRealizar, esSuperUsuario]);

  // Obtener submódulos accesibles
  const submódulosAccesibles = useMemo(() => {
    const todosModulos = [
      'dashboard',
      'plan-anual',
      'planificacion',
      'planes-mejoramiento',
      'informes-ley',
      'expedientes',
      'auditorias',
      'roles-permisos',
      'config-auditorias'
    ];
    
    // Superusuarios ven todo
    if (esSuperUsuario) return todosModulos;
    
    // Filtrar solo los que puede ver
    return todosModulos.filter(modulo => puedeRealizar(modulo, 'view'));
  }, [puedeRealizar, esSuperUsuario]);

  return {
    esSuperUsuario,
    tienePermiso,
    puedeAcceder,
    puedeRealizar,
    submódulosAccesibles,
    permisosUsuario,
    rolesUsuario,
  };
}
