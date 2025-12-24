/**
 * ============================================
 * SINCRONIZACIÓN DE ROLES Y PERMISOS
 * ============================================
 * 
 * Este módulo actúa como fuente única de verdad para:
 * - Roles del sistema completo
 * - Permisos granulares por módulo
 * - Sincronización entre módulo general (Gestión Personas) y módulos específicos (Control Interno)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025
 */

// ============ TIPOS ============

export type TipoRol = 'Sistema' | 'Personalizado';
export type EstadoRol = 'Activo' | 'Inactivo';
export type PermisoAccion = 'crear' | 'leer' | 'actualizar' | 'eliminar' | 'aprobar' | 'exportar';
export type CategoriaModulo = 
  | 'General' 
  | 'Estructura' 
  | 'Académica' 
  | 'Control Interno' 
  | 'Control Disciplinario' 
  | 'Gestión Legal'
  | 'Comunidad';

export interface Permiso {
  id: string;
  modulo: string;
  categoria: CategoriaModulo;
  acciones: PermisoAccion[];
  descripcion: string;
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoRol;
  estado: EstadoRol;
  usuariosAsignados: number;
  permisos: Permiso[];
  color: string;
  icono: string;
  creadoPor?: string;
  fechaCreacion?: string;
  modificadoPor?: string;
  fechaModificacion?: string;
  // Categoría del rol para filtrado
  categoriaRol: CategoriaModulo;
}

// ============ MÓDULOS DEL SISTEMA ============

export const MODULOS_SISTEMA: { nombre: string; categoria: CategoriaModulo }[] = [
  // General
  { nombre: 'Dashboard Ejecutivo', categoria: 'General' },
  { nombre: 'Gestión de Personas', categoria: 'General' },
  { nombre: 'Roles y Permisos', categoria: 'General' },
  { nombre: 'Auditoría del Sistema', categoria: 'General' },
  { nombre: 'Reportes y Análisis', categoria: 'General' },
  
  // Estructura
  { nombre: 'Estructura Organizacional', categoria: 'Estructura' },
  { nombre: 'Arquitectura Empresarial', categoria: 'Estructura' },
  
  // Académica
  { nombre: 'Programas Académicos', categoria: 'Académica' },
  { nombre: 'Gestión Profesoral', categoria: 'Académica' },
  { nombre: 'Aspirantes', categoria: 'Académica' },
  { nombre: 'Verificación de Graduados', categoria: 'Académica' },
  { nombre: 'Certificados Académicos', categoria: 'Académica' },
  { nombre: 'Solicitudes de Revisión', categoria: 'Académica' },
  
  // Control Interno de Gestión
  { nombre: 'Control Interno - Plan Anual', categoria: 'Control Interno' },
  { nombre: 'Control Interno - Universo Auditorías', categoria: 'Control Interno' },
  { nombre: 'Control Interno - Programa Anual', categoria: 'Control Interno' },
  { nombre: 'Control Interno - Auditorías', categoria: 'Control Interno' },
  { nombre: 'Control Interno - Hallazgos', categoria: 'Control Interno' },
  { nombre: 'Control Interno - Planes de Mejoramiento', categoria: 'Control Interno' },
  { nombre: 'Control Interno - Seguimiento', categoria: 'Control Interno' },
  { nombre: 'Control Interno - Informes de Ley', categoria: 'Control Interno' },
  { nombre: 'Control Interno - Gestión Documental', categoria: 'Control Interno' },
  
  // Control Disciplinario
  { nombre: 'Control Disciplinario - Quejas', categoria: 'Control Disciplinario' },
  { nombre: 'Control Disciplinario - Procesos', categoria: 'Control Disciplinario' },
  { nombre: 'Control Disciplinario - Investigaciones', categoria: 'Control Disciplinario' },
  { nombre: 'Control Disciplinario - Sanciones', categoria: 'Control Disciplinario' },
  
  // Gestión Legal
  { nombre: 'Gestión Legal - Juzgamiento', categoria: 'Gestión Legal' },
  { nombre: 'Gestión Legal - Expedientes', categoria: 'Gestión Legal' },
  { nombre: 'Gestión Legal - Sentencias', categoria: 'Gestión Legal' },
  
  // Comunidad
  { nombre: 'Comunidad - Publicaciones', categoria: 'Comunidad' },
  { nombre: 'Comunidad - Eventos', categoria: 'Comunidad' },
  { nombre: 'Comunidad - Anuncios', categoria: 'Comunidad' },
  { nombre: 'Bolsa de Empleo', categoria: 'Comunidad' },
  { nombre: 'Certificados Laborales', categoria: 'Comunidad' },
  { nombre: 'Carpeta Digital', categoria: 'Comunidad' }
];

// ============ ROLES DEL SISTEMA ============

export const ROLES_SISTEMA: Rol[] = [
  // ━━━━━━━━━━━ ROLES GENERALES ━━━━━━━━━━━
  
  {
    id: 'rol-super-admin',
    nombre: 'Super Administrador',
    descripcion: 'Acceso total al sistema con todos los permisos administrativos',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 2,
    color: '#DC2626',
    icono: '👑',
    categoriaRol: 'General',
    permisos: MODULOS_SISTEMA.map(({ nombre, categoria }) => ({
      id: `perm-super-${nombre}`,
      modulo: nombre,
      categoria,
      acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'],
      descripcion: 'Acceso total al módulo'
    })),
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // ━━━━━━━━━━━ ROLES DE CONTROL INTERNO DE GESTIÓN ━━━━━━━━━━━
  
  {
    id: 'rol-jefe-oci',
    nombre: 'Jefe OCI',
    descripcion: 'Jefe de Oficina de Control Interno - Control total del sistema de Control Interno de Gestión',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 1,
    color: '#EF4444',
    icono: '🛡️',
    categoriaRol: 'Control Interno',
    permisos: [
      // Dashboard
      { 
        id: 'perm-jefe-dash', 
        modulo: 'Dashboard Ejecutivo', 
        categoria: 'General',
        acciones: ['leer', 'exportar'], 
        descripcion: 'Visualización y exportación de métricas ejecutivas' 
      },
      { 
        id: 'perm-jefe-rep', 
        modulo: 'Reportes y Análisis', 
        categoria: 'General',
        acciones: ['leer', 'exportar'], 
        descripcion: 'Generación de reportes analíticos' 
      },
      // Control Interno - ACCESO TOTAL
      { 
        id: 'perm-jefe-plan', 
        modulo: 'Control Interno - Plan Anual', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa del Plan Anual' 
      },
      { 
        id: 'perm-jefe-universo', 
        modulo: 'Control Interno - Universo Auditorías', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa del Universo Auditable' 
      },
      { 
        id: 'perm-jefe-programa', 
        modulo: 'Control Interno - Programa Anual', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa del Programa Anual' 
      },
      { 
        id: 'perm-jefe-audit', 
        modulo: 'Control Interno - Auditorías', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa de Auditorías' 
      },
      { 
        id: 'perm-jefe-hallazgos', 
        modulo: 'Control Interno - Hallazgos', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa de Hallazgos' 
      },
      { 
        id: 'perm-jefe-mejora', 
        modulo: 'Control Interno - Planes de Mejoramiento', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa de Planes de Mejoramiento' 
      },
      { 
        id: 'perm-jefe-seg', 
        modulo: 'Control Interno - Seguimiento', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa de Seguimiento' 
      },
      { 
        id: 'perm-jefe-informes', 
        modulo: 'Control Interno - Informes de Ley', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa de Informes de Ley' 
      },
      { 
        id: 'perm-jefe-doc', 
        modulo: 'Control Interno - Gestión Documental', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'eliminar', 'aprobar', 'exportar'], 
        descripcion: 'Gestión completa de Documentos' 
      },
      // Acceso consulta a Gestión Personas
      { 
        id: 'perm-jefe-personas', 
        modulo: 'Gestión de Personas', 
        categoria: 'General',
        acciones: ['leer'], 
        descripcion: 'Consulta de personas del sistema' 
      },
      { 
        id: 'perm-jefe-roles', 
        modulo: 'Roles y Permisos', 
        categoria: 'General',
        acciones: ['leer'], 
        descripcion: 'Consulta de roles y permisos' 
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  {
    id: 'rol-auditor-lider',
    nombre: 'Auditor Líder',
    descripcion: 'Líder de equipos de auditoría, gestiona auditorías y supervisa hallazgos',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 6,
    color: '#3B82F6',
    icono: '📋',
    categoriaRol: 'Control Interno',
    permisos: [
      { 
        id: 'perm-lider-dash', 
        modulo: 'Dashboard Ejecutivo', 
        categoria: 'General',
        acciones: ['leer'], 
        descripcion: 'Visualización de dashboard' 
      },
      { 
        id: 'perm-lider-plan', 
        modulo: 'Control Interno - Plan Anual', 
        categoria: 'Control Interno',
        acciones: ['leer', 'exportar'], 
        descripcion: 'Consulta del Plan Anual' 
      },
      { 
        id: 'perm-lider-programa', 
        modulo: 'Control Interno - Programa Anual', 
        categoria: 'Control Interno',
        acciones: ['leer', 'exportar'], 
        descripcion: 'Consulta del Programa' 
      },
      { 
        id: 'perm-lider-audit', 
        modulo: 'Control Interno - Auditorías', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'exportar'], 
        descripcion: 'Gestión de auditorías asignadas' 
      },
      { 
        id: 'perm-lider-hallazgos', 
        modulo: 'Control Interno - Hallazgos', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'exportar'], 
        descripcion: 'Registro y seguimiento de hallazgos' 
      },
      { 
        id: 'perm-lider-mejora', 
        modulo: 'Control Interno - Planes de Mejoramiento', 
        categoria: 'Control Interno',
        acciones: ['leer', 'actualizar', 'exportar'], 
        descripcion: 'Seguimiento de planes de mejoramiento' 
      },
      { 
        id: 'perm-lider-seg', 
        modulo: 'Control Interno - Seguimiento', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'exportar'], 
        descripcion: 'Seguimiento de compromisos' 
      },
      { 
        id: 'perm-lider-doc', 
        modulo: 'Control Interno - Gestión Documental', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'exportar'], 
        descripcion: 'Gestión de documentos de auditoría' 
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  {
    id: 'rol-auditor-operativo',
    nombre: 'Auditor Operativo',
    descripcion: 'Ejecuta actividades de auditoría, registra evidencias y documenta hallazgos',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 12,
    color: '#10B981',
    icono: '🔍',
    categoriaRol: 'Control Interno',
    permisos: [
      { 
        id: 'perm-oper-dash', 
        modulo: 'Dashboard Ejecutivo', 
        categoria: 'General',
        acciones: ['leer'], 
        descripcion: 'Visualización básica de dashboard' 
      },
      { 
        id: 'perm-oper-programa', 
        modulo: 'Control Interno - Programa Anual', 
        categoria: 'Control Interno',
        acciones: ['leer'], 
        descripcion: 'Consulta de auditorías asignadas' 
      },
      { 
        id: 'perm-oper-audit', 
        modulo: 'Control Interno - Auditorías', 
        categoria: 'Control Interno',
        acciones: ['leer', 'actualizar', 'exportar'], 
        descripcion: 'Ejecución de auditorías asignadas' 
      },
      { 
        id: 'perm-oper-hallazgos', 
        modulo: 'Control Interno - Hallazgos', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar'], 
        descripcion: 'Registro de hallazgos' 
      },
      { 
        id: 'perm-oper-seg', 
        modulo: 'Control Interno - Seguimiento', 
        categoria: 'Control Interno',
        acciones: ['leer', 'actualizar'], 
        descripcion: 'Actualización de seguimientos' 
      },
      { 
        id: 'perm-oper-doc', 
        modulo: 'Control Interno - Gestión Documental', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar'], 
        descripcion: 'Carga de documentos y evidencias' 
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  {
    id: 'rol-area-auditada',
    nombre: 'Área Auditada',
    descripcion: 'Personal de áreas auditadas que responde a hallazgos y gestiona planes de mejoramiento',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 45,
    color: '#F59E0B',
    icono: '📝',
    categoriaRol: 'Control Interno',
    permisos: [
      { 
        id: 'perm-area-programa', 
        modulo: 'Control Interno - Programa Anual', 
        categoria: 'Control Interno',
        acciones: ['leer'], 
        descripcion: 'Consulta de auditorías programadas' 
      },
      { 
        id: 'perm-area-audit', 
        modulo: 'Control Interno - Auditorías', 
        categoria: 'Control Interno',
        acciones: ['leer'], 
        descripcion: 'Consulta de auditorías a su área' 
      },
      { 
        id: 'perm-area-hallazgos', 
        modulo: 'Control Interno - Hallazgos', 
        categoria: 'Control Interno',
        acciones: ['leer', 'actualizar'], 
        descripcion: 'Consulta y respuesta a hallazgos' 
      },
      { 
        id: 'perm-area-mejora', 
        modulo: 'Control Interno - Planes de Mejoramiento', 
        categoria: 'Control Interno',
        acciones: ['crear', 'leer', 'actualizar', 'exportar'], 
        descripcion: 'Gestión de planes de mejoramiento' 
      },
      { 
        id: 'perm-area-seg', 
        modulo: 'Control Interno - Seguimiento', 
        categoria: 'Control Interno',
        acciones: ['leer', 'actualizar'], 
        descripcion: 'Actualización de compromisos' 
      },
      { 
        id: 'perm-area-doc', 
        modulo: 'Control Interno - Gestión Documental', 
        categoria: 'Control Interno',
        acciones: ['leer', 'actualizar'], 
        descripcion: 'Consulta y carga de documentos' 
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  // ━━━━━━━━━━━ ROLES ACADÉMICOS ━━━━━━━━━━━
  
  {
    id: 'rol-estudiante',
    nombre: 'Estudiante',
    descripcion: 'Acceso limitado activo de la institución',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 1247,
    color: '#10B981',
    icono: '🎓',
    categoriaRol: 'Académica',
    permisos: [
      { 
        id: 'perm-est-cert', 
        modulo: 'Certificados Académicos', 
        categoria: 'Académica',
        acciones: ['leer', 'exportar'], 
        descripcion: 'Consulta de certificados' 
      },
      { 
        id: 'perm-est-carpeta', 
        modulo: 'Carpeta Digital', 
        categoria: 'Comunidad',
        acciones: ['leer'], 
        descripcion: 'Acceso a carpeta personal' 
      },
      { 
        id: 'perm-est-comunidad', 
        modulo: 'Comunidad - Publicaciones', 
        categoria: 'Comunidad',
        acciones: ['leer'], 
        descripcion: 'Visualización de publicaciones' 
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  {
    id: 'rol-docente',
    nombre: 'Docente',
    descripcion: 'Acceso profesores con permisos de gestión académica',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 89,
    color: '#8B5CF6',
    icono: '👨‍🏫',
    categoriaRol: 'Académica',
    permisos: [
      { 
        id: 'perm-doc-prog', 
        modulo: 'Programas Académicos', 
        categoria: 'Académica',
        acciones: ['leer'], 
        descripcion: 'Consulta de programas' 
      },
      { 
        id: 'perm-doc-cert', 
        modulo: 'Certificados Académicos', 
        categoria: 'Académica',
        acciones: ['leer', 'exportar'], 
        descripcion: 'Consulta de certificados' 
      },
      { 
        id: 'perm-doc-comunidad', 
        modulo: 'Comunidad - Publicaciones', 
        categoria: 'Comunidad',
        acciones: ['crear', 'leer', 'actualizar'], 
        descripcion: 'Gestión de publicaciones' 
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  },

  {
    id: 'rol-administrativo',
    nombre: 'Administrativo',
    descripcion: 'Personal administrativo con permisos de gestión operativa',
    tipo: 'Sistema',
    estado: 'Activo',
    usuariosAsignados: 45,
    color: '#F59E0B',
    icono: '💼',
    categoriaRol: 'General',
    permisos: [
      { 
        id: 'perm-admin-personas', 
        modulo: 'Gestión de Personas', 
        categoria: 'General',
        acciones: ['leer', 'actualizar'], 
        descripcion: 'Gestión de información de personal' 
      },
      { 
        id: 'perm-admin-cert-lab', 
        modulo: 'Certificados Laborales', 
        categoria: 'Comunidad',
        acciones: ['crear', 'leer', 'exportar'], 
        descripcion: 'Emisión de certificados laborales' 
      }
    ],
    creadoPor: 'Sistema',
    fechaCreacion: '2025-01-01'
  }
];

// ============ FUNCIONES DE SINCRONIZACIÓN ============

/**
 * Obtener todos los roles del sistema
 */
export function obtenerRoles(): Rol[] {
  return ROLES_SISTEMA;
}

/**
 * Obtener roles por categoría
 */
export function obtenerRolesPorCategoria(categoria: CategoriaModulo): Rol[] {
  return ROLES_SISTEMA.filter(rol => rol.categoriaRol === categoria);
}

/**
 * Obtener un rol por ID
 */
export function obtenerRolPorId(id: string): Rol | undefined {
  return ROLES_SISTEMA.find(rol => rol.id === id);
}

/**
 * Obtener permisos de un rol específico para un módulo
 */
export function obtenerPermisosRolModulo(rolId: string, modulo: string): Permiso | undefined {
  const rol = obtenerRolPorId(rolId);
  return rol?.permisos.find(p => p.modulo === modulo);
}

/**
 * Verificar si un rol tiene un permiso específico
 */
export function tienePermiso(
  rolId: string, 
  modulo: string, 
  accion: PermisoAccion
): boolean {
  const permiso = obtenerPermisosRolModulo(rolId, modulo);
  return permiso?.acciones.includes(accion) || false;
}

/**
 * Obtener todos los módulos del sistema
 */
export function obtenerModulos(): typeof MODULOS_SISTEMA {
  return MODULOS_SISTEMA;
}

/**
 * Obtener módulos por categoría
 */
export function obtenerModulosPorCategoria(categoria: CategoriaModulo) {
  return MODULOS_SISTEMA.filter(m => m.categoria === categoria);
}

/**
 * Estadísticas de roles
 */
export function obtenerEstadisticasRoles() {
  return {
    totalRoles: ROLES_SISTEMA.length,
    rolesActivos: ROLES_SISTEMA.filter(r => r.estado === 'Activo').length,
    rolesInactivos: ROLES_SISTEMA.filter(r => r.estado === 'Inactivo').length,
    usuariosConRol: ROLES_SISTEMA.reduce((sum, r) => sum + r.usuariosAsignados, 0),
    rolesPorCategoria: {
      'General': ROLES_SISTEMA.filter(r => r.categoriaRol === 'General').length,
      'Control Interno': ROLES_SISTEMA.filter(r => r.categoriaRol === 'Control Interno').length,
      'Académica': ROLES_SISTEMA.filter(r => r.categoriaRol === 'Académica').length,
      'Control Disciplinario': ROLES_SISTEMA.filter(r => r.categoriaRol === 'Control Disciplinario').length,
      'Gestión Legal': ROLES_SISTEMA.filter(r => r.categoriaRol === 'Gestión Legal').length
    }
  };
}
