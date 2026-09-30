/**
 * TIPOS DE INTEGRACIÓN: MÓDULO PERSONAS ↔ SISTEMA PTA
 * 
 * Define los tipos compartidos para la integración entre el módulo de
 * gestión de personas y el sistema de Plan de Trabajo Académico (PTA).
 * 
 * Versión: 1.0.0
 * Fecha: 2026-01-03
 */

import type { UserWithSedes } from '../data/mockUsersWithSedes';

// ============================================================================
// TIPOS BASE DE DOCENTE PARA PTA
// ============================================================================

/**
 * Información del docente para el sistema PTA
 * Extraída del módulo de Personas
 */
export interface DocentePTA {
  /** ID único de la persona en el módulo de Personas */
  personId: string;
  
  /** ID del usuario (puede ser igual a personId) */
  userId: string;
  
  /** Cédula o documento de identidad */
  documentNumber: string;
  
  /** Tipo de documento */
  documentType: string;
  
  /** Nombre completo del docente */
  nombreCompleto: string;
  
  /** Email institucional */
  email: string;
  
  /** Teléfono de contacto */
  telefono?: string;
  
  /** Perfil académico del docente */
  perfilAcademico: 'Especialización' | 'Maestría' | 'Doctorado';
  
  /** Categoría del docente en el escalafón */
  categoria: 'Auxiliar' | 'Asistente' | 'Asociado' | 'Titular';
  
  /** Sede principal de vinculación */
  sedeVinculacion: string;
  
  /** Código de la sede */
  codigoSede: string;
  
  /** Tipo de vinculación del docente */
  tipoVinculacion: 'Carrera1' | 'Carrera2' | 'Periodo Prueba' | 'Ocasional' | 'Visitante' | 'Especial';
  
  /** Tipo de dedicación */
  tipoDedicacion: 'TC' | 'MT'; // Tiempo Completo o Medio Tiempo
  
  /** Núcleo temático al que pertenece */
  nucleoTematico: string;
  
  /** Horas programables según su vinculación */
  horasProgramables: number;
  
  /** Estado del docente */
  estado: 'activo' | 'inactivo' | 'licencia' | 'comision';
  
  /** Territorial al que pertenece */
  territorial?: string;
  
  /** ID de la territorial */
  territorialId?: string;
  
  /** Todas las sedes a las que tiene acceso */
  sedes: Array<{
    id: string;
    codigo: string;
    nombre: string;
    nivel: 'sede-central' | 'territorial' | 'cetap';
    esPrincipal: boolean;
  }>;
}

// ============================================================================
// TIPOS DE SINCRONIZACIÓN
// ============================================================================

/**
 * Resultado de la sincronización entre Personas y PTA
 */
export interface ResultadoSincronizacion {
  exito: boolean;
  mensaje: string;
  docenteSincronizado?: DocentePTA;
  errores?: string[];
}

/**
 * Parámetros de búsqueda de docente
 */
export interface BusquedaDocente {
  personId?: string;
  userId?: string;
  email?: string;
  documentNumber?: string;
}

// ============================================================================
// TIPOS DE APROBACIÓN Y JERARQUÍA
// ============================================================================

/**
 * Niveles de aprobación del PTA según jerarquía de Personas
 */
export type NivelAprobacion = 
  | 'coordinador-nucleo'      // Coordinador del núcleo temático
  | 'director-territorial'     // Director de la territorial
  | 'subdirector-academico';   // Subdirección Académica Nacional

/**
 * Aprobador en la jerarquía
 */
export interface AprobadorPTA {
  personId: string;
  userId: string;
  nombreCompleto: string;
  email: string;
  nivel: NivelAprobacion;
  rol: string;
  sedeId?: string;
  territorialId?: string;
}

/**
 * Ruta de aprobación calculada según jerarquía de Personas
 */
export interface RutaAprobacion {
  docentePersonId: string;
  niveles: Array<{
    orden: number;
    nivel: NivelAprobacion;
    aprobadores: AprobadorPTA[];
    estado: 'pendiente' | 'aprobado' | 'rechazado';
    fechaAprobacion?: string;
    comentarios?: string;
  }>;
}

// ============================================================================
// TIPOS DE SITUACIONES ADMINISTRATIVAS
// ============================================================================

/**
 * Situación administrativa del docente
 * Sincronizada entre Personas y PTA
 */
export interface SituacionAdministrativaIntegrada {
  id: string;
  personId: string;
  docenteId: string;
  tipo: 
    | 'licencia_remunerada'
    | 'licencia_no_remunerada'
    | 'comision_estudios'
    | 'comision_servicios'
    | 'incapacidad_medica'
    | 'permiso_sindical'
    | 'suspension'
    | 'vacaciones'
    | 'año_sabatico'
    | 'otra';
  estado: 'vigente' | 'finalizada' | 'programada';
  fechaInicio: string;
  fechaFin: string;
  porcentajeAfectacion: number; // 0-100
  requiereReemplazo: boolean;
  observaciones?: string;
  documentoSoporte?: string;
  fechaRegistro: string;
  registradoPor: string;
  
  /** Flag que indica si está sincronizada con Personas */
  sincronizadaConPersonas: boolean;
  
  /** Fecha de última sincronización */
  fechaUltimaSincronizacion?: string;
}

// ============================================================================
// TIPOS DE MAPEO Y CONVERSIÓN
// ============================================================================

/**
 * Mapeo de roles de Personas a perfiles del PTA
 */
export const MAPEO_ROLES_PTA: Record<string, string[]> = {
  'DOCENTE': ['docente'],
  'COORD_ACAD': ['coordinador-nucleo'],
  'DIRECTOR_TERRITORIAL': ['director-territorial'],
  'SUBDIRECTOR_ACADEMICO': ['subdirector-academico'],
  'DECANO': ['coordinador-nucleo']
};

/**
 * Mapeo de estados de Personas a estados del PTA
 */
export const MAPEO_ESTADOS: Record<string, 'activo' | 'inactivo' | 'licencia' | 'comision'> = {
  'active': 'activo',
  'blocked': 'inactivo',
  'pending': 'inactivo',
  'license': 'licencia',
  'commission': 'comision'
};

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Verifica si un usuario tiene rol de docente
 */
export function esDocente(usuario: UserWithSedes): boolean {
  return usuario.roles.some(rol => 
    rol.code === 'DOCENTE' || 
    rol.name.toLowerCase().includes('docente')
  );
}

/**
 * Verifica si un usuario puede aprobar PTAs
 */
export function puedeAprobarPTA(usuario: UserWithSedes): boolean {
  const rolesAprobadores = ['COORD_ACAD', 'DIRECTOR_TERRITORIAL', 'SUBDIRECTOR_ACADEMICO', 'DECANO'];
  return usuario.roles.some(rol => rolesAprobadores.includes(rol.code));
}

/**
 * Obtiene el nivel de aprobación de un usuario
 */
export function obtenerNivelAprobacion(usuario: UserWithSedes): NivelAprobacion | null {
  for (const rol of usuario.roles) {
    if (rol.code === 'COORD_ACAD' || rol.code === 'DECANO') {
      return 'coordinador-nucleo';
    }
    if (rol.code === 'DIRECTOR_TERRITORIAL') {
      return 'director-territorial';
    }
    if (rol.code === 'SUBDIRECTOR_ACADEMICO') {
      return 'subdirector-academico';
    }
  }
  return null;
}

/**
 * Extrae el nombre completo de un usuario
 */
export function obtenerNombreCompleto(usuario: UserWithSedes): string {
  return `${usuario.firstName} ${usuario.lastName}`;
}

/**
 * Obtiene la sede principal del usuario
 */
export function obtenerSedePrincipal(usuario: UserWithSedes) {
  return usuario.sedes.find(sede => sede.esPrincipal) || usuario.sedes[0];
}

/**
 * Calcula las horas programables según vinculación y dedicación
 */
export function calcularHorasProgramables(
  tipoVinculacion: DocentePTA['tipoVinculacion'],
  tipoDedicacion: DocentePTA['tipoDedicacion'],
  horasSistemaPorDefecto: number = 800
): number {
  // Tiempo Completo: 800 horas (o lo que defina el parámetro del sistema)
  // Medio Tiempo: 400 horas (50% del TC)
  const horasBase = horasSistemaPorDefecto;
  
  if (tipoDedicacion === 'MT') {
    return horasBase / 2;
  }
  
  return horasBase;
}

// ============================================================================
// TIPOS DE NOTIFICACIÓN
// ============================================================================

/**
 * Notificación para enviar a usuarios de Personas
 */
export interface NotificacionPersonasPTA {
  destinatarioPersonId: string;
  destinatarioEmail: string;
  asunto: string;
  mensaje: string;
  tipo: 'info' | 'warning' | 'error' | 'success';
  categoria: 'pta' | 'aprobacion' | 'situacion_administrativa' | 'alerta';
  enlace?: string;
  datos?: Record<string, any>;
  fechaEnvio: string;
}

// ============================================================================
// TIPOS DE AUDITORIA
// ============================================================================

/**
 * Registro de auditoría para cambios entre Personas y PTA
 */
export interface AuditoriaIntegracion {
  id: string;
  fecha: string;
  operacion: 'sincronizar' | 'crear_pta' | 'actualizar_pta' | 'aprobar_pta' | 'rechazar_pta';
  personId: string;
  usuarioQueEjecuta: string;
  detalles: string;
  datosAnteriores?: Record<string, any>;
  datosNuevos?: Record<string, any>;
  resultado: 'exitoso' | 'fallido';
  mensajeError?: string;
}
