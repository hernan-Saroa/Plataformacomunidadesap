/**
 * TIPOS - ESTRUCTURA ORGANIZACIONAL ESAP
 * Sistema de gestión de estructura territorial jerárquica
 * Impacta todos los módulos del sistema
 */

// ============================================================================
// TIPOS BASE
// ============================================================================

/**
 * Nivel jerárquico en la estructura organizacional
 * ESTRUCTURA OFICIAL ESAP:
 * - Nacional (1 única sede central)
 * - Territorial (16 territoriales)
 * - CETAP (293 Centros Territoriales de Administración Pública)
 * 
 * NOTA: 'regional' y 'sede' se mantienen por compatibilidad pero son deprecated
 */
export type NivelEstructura = 
  | 'nacional'           // Sede Nacional (única)
  | 'territorial'        // Dirección Territorial (16)
  | 'cetap'              // CETAP - Centro Territorial de Administración Pública (293)
  | 'regional'           // @deprecated - Usar 'territorial' o 'cetap'
  | 'sede';              // @deprecated - Usar 'cetap'

/**
 * Estado de una unidad organizacional
 */
export type EstadoEstructura = 
  | 'activa' 
  | 'inactiva' 
  | 'en_configuracion' 
  | 'cerrada_temporal';

// ============================================================================
// INTERFACES PRINCIPALES
// ============================================================================

/**
 * Unidad de Estructura Organizacional
 * Representa cualquier nivel jerárquico (Nacional, Territorial, Regional, Punto)
 */
export interface UnidadOrganizacional {
  id: string;
  codigo: string;                    // Código único (ej: "SEDE-NAL", "DIR-BOG", "CRE-MED")
  nombre: string;                    // Nombre oficial
  nombreCorto?: string;              // Nombre abreviado
  nivel: NivelEstructura;
  
  // Jerarquía
  padreId: string | null;            // ID de la unidad padre (null para Nacional)
  ruta: string[];                    // Array de IDs desde Nacional hasta esta unidad
  rutaNombres: string[];             // Array de nombres de la ruta
  
  // Ubicación geográfica
  departamento?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  
  // Capacidad y límites
  capacidadEstudiantes?: number;
  capacidadDocentes?: number;
  
  // Estado y configuración
  estado: EstadoEstructura;
  fechaApertura?: string;
  fechaCierre?: string;
  
  // Configuración de acceso
  permiteInscripciones: boolean;
  permiteMatriculas: boolean;
  visiblePortal: boolean;
  
  // Metadata
  descripcion?: string;
  observaciones?: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

/**
 * DTO para crear unidad organizacional
 */
export interface CreateUnidadOrganizacionalDTO {
  codigo: string;
  nombre: string;
  nombreCorto?: string;
  nivel: NivelEstructura;
  padreId: string | null;
  
  departamento?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  
  capacidadEstudiantes?: number;
  capacidadDocentes?: number;
  
  estado?: EstadoEstructura;
  fechaApertura?: string;
  
  permiteInscripciones?: boolean;
  permiteMatriculas?: boolean;
  visiblePortal?: boolean;
  
  descripcion?: string;
  observaciones?: string;
  logo?: string;
}

/**
 * DTO para actualizar unidad organizacional
 */
export interface UpdateUnidadOrganizacionalDTO {
  nombre?: string;
  nombreCorto?: string;
  
  departamento?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  
  capacidadEstudiantes?: number;
  capacidadDocentes?: number;
  
  estado?: EstadoEstructura;
  fechaApertura?: string;
  fechaCierre?: string;
  
  permiteInscripciones?: boolean;
  permiteMatriculas?: boolean;
  visiblePortal?: boolean;
  
  descripcion?: string;
  observaciones?: string;
  logo?: string;
}

// ============================================================================
// ASIGNACIÓN DE USUARIOS A ESTRUCTURA
// ============================================================================

/**
 * Ámbito de acceso del usuario a la estructura
 */
export type AmbitoAcceso = 
  | 'nacional'          // Puede ver toda la estructura
  | 'territorial'       // Puede ver su territorial y subordinados
  | 'regional'          // Puede ver su regional y subordinados
  | 'local';            // Solo puede ver su unidad específica

/**
 * Asignación de usuario a estructura organizacional
 * Un usuario puede tener múltiples asignaciones (múltiples roles en diferentes sedes)
 */
export interface UsuarioEstructura {
  id: string;
  usuarioId: string;
  unidadId: string;
  
  // Rol específico en esta unidad
  rolId: string;
  rolNombre?: string;
  
  // Ámbito de acceso
  ambitoAcceso: AmbitoAcceso;
  
  // Configuración
  esPrincipal: boolean;              // Si es la asignación principal del usuario
  estado: 'activa' | 'inactiva';
  
  // Fechas de vigencia
  fechaInicio: string;
  fechaFin?: string;
  
  // Metadata
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

/**
 * DTO para asignar usuario a estructura
 */
export interface AsignarUsuarioEstructuraDTO {
  usuarioId: string;
  unidadId: string;
  rolId: string;
  ambitoAcceso: AmbitoAcceso;
  esPrincipal?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  observaciones?: string;
}

/**
 * Usuario con información de estructura
 * Extensión del User con datos de estructura organizacional
 */
export interface UsuarioConEstructura {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  
  // Asignación principal de estructura
  unidadPrincipal?: {
    id: string;
    codigo: string;
    nombre: string;
    nivel: NivelEstructura;
    ruta: string[];
    rutaNombres: string[];
  };
  
  // Todas las asignaciones
  asignacionesEstructura: UsuarioEstructura[];
  
  // Ámbito de acceso más amplio que tiene el usuario
  ambitoAccesoMaximo: AmbitoAcceso;
}

// ============================================================================
// ESTADÍSTICAS Y REPORTES
// ============================================================================

/**
 * Estadísticas de una unidad organizacional
 */
export interface EstadisticasUnidad {
  unidadId: string;
  unidadNombre: string;
  nivel: NivelEstructura;
  
  // Usuarios
  totalUsuarios: number;
  usuariosActivos: number;
  usuariosPorRol: Record<string, number>;
  
  // Estudiantes
  totalEstudiantes?: number;
  estudiantesActivos?: number;
  capacidadEstudiantes?: number;
  porcentajeOcupacion?: number;
  
  // Docentes
  totalDocentes?: number;
  docentesActivos?: number;
  capacidadDocentes?: number;
  
  // Estructura subordinada
  totalSubordinados: number;
  subordinadosPorNivel: Record<NivelEstructura, number>;
  
  // Actividad
  ultimaActividad?: string;
  actividadReciente?: {
    mes: number;
    usuarios: number;
    estudiantes: number;
  };
}

/**
 * Vista de árbol de estructura organizacional
 */
export interface ArbolEstructura {
  unidad: UnidadOrganizacional;
  hijos: ArbolEstructura[];
  estadisticas?: EstadisticasUnidad;
  nivel: number;                      // Nivel de profundidad en el árbol (0 = raíz)
}

/**
 * Filtro por estructura organizacional
 * Para uso en todos los módulos del sistema
 */
export interface FiltroEstructura {
  unidadId?: string;                  // Filtrar por unidad específica
  nivel?: NivelEstructura;            // Filtrar por nivel
  incluirSubordinados?: boolean;      // Si se incluyen unidades subordinadas
  estado?: EstadoEstructura;          // Filtrar por estado
  departamento?: string;
  ciudad?: string;
}

/**
 * Respuesta paginada de unidades
 */
export interface UnidadesResponse {
  data: UnidadOrganizacional[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Filtros de búsqueda de unidades
 */
export interface BuscarUnidadesParams {
  busqueda?: string;                  // Búsqueda por código o nombre
  nivel?: NivelEstructura;
  estado?: EstadoEstructura;
  padreId?: string;
  departamento?: string;
  ciudad?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'nombre' | 'codigo' | 'nivel' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// LOGS Y AUDITORÍA
// ============================================================================

/**
 * Acción sobre estructura organizacional
 */
export type AccionEstructura = 
  | 'crear_unidad'
  | 'actualizar_unidad'
  | 'eliminar_unidad'
  | 'activar_unidad'
  | 'desactivar_unidad'
  | 'asignar_usuario'
  | 'reasignar_usuario'
  | 'desasignar_usuario'
  | 'cambiar_jerarquia';

/**
 * Log de auditoría de estructura organizacional
 */
export interface LogEstructura {
  id: string;
  accion: AccionEstructura;
  unidadId?: string;
  unidadNombre?: string;
  usuarioAfectadoId?: string;
  usuarioAfectadoNombre?: string;
  
  cambios?: {
    campo: string;
    valorAnterior: any;
    valorNuevo: any;
  }[];
  
  performedBy: string;
  performedByName: string;
  performedAt: string;
  
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}