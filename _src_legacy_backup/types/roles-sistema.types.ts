/**
 * TIPOS: SISTEMA DE ROLES Y PERMISOS
 * Integrado con la estructura organizacional de ESAP
 * Jerarquía: Nacional > Territorial > CETAP
 */

export type AlcanceRol = 'nacional' | 'territorial' | 'cetap' | 'sin-alcance';

export type CategoriaRol = 
  | 'academico'      // Docentes, Estudiantes, Investigadores
  | 'administrativo' // Personal administrativo
  | 'directivo'      // Directores, Coordinadores
  | 'operativo'      // Soporte, mantenimiento
  | 'sistema';       // Super Admin, Admin de Sistema

export interface RolSistema {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaRol;
  alcance: AlcanceRol;
  
  // Jerarquía y restricciones
  requiereUnidadOrganizacional: boolean;  // Si debe estar asignado a una unidad específica
  puedeAplicarEnMultiplesUnidades: boolean;  // Si puede tener el rol en varias unidades
  
  // Permisos y capacidades
  permisos: string[];  // IDs de permisos
  modulos: string[];   // IDs de módulos a los que tiene acceso
  
  // Metadata
  nivelJerarquico: number;  // 1 = Super Admin, 5 = Usuario básico
  esActivo: boolean;
  fechaCreacion: string;
  creadoPor: string;
}

export interface AsignacionRol {
  id: string;
  usuarioId: string;
  rolId: string;
  
  // Contexto organizacional
  unidadOrganizacionalId?: string;  // Si el rol es territorial/cetap
  alcanceAsignacion: AlcanceRol;
  
  // Vigencia
  fechaInicio: string;
  fechaFin?: string;  // null = indefinido
  esActivo: boolean;
  
  // Metadata
  asignadoPor: string;
  fechaAsignacion: string;
  motivoAsignacion?: string;
  documentoSoporte?: string;
}

export interface PermisoSistema {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  modulo: string;
  categoria: 'lectura' | 'escritura' | 'eliminacion' | 'administracion';
  requiereAprobacion: boolean;
}

// ============================================================================
// CONSTANTES: ROLES PREDEFINIDOS DEL SISTEMA
// ============================================================================

export const ROLES_SISTEMA: RolSistema[] = [
  // ══════════════════════════════════════
  // ROLES DE SISTEMA
  // ══════════════════════════════════════
  {
    id: 'rol-001',
    codigo: 'SUPER_ADMIN',
    nombre: 'Super Administrador',
    descripcion: 'Acceso total al sistema sin restricciones',
    categoria: 'sistema',
    alcance: 'nacional',
    requiereUnidadOrganizacional: false,
    puedeAplicarEnMultiplesUnidades: true,
    permisos: ['*'],  // Todos los permisos
    modulos: ['*'],   // Todos los módulos
    nivelJerarquico: 1,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },
  {
    id: 'rol-002',
    codigo: 'ADMIN_SISTEMA',
    nombre: 'Administrador de Sistema',
    descripcion: 'Administración técnica del sistema',
    categoria: 'sistema',
    alcance: 'nacional',
    requiereUnidadOrganizacional: false,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['system_config', 'user_management', 'audit_view'],
    modulos: ['usuarios', 'roles', 'auditoria', 'configuracion'],
    nivelJerarquico: 2,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },

  // ══════════════════════════════════════
  // ROLES DIRECTIVOS
  // ══════════════════════════════════════
  {
    id: 'rol-003',
    codigo: 'DIRECTOR_NACIONAL',
    nombre: 'Director Nacional',
    descripcion: 'Máxima autoridad académica y administrativa',
    categoria: 'directivo',
    alcance: 'nacional',
    requiereUnidadOrganizacional: true,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['all_modules', 'approve_all', 'strategic_decisions'],
    modulos: ['*'],
    nivelJerarquico: 1,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },
  {
    id: 'rol-004',
    codigo: 'DIRECTOR_TERRITORIAL',
    nombre: 'Director Territorial',
    descripcion: 'Responsable de una territorial específica',
    categoria: 'directivo',
    alcance: 'territorial',
    requiereUnidadOrganizacional: true,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['territorial_management', 'approve_territorial', 'manage_cetaps'],
    modulos: ['dashboard', 'usuarios', 'gestion-profesoral', 'estructura-organizacional'],
    nivelJerarquico: 2,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },
  {
    id: 'rol-005',
    codigo: 'COORDINADOR_CETAP',
    nombre: 'Coordinador CETAP',
    descripcion: 'Responsable de un CETAP específico',
    categoria: 'directivo',
    alcance: 'cetap',
    requiereUnidadOrganizacional: true,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['cetap_management', 'local_approvals', 'student_management'],
    modulos: ['dashboard', 'estudiantes', 'certificados'],
    nivelJerarquico: 3,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },

  // ══════════════════════════════════════
  // ROLES ACADÉMICOS
  // ══════════════════════════════════════
  {
    id: 'rol-006',
    codigo: 'DOCENTE',
    nombre: 'Docente',
    descripcion: 'Profesor de ESAP',
    categoria: 'academico',
    alcance: 'territorial',
    requiereUnidadOrganizacional: true,
    puedeAplicarEnMultiplesUnidades: true,  // Un docente puede enseñar en varias sedes
    permisos: ['view_students', 'grade_management', 'course_content'],
    modulos: ['dashboard', 'gestion-profesoral', 'estudiantes'],
    nivelJerarquico: 4,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },
  {
    id: 'rol-007',
    codigo: 'ESTUDIANTE',
    nombre: 'Estudiante',
    descripcion: 'Estudiante activo de ESAP',
    categoria: 'academico',
    alcance: 'cetap',
    requiereUnidadOrganizacional: true,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['view_own_data', 'request_certificates', 'access_portal'],
    modulos: ['portal-transaccional'],
    nivelJerarquico: 5,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },
  {
    id: 'rol-008',
    codigo: 'GRADUADO',
    nombre: 'Graduado',
    descripcion: 'Egresado de ESAP',
    categoria: 'academico',
    alcance: 'sin-alcance',
    requiereUnidadOrganizacional: false,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['view_own_data', 'request_certificates', 'access_alumni_services'],
    modulos: ['portal-transaccional', 'graduados'],
    nivelJerarquico: 5,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },

  // ══════════════════════════════════════
  // ROLES ADMINISTRATIVOS
  // ══════════════════════════════════════
  {
    id: 'rol-009',
    codigo: 'COORD_ACADEMICO',
    nombre: 'Coordinador Académico',
    descripcion: 'Coordinación de programas académicos',
    categoria: 'administrativo',
    alcance: 'territorial',
    requiereUnidadOrganizacional: true,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['academic_management', 'program_coordination', 'student_tracking'],
    modulos: ['dashboard', 'programas-academicos', 'estudiantes', 'gestion-profesoral'],
    nivelJerarquico: 3,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },
  {
    id: 'rol-010',
    codigo: 'SECRETARIO_ACADEMICO',
    nombre: 'Secretario Académico',
    descripcion: 'Gestión administrativa académica',
    categoria: 'administrativo',
    alcance: 'territorial',
    requiereUnidadOrganizacional: true,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['enrollment_management', 'certificate_issuance', 'record_management'],
    modulos: ['dashboard', 'estudiantes', 'certificados', 'matriculas'],
    nivelJerarquico: 4,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },
  {
    id: 'rol-011',
    codigo: 'COORD_CERTIFICADOS',
    nombre: 'Coordinador de Certificados Laborales',
    descripcion: 'Gestión de certificados laborales',
    categoria: 'administrativo',
    alcance: 'nacional',
    requiereUnidadOrganizacional: false,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['certificate_management', 'approve_certificates', 'template_management'],
    modulos: ['certificados-laborales'],
    nivelJerarquico: 3,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  },
  {
    id: 'rol-012',
    codigo: 'COORD_ARQ_EMPRESARIAL',
    nombre: 'Coordinador de Arquitectura Empresarial',
    descripcion: 'Gestión de arquitectura empresarial',
    categoria: 'administrativo',
    alcance: 'nacional',
    requiereUnidadOrganizacional: false,
    puedeAplicarEnMultiplesUnidades: false,
    permisos: ['architecture_management', 'framework_management', 'compliance_tracking'],
    modulos: ['arquitectura-empresarial'],
    nivelJerarquico: 3,
    esActivo: true,
    fechaCreacion: '2023-01-01',
    creadoPor: 'SISTEMA'
  }
];

// ============================================================================
// UTILIDADES
// ============================================================================

export function getRolPorCodigo(codigo: string): RolSistema | undefined {
  return ROLES_SISTEMA.find(r => r.codigo === codigo);
}

export function getRolesPorCategoria(categoria: CategoriaRol): RolSistema[] {
  return ROLES_SISTEMA.filter(r => r.categoria === categoria);
}

export function getRolesPorAlcance(alcance: AlcanceRol): RolSistema[] {
  return ROLES_SISTEMA.filter(r => r.alcance === alcance);
}

export function rolRequiereUnidad(rolId: string): boolean {
  const rol = ROLES_SISTEMA.find(r => r.id === rolId);
  return rol?.requiereUnidadOrganizacional ?? false;
}
