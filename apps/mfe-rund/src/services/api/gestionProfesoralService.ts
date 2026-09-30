/**
 * Servicio API - Gestión Profesoral
 * 
 * Maneja todas las operaciones del módulo de Gestión Profesoral:
 * - Gestión de Docentes
 * - Planes de Trabajo Académico (PTA)
 * - Asignaciones y Horarios
 * - Evaluación Docente
 * - Calendario Académico
 * - Reportes y Analíticas
 */

import { apiClient } from './apiClient';
import type {
  // Docentes
  Docente,
  DocenteDetalle,
  CreateDocenteRequest,
  UpdateDocenteRequest,
  
  // PTA
  PlanTrabajoAcademico,
  CreatePTARequest,
  UpdatePTARequest,
  PTARevision,
  
  // Asignaciones
  AsignacionDocente,
  CreateAsignacionRequest,
  MatrizAsignaciones,
  
  // Evaluaciones
  EvaluacionDocente,
  CreateEvaluacionRequest,
  ResultadosEvaluacion,
  
  // Calendario
  CalendarioAcademico,
  EventoAcademico,
  CreateEventoRequest,
  
  // Reportes
  ReporteProfesoralParams,
  EstadisticasProfesoral,
  
  // Filtros
  FiltrosProfesoral,
  PaginatedResponse
} from '../../types/gestion-profesoral';

// ============================================================================
// ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  // Docentes
  DOCENTES: {
    BASE: '/gestion-profesoral/docentes',
    BY_ID: (id: string) => `/gestion-profesoral/docentes/${id}`,
    DETALLE: (id: string) => `/gestion-profesoral/docentes/${id}/detalle`,
    HISTORICO: (id: string) => `/gestion-profesoral/docentes/${id}/historico`,
    DISPONIBILIDAD: (id: string) => `/gestion-profesoral/docentes/${id}/disponibilidad`,
    CARGA_ACADEMICA: (id: string) => `/gestion-profesoral/docentes/${id}/carga-academica`,
    DOCUMENTOS: (id: string) => `/gestion-profesoral/docentes/${id}/documentos`,
    BULK_IMPORT: '/gestion-profesoral/docentes/bulk-import',
    EXPORT: '/gestion-profesoral/docentes/export',
    ESTADISTICAS: '/gestion-profesoral/docentes/estadisticas',
  },
  
  // Planes de Trabajo Académico (PTA)
  PTA: {
    BASE: '/gestion-profesoral/pta',
    BY_ID: (id: string) => `/gestion-profesoral/pta/${id}`,
    BY_DOCENTE: (docenteId: string) => `/gestion-profesoral/pta/docente/${docenteId}`,
    BY_PERIODO: (periodoId: string) => `/gestion-profesoral/pta/periodo/${periodoId}`,
    REVISION: (id: string) => `/gestion-profesoral/pta/${id}/revision`,
    APROBAR: (id: string) => `/gestion-profesoral/pta/${id}/aprobar`,
    RECHAZAR: (id: string) => `/gestion-profesoral/pta/${id}/rechazar`,
    SEGUIMIENTO: (id: string) => `/gestion-profesoral/pta/${id}/seguimiento`,
    PLANTILLA: '/gestion-profesoral/pta/plantilla',
  },
  
  // Asignaciones
  ASIGNACIONES: {
    BASE: '/gestion-profesoral/asignaciones',
    BY_ID: (id: string) => `/gestion-profesoral/asignaciones/${id}`,
    BY_DOCENTE: (docenteId: string) => `/gestion-profesoral/asignaciones/docente/${docenteId}`,
    BY_ASIGNATURA: (asignaturaId: string) => `/gestion-profesoral/asignaciones/asignatura/${asignaturaId}`,
    MATRIZ: '/gestion-profesoral/asignaciones/matriz',
    CONFLICTOS: '/gestion-profesoral/asignaciones/conflictos',
    VALIDAR: '/gestion-profesoral/asignaciones/validar',
  },
  
  // Evaluaciones
  EVALUACIONES: {
    BASE: '/gestion-profesoral/evaluaciones',
    BY_ID: (id: string) => `/gestion-profesoral/evaluaciones/${id}`,
    BY_DOCENTE: (docenteId: string) => `/gestion-profesoral/evaluaciones/docente/${docenteId}`,
    BY_PERIODO: (periodoId: string) => `/gestion-profesoral/evaluaciones/periodo/${periodoId}`,
    RESULTADOS: (id: string) => `/gestion-profesoral/evaluaciones/${id}/resultados`,
    CONSOLIDADO: '/gestion-profesoral/evaluaciones/consolidado',
  },
  
  // Calendario Académico
  CALENDARIO: {
    BASE: '/gestion-profesoral/calendario',
    BY_PERIODO: (periodoId: string) => `/gestion-profesoral/calendario/periodo/${periodoId}`,
    EVENTOS: '/gestion-profesoral/calendario/eventos',
    EVENTO_BY_ID: (id: string) => `/gestion-profesoral/calendario/eventos/${id}`,
  },
  
  // Reportes
  REPORTES: {
    CARGA_DOCENTE: '/gestion-profesoral/reportes/carga-docente',
    EVALUACIONES: '/gestion-profesoral/reportes/evaluaciones',
    PTA_CUMPLIMIENTO: '/gestion-profesoral/reportes/pta-cumplimiento',
    CONSOLIDADO: '/gestion-profesoral/reportes/consolidado',
  },
  
  // Dashboard
  DASHBOARD: '/gestion-profesoral/dashboard',
  ESTADISTICAS: '/gestion-profesoral/estadisticas',
};

// ============================================================================
// SERVICIO DE GESTIÓN PROFESORAL
// ============================================================================

class GestionProfesoralService {
  
  // ==========================================================================
  // DOCENTES
  // ==========================================================================
  
  /**
   * Obtiene todos los docentes con filtros
   */
  async getDocentes(params?: FiltrosProfesoral): Promise<PaginatedResponse<Docente>> {
    return apiClient.get<PaginatedResponse<Docente>>(ENDPOINTS.DOCENTES.BASE, params);
  }
  
  /**
   * Obtiene un docente por ID con detalle completo
   */
  async getDocenteById(id: string): Promise<DocenteDetalle> {
    return apiClient.get<DocenteDetalle>(ENDPOINTS.DOCENTES.DETALLE(id));
  }
  
  /**
   * Crea un nuevo docente
   */
  async createDocente(data: CreateDocenteRequest): Promise<Docente> {
    return apiClient.post<Docente>(ENDPOINTS.DOCENTES.BASE, data);
  }
  
  /**
   * Actualiza un docente
   */
  async updateDocente(id: string, data: UpdateDocenteRequest): Promise<Docente> {
    return apiClient.put<Docente>(ENDPOINTS.DOCENTES.BY_ID(id), data);
  }
  
  /**
   * Elimina un docente
   */
  async deleteDocente(id: string): Promise<void> {
    return apiClient.delete(ENDPOINTS.DOCENTES.BY_ID(id));
  }
  
  /**
   * Importación masiva de docentes
   */
  async bulkImportDocentes(archivo: File): Promise<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return apiClient.upload(ENDPOINTS.DOCENTES.BULK_IMPORT, formData);
  }
  
  /**
   * Exportar lista de docentes
   */
  async exportDocentes(params?: FiltrosProfesoral, formato: 'excel' | 'pdf' = 'excel'): Promise<Blob> {
    return apiClient.get<Blob>(ENDPOINTS.DOCENTES.EXPORT, { ...params, formato });
  }
  
  /**
   * Obtiene disponibilidad de un docente
   */
  async getDisponibilidadDocente(id: string): Promise<any> {
    return apiClient.get(ENDPOINTS.DOCENTES.DISPONIBILIDAD(id));
  }
  
  /**
   * Obtiene carga académica de un docente
   */
  async getCargaAcademica(id: string, periodoId?: string): Promise<any> {
    return apiClient.get(ENDPOINTS.DOCENTES.CARGA_ACADEMICA(id), { periodoId });
  }
  
  // ==========================================================================
  // PLANES DE TRABAJO ACADÉMICO (PTA)
  // ==========================================================================
  
  /**
   * Obtiene todos los PTAs con filtros
   */
  async getPTAs(params?: FiltrosProfesoral): Promise<PaginatedResponse<PlanTrabajoAcademico>> {
    return apiClient.get<PaginatedResponse<PlanTrabajoAcademico>>(ENDPOINTS.PTA.BASE, params);
  }
  
  /**
   * Obtiene un PTA por ID
   */
  async getPTAById(id: string): Promise<PlanTrabajoAcademico> {
    return apiClient.get<PlanTrabajoAcademico>(ENDPOINTS.PTA.BY_ID(id));
  }
  
  /**
   * Obtiene PTAs de un docente
   */
  async getPTAsByDocente(docenteId: string): Promise<PlanTrabajoAcademico[]> {
    return apiClient.get<PlanTrabajoAcademico[]>(ENDPOINTS.PTA.BY_DOCENTE(docenteId));
  }
  
  /**
   * Obtiene PTAs de un período académico
   */
  async getPTAsByPeriodo(periodoId: string): Promise<PlanTrabajoAcademico[]> {
    return apiClient.get<PlanTrabajoAcademico[]>(ENDPOINTS.PTA.BY_PERIODO(periodoId));
  }
  
  /**
   * Crea un nuevo PTA
   */
  async createPTA(data: CreatePTARequest): Promise<PlanTrabajoAcademico> {
    return apiClient.post<PlanTrabajoAcademico>(ENDPOINTS.PTA.BASE, data);
  }
  
  /**
   * Actualiza un PTA
   */
  async updatePTA(id: string, data: UpdatePTARequest): Promise<PlanTrabajoAcademico> {
    return apiClient.put<PlanTrabajoAcademico>(ENDPOINTS.PTA.BY_ID(id), data);
  }
  
  /**
   * Envía un PTA a revisión
   */
  async enviarPTARevision(id: string): Promise<PlanTrabajoAcademico> {
    return apiClient.post<PlanTrabajoAcademico>(ENDPOINTS.PTA.REVISION(id), {});
  }
  
  /**
   * Aprueba un PTA
   */
  async aprobarPTA(id: string, observaciones?: string): Promise<PlanTrabajoAcademico> {
    return apiClient.post<PlanTrabajoAcademico>(ENDPOINTS.PTA.APROBAR(id), { observaciones });
  }
  
  /**
   * Rechaza un PTA
   */
  async rechazarPTA(id: string, motivo: string): Promise<PlanTrabajoAcademico> {
    return apiClient.post<PlanTrabajoAcademico>(ENDPOINTS.PTA.RECHAZAR(id), { motivo });
  }
  
  /**
   * Descarga plantilla de PTA
   */
  async descargarPlantillaPTA(): Promise<Blob> {
    return apiClient.get<Blob>(ENDPOINTS.PTA.PLANTILLA);
  }
  
  // ==========================================================================
  // ASIGNACIONES
  // ==========================================================================
  
  /**
   * Obtiene todas las asignaciones
   */
  async getAsignaciones(params?: FiltrosProfesoral): Promise<PaginatedResponse<AsignacionDocente>> {
    return apiClient.get<PaginatedResponse<AsignacionDocente>>(ENDPOINTS.ASIGNACIONES.BASE, params);
  }
  
  /**
   * Obtiene una asignación por ID
   */
  async getAsignacionById(id: string): Promise<AsignacionDocente> {
    return apiClient.get<AsignacionDocente>(ENDPOINTS.ASIGNACIONES.BY_ID(id));
  }
  
  /**
   * Crea una nueva asignación
   */
  async createAsignacion(data: CreateAsignacionRequest): Promise<AsignacionDocente> {
    return apiClient.post<AsignacionDocente>(ENDPOINTS.ASIGNACIONES.BASE, data);
  }
  
  /**
   * Actualiza una asignación
   */
  async updateAsignacion(id: string, data: Partial<CreateAsignacionRequest>): Promise<AsignacionDocente> {
    return apiClient.put<AsignacionDocente>(ENDPOINTS.ASIGNACIONES.BY_ID(id), data);
  }
  
  /**
   * Elimina una asignación
   */
  async deleteAsignacion(id: string): Promise<void> {
    return apiClient.delete(ENDPOINTS.ASIGNACIONES.BY_ID(id));
  }
  
  /**
   * Obtiene matriz de asignaciones
   */
  async getMatrizAsignaciones(periodoId: string): Promise<MatrizAsignaciones> {
    return apiClient.get<MatrizAsignaciones>(ENDPOINTS.ASIGNACIONES.MATRIZ, { periodoId });
  }
  
  /**
   * Detecta conflictos en asignaciones
   */
  async detectarConflictos(periodoId: string): Promise<any[]> {
    return apiClient.get<any[]>(ENDPOINTS.ASIGNACIONES.CONFLICTOS, { periodoId });
  }
  
  /**
   * Valida una asignación antes de crearla
   */
  async validarAsignacion(data: CreateAsignacionRequest): Promise<any> {
    return apiClient.post(ENDPOINTS.ASIGNACIONES.VALIDAR, data);
  }
  
  // ==========================================================================
  // EVALUACIONES
  // ==========================================================================
  
  /**
   * Obtiene todas las evaluaciones
   */
  async getEvaluaciones(params?: FiltrosProfesoral): Promise<PaginatedResponse<EvaluacionDocente>> {
    return apiClient.get<PaginatedResponse<EvaluacionDocente>>(ENDPOINTS.EVALUACIONES.BASE, params);
  }
  
  /**
   * Obtiene una evaluación por ID
   */
  async getEvaluacionById(id: string): Promise<EvaluacionDocente> {
    return apiClient.get<EvaluacionDocente>(ENDPOINTS.EVALUACIONES.BY_ID(id));
  }
  
  /**
   * Obtiene evaluaciones de un docente
   */
  async getEvaluacionesByDocente(docenteId: string): Promise<EvaluacionDocente[]> {
    return apiClient.get<EvaluacionDocente[]>(ENDPOINTS.EVALUACIONES.BY_DOCENTE(docenteId));
  }
  
  /**
   * Crea una nueva evaluación
   */
  async createEvaluacion(data: CreateEvaluacionRequest): Promise<EvaluacionDocente> {
    return apiClient.post<EvaluacionDocente>(ENDPOINTS.EVALUACIONES.BASE, data);
  }
  
  /**
   * Obtiene resultados consolidados de evaluación
   */
  async getResultadosEvaluacion(id: string): Promise<ResultadosEvaluacion> {
    return apiClient.get<ResultadosEvaluacion>(ENDPOINTS.EVALUACIONES.RESULTADOS(id));
  }
  
  /**
   * Obtiene consolidado de evaluaciones
   */
  async getConsolidadoEvaluaciones(periodoId: string): Promise<any> {
    return apiClient.get(ENDPOINTS.EVALUACIONES.CONSOLIDADO, { periodoId });
  }
  
  // ==========================================================================
  // CALENDARIO ACADÉMICO
  // ==========================================================================
  
  /**
   * Obtiene el calendario académico
   */
  async getCalendario(periodoId?: string): Promise<CalendarioAcademico> {
    return apiClient.get<CalendarioAcademico>(
      periodoId ? ENDPOINTS.CALENDARIO.BY_PERIODO(periodoId) : ENDPOINTS.CALENDARIO.BASE
    );
  }
  
  /**
   * Obtiene eventos académicos
   */
  async getEventos(params?: { fechaInicio?: string; fechaFin?: string; tipo?: string }): Promise<EventoAcademico[]> {
    return apiClient.get<EventoAcademico[]>(ENDPOINTS.CALENDARIO.EVENTOS, params);
  }
  
  /**
   * Crea un evento académico
   */
  async createEvento(data: CreateEventoRequest): Promise<EventoAcademico> {
    return apiClient.post<EventoAcademico>(ENDPOINTS.CALENDARIO.EVENTOS, data);
  }
  
  /**
   * Actualiza un evento académico
   */
  async updateEvento(id: string, data: Partial<CreateEventoRequest>): Promise<EventoAcademico> {
    return apiClient.put<EventoAcademico>(ENDPOINTS.CALENDARIO.EVENTO_BY_ID(id), data);
  }
  
  /**
   * Elimina un evento académico
   */
  async deleteEvento(id: string): Promise<void> {
    return apiClient.delete(ENDPOINTS.CALENDARIO.EVENTO_BY_ID(id));
  }
  
  // ==========================================================================
  // DASHBOARD Y REPORTES
  // ==========================================================================
  
  /**
   * Obtiene el dashboard de gestión profesoral
   */
  async getDashboard(): Promise<any> {
    return apiClient.get(ENDPOINTS.DASHBOARD);
  }
  
  /**
   * Obtiene estadísticas generales
   */
  async getEstadisticas(params?: { periodo?: string }): Promise<EstadisticasProfesoral> {
    return apiClient.get<EstadisticasProfesoral>(ENDPOINTS.ESTADISTICAS, params);
  }
  
  /**
   * Genera reporte de carga docente
   */
  async generarReporteCargaDocente(params: ReporteProfesoralParams): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.CARGA_DOCENTE, params);
  }
  
  /**
   * Genera reporte de evaluaciones
   */
  async generarReporteEvaluaciones(params: ReporteProfesoralParams): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.EVALUACIONES, params);
  }
  
  /**
   * Genera reporte de cumplimiento de PTAs
   */
  async generarReportePTACumplimiento(params: ReporteProfesoralParams): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.PTA_CUMPLIMIENTO, params);
  }
  
  /**
   * Genera reporte consolidado
   */
  async generarReporteConsolidado(periodoId: string): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.CONSOLIDADO, { periodoId });
  }
}

// Singleton instance
export const gestionProfesoralService = new GestionProfesoralService();
export default gestionProfesoralService;
