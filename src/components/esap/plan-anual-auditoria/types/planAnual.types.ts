/**
 * ============================================
 * TYPES OFICIALES - PLAN ANUAL DE AUDITORÍA
 * ============================================
 * 
 * Interfaces y tipos oficiales para el PAI
 * Basado en formato EMFO001 PAI 2025 V.6 - ESAP
 * Cumplimiento: Decreto 648/2017
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

import type { ActividadOficial, RolOficial } from '../constants/rolesDecreto648Oficial';

/**
 * ============================================
 * ESTADOS DEL PAI
 * ============================================
 */
export type EstadoPAI = 
  | 'Borrador'           // En construcción, no aprobado
  | 'En Revisión'        // Enviado para revisión técnica
  | 'Observado'          // Tiene observaciones que corregir
  | 'Aprobado'           // Aprobado formalmente
  | 'En Ejecución'       // Vigente y en ejecución
  | 'Modificado'         // Modificado durante la vigencia
  | 'Suspendido'         // Suspendido temporalmente
  | 'Cerrado';           // Cerrado al finalizar vigencia

export interface HistorialEstado {
  estado: EstadoPAI;
  fecha: string;
  responsable: string;
  observaciones?: string;
}

/**
 * ============================================
 * PERSONAS Y RESPONSABLES
 * ============================================
 */
export interface PersonaOCI {
  id: string;
  nombreCompleto: string;
  cargo: string;
  email: string;
  telefono?: string;
  firma?: string;              // Imagen base64 de la firma
  activo: boolean;
}

export interface JefeOCI extends PersonaOCI {
  fechaNombramiento: string;
  resolucionNombramiento: string;
  perfilProfesional: string;
}

/**
 * ============================================
 * DATOS GENERALES DEL PAI
 * ============================================
 */
export interface DatosGeneralesPAI {
  // Identificación
  vigencia: number;                     // Año fiscal (2026)
  version: number;                      // Versión del plan (1, 2, 3...)
  codigoPlan: string;                   // PAI-2026-V1
  
  // Institución
  nombreInstitucion: string;            // ESAP
  nit: string;                          // 899.999.061-6
  sector: string;                       // Educación Superior
  naturalezaJuridica: string;           // Establecimiento Público
  
  // Jefe OCI
  jefeOCI: JefeOCI;
  
  // Fechas
  fechaElaboracion: string;             // Fecha de creación
  fechaRevision?: string;               // Fecha revisión técnica
  fechaAprobacion?: string;             // Fecha aprobación formal
  fechaPublicacion?: string;            // Fecha publicación web
  
  // Objetivos
  objetivoGeneral: string;
  objetivosEspecificos: string[];
  alcance: string;
  
  // Marco estratégico
  misionESAP: string;
  visionESAP: string;
  objetivosEstrategicosInstitucionales: string[];
}

/**
 * ============================================
 * ACTIVIDAD DEL PAI (Extendida)
 * ============================================
 */
export interface ActividadPAI extends ActividadOficial {
  // Datos adicionales para seguimiento
  estadoEjecucion: EstadoActividadPAI;
  porcentajeAvance: number;             // 0-100
  fechaInicioReal?: string;             // Fecha real de inicio
  fechaFinReal?: string;                // Fecha real de fin
  horasEstimadas: number;
  horasEjecutadas: number;
  
  // Configuración de autorización - CONFIGURADO EN CREACIÓN DEL PLAN
  requiereAutorizacionJefeOCIG: boolean;  // Si requiere aprobación del Jefe OCIG para completarla
  
  // Evidencias
  evidencias: EvidenciaActividad[];
  
  // Seguimientos realizados
  seguimientosRealizados: SeguimientoRealizado[];
  
  // Observaciones
  observaciones: string;
  riesgos: string;
  dificultades: string;
}

export type EstadoActividadPAI = 
  | 'No Iniciada'
  | 'En Ejecución'
  | 'En Pausa'
  | 'Completada'
  | 'Retrasada'
  | 'Cancelada';

export interface EvidenciaActividad {
  id: string;
  tipo: 'Informe' | 'Acta' | 'Presentación' | 'Correo' | 'Documento' | 'Foto' | 'Otro';
  nombre: string;
  descripcion: string;
  url?: string;
  fechaCarga: string;
  responsable: string;
}

export interface SeguimientoRealizado {
  id: string;
  fecha: string;
  porcentajeAvance: number;
  descripcion: string;
  responsable: string;
  cumplimientoMeta: boolean;
  observaciones: string;
}

/**
 * ============================================
 * ROL DEL PAI (Extendido)
 * ============================================
 */
export interface RolPAI extends RolOficial {
  estadoGeneral: EstadoRolPAI;
  porcentajeAvanceGeneral: number;
  actividadesExtendidas: ActividadPAI[];
  totalHorasEstimadas: number;
  totalHorasEjecutadas: number;
  responsablesAdicionales: PersonaOCI[];
}

export type EstadoRolPAI = 
  | 'No Iniciado'
  | 'En Progreso'
  | 'Completado'
  | 'Con Retrasos';

/**
 * ============================================
 * VALIDACIONES DECRETO 648
 * ============================================
 */
export interface ValidacionDecreto648 {
  cumpleDecretoCompleto: boolean;
  puntajeTotal: number;                 // 0-100
  
  // Validaciones específicas
  tieneCincoRoles: boolean;
  todosRolesTienenActividades: boolean;
  actividadesCumplenMinimo: boolean;
  fechasEstanCompletas: boolean;
  responsablesAsignados: boolean;
  seguimientosDefinidos: boolean;
  
  // Errores y advertencias
  errores: ValidacionError[];
  advertencias: ValidacionAdvertencia[];
  recomendaciones: string[];
}

export interface ValidacionError {
  codigo: string;
  mensaje: string;
  nivel: 'Crítico' | 'Alto' | 'Medio';
  campo: string;
  solucion: string;
}

export interface ValidacionAdvertencia {
  codigo: string;
  mensaje: string;
  nivel: 'Bajo' | 'Informativo';
  campo: string;
  recomendacion: string;
}

/**
 * ============================================
 * ESTADÍSTICAS DEL PAI
 * ============================================
 */
export interface EstadisticasPAI {
  // Roles
  totalRoles: number;
  rolesCompletados: number;
  rolesEnProgreso: number;
  
  // Actividades
  totalActividades: number;
  actividadesCompletadas: number;
  actividadesEnEjecucion: number;
  actividadesNoIniciadas: number;
  actividadesRetrasadas: number;
  
  // Horas
  totalHorasEstimadas: number;
  totalHorasEjecutadas: number;
  porcentajeHorasUtilizadas: number;
  
  // Avance general
  porcentajeAvanceGeneral: number;
  porcentajeCumplimientoDecretoDecreto648: number;
  
  // Por rol
  estadisticasPorRol: EstadisticaRol[];
  
  // Tendencias
  actividadesCompletadasPorMes: { mes: string; cantidad: number }[];
  distribucionEstados: { estado: EstadoActividadPAI; cantidad: number }[];
}

export interface EstadisticaRol {
  numeroRol: number;
  nombreRol: string;
  totalActividades: number;
  actividadesCompletadas: number;
  porcentajeAvance: number;
  horasEstimadas: number;
  horasEjecutadas: number;
}

/**
 * ============================================
 * MODIFICACIONES AL PAI
 * ============================================
 */
export interface ModificacionPAI {
  id: string;
  fecha: string;
  version: number;
  tipo: TipoModificacion;
  justificacion: string;
  descripcionCambios: string;
  responsable: PersonaOCI;
  aprobadoPor: PersonaOCI;
  documentoSoporte?: string;
  
  // Cambios específicos
  cambiosRealizados: CambioPAI[];
}

export type TipoModificacion = 
  | 'Ajuste Cronograma'
  | 'Cambio Responsable'
  | 'Nueva Actividad'
  | 'Eliminación Actividad'
  | 'Modificación Recursos'
  | 'Ajuste Alcance'
  | 'Otro';

export interface CambioPAI {
  campo: string;
  valorAnterior: any;
  valorNuevo: any;
  razon: string;
}

/**
 * ============================================
 * PLAN ANUAL DE AUDITORÍA (PRINCIPAL)
 * ============================================
 */
export interface PlanAnualAuditoria {
  // Identificación
  id: string;
  codigo: string;                       // PAI-2026-V1
  
  // Datos generales
  datosGenerales: DatosGeneralesPAI;
  
  // Estado
  estado: EstadoPAI;
  historialEstados: HistorialEstado[];
  
  // DECRETO 648/2017 - Roles y Actividades
  rolesDecreto648: RolPAI[];
  
  // Validaciones
  validacionDecreto648: ValidacionDecreto648;
  
  // Estadísticas
  estadisticas: EstadisticasPAI;
  
  // Modificaciones
  modificaciones: ModificacionPAI[];
  versionAnterior?: string;             // ID del PAI anterior (si es modificación)
  
  // Auditoría del documento
  creadoPor: string;
  fechaCreacion: string;
  modificadoPor?: string;
  fechaModificacion?: string;
  
  // Metadata
  metadata: MetadataPAI;
}

export interface MetadataPAI {
  formatoOficial: string;               // "EMFO001 PAI 2025 V.6"
  versionFormato: string;               // "6.0"
  fechaUltimaExportacion?: string;
  exportadoPor?: string;
  urlPublicacion?: string;
  publicadoEnWeb: boolean;
  
  // Cumplimiento normativo
  decretosCumplidos: string[];          // ["Decreto 648/2017", "Ley 87/1993", ...]
  guiasAplicadas: string[];             // ["Guía rol OCI DAFP", ...]
}

/**
 * ============================================
 * FILTROS Y BÚSQUEDA
 * ============================================
 */
export interface FiltrosPAI {
  vigencias?: number[];
  estados?: EstadoPAI[];
  jefeOCI?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
}

export interface ResultadoBusquedaPAI {
  planes: PlanAnualAuditoria[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/**
 * ============================================
 * EXPORTACIÓN
 * ============================================
 */
export interface OpcionesExportacionPAI {
  formato: FormatoExportacion;
  incluirPortada: boolean;
  incluirIndice: boolean;
  incluirAnexos: boolean;
  incluirEvidencias: boolean;
  incluirFirmas: boolean;
  marcaDeAgua?: string;
  
  // Específico para Excel EMFO001
  formatoOficial?: 'EMFO001';
  versionFormato?: string;
}

export type FormatoExportacion = 
  | 'Excel-EMFO001'                     // Formato oficial
  | 'PDF-Corporativo'
  | 'Word-Editable'
  | 'JSON';

/**
 * ============================================
 * REPORTES Y DASHBOARDS
 * ============================================
 */
export interface ReportePAI {
  id: string;
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  fechaGeneracion: string;
  generadoPor: string;
  periodo: {
    inicio: string;
    fin: string;
  };
  datos: any;                           // Datos específicos del reporte
}

export type TipoReporte = 
  | 'Cumplimiento-Decreto648'
  | 'Avance-General'
  | 'Ejecución-Por-Rol'
  | 'Horas-Ejecutadas'
  | 'Actividades-Retrasadas'
  | 'Seguimientos-Realizados'
  | 'Modificaciones-Realizadas';

/**
 * ============================================
 * HELPERS Y UTILIDADES
 * ============================================
 */

// Helper para crear PAI nuevo
export interface CrearPAIInput {
  vigencia: number;
  jefeOCI: JefeOCI;
  objetivoGeneral: string;
  objetivosEspecificos: string[];
}

// Helper para actualizar actividad
export interface ActualizarActividadInput {
  actividadId: number;
  estadoEjecucion?: EstadoActividadPAI;
  porcentajeAvance?: number;
  horasEjecutadas?: number;
  observaciones?: string;
}

// Helper para agregar seguimiento
export interface AgregarSeguimientoInput {
  actividadId: number;
  fecha: string;
  porcentajeAvance: number;
  descripcion: string;
  cumplimientoMeta: boolean;
  observaciones: string;
}

// Helper para modificar PAI
export interface ModificarPAIInput {
  tipo: TipoModificacion;
  justificacion: string;
  descripcionCambios: string;
  cambios: CambioPAI[];
  documentoSoporte?: string;
}

/**
 * ============================================
 * CONSTANTES DE VALIDACIÓN
 * ============================================
 */
export const VALIDACION_PAI = {
  ROLES_OBLIGATORIOS: 5,
  ACTIVIDADES_MINIMAS: 22,
  SEGUIMIENTOS_MINIMOS_POR_ACTIVIDAD: 1,
  PORCENTAJE_MINIMO_APROBACION: 80,
  HORAS_MINIMAS_POR_ACTIVIDAD: 1,
} as const;

/**
 * ============================================
 * GUARDS (Type Guards)
 * ============================================
 */
export function isPAIAprobado(pai: PlanAnualAuditoria): boolean {
  return pai.estado === 'Aprobado' || pai.estado === 'En Ejecución';
}

export function isPAIModificable(pai: PlanAnualAuditoria): boolean {
  return pai.estado === 'Borrador' || 
         pai.estado === 'En Revisión' || 
         pai.estado === 'Observado';
}

export function isPAIEnEjecucion(pai: PlanAnualAuditoria): boolean {
  return pai.estado === 'En Ejecución';
}

export function isActividadCompletada(actividad: ActividadPAI): boolean {
  return actividad.estadoEjecucion === 'Completada' && 
         actividad.porcentajeAvance === 100;
}

export function isActividadRetrasada(actividad: ActividadPAI): boolean {
  if (actividad.estadoEjecucion === 'Completada') return false;
  
  const hoy = new Date();
  const fechaFin = new Date(actividad.fechaFin);
  
  return hoy > fechaFin;
}