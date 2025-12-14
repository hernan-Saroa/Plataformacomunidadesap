/**
 * Servicio Control Interno Disciplinario
 * Gestiona procesos, audiencias, notificaciones y gestión documental
 */

import { apiClient } from './client';
import type {
  // Dashboard
  DashboardControlInterno,
  EstadisticasControlInterno,
  
  // Plan Anual
  PlanAnualAuditoria,
  CreatePlanAnualRequest,
  UpdatePlanAnualRequest,
  
  // Auditorías
  Auditoria,
  CreateAuditoriaRequest,
  UpdateAuditoriaRequest,
  AuditoriaDetalle,
  
  // Hallazgos
  Hallazgo,
  CreateHallazgoRequest,
  UpdateHallazgoRequest,
  HallazgoDetalle,
  
  // Planes de Mejoramiento
  PlanMejoramiento,
  CreatePlanMejoramientoRequest,
  UpdatePlanMejoramientoRequest,
  AccionMejora,
  
  // Listas de Chequeo
  ListaChequeo,
  CreateListaChequeoRequest,
  ItemListaChequeo,
  
  // Universo de Auditorías
  UniversoAuditorias,
  ProcesoAuditable,
  EvaluacionRiesgo,
  
  // Seguimiento
  SeguimientoHallazgo,
  AvancePlanMejoramiento,
  
  // Reportes
  ReporteAuditoriaParams,
  ReporteHallazgosParams,
  
  // Filtros y paginación
  PaginatedResponse,
  FiltrosControlInterno
} from '../../types/control-interno';

// ============================================================================
// ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  // Dashboard
  DASHBOARD: '/control-interno/dashboard',
  ESTADISTICAS: '/control-interno/estadisticas',
  KPI: '/control-interno/kpi',
  ALERTAS: '/control-interno/alertas',
  
  // Plan Anual de Auditoría
  PLAN_ANUAL: {
    BASE: '/control-interno/plan-anual',
    BY_ID: (id: string) => `/control-interno/plan-anual/${id}`,
    BY_YEAR: (year: number) => `/control-interno/plan-anual/year/${year}`,
    APROBAR: (id: string) => `/control-interno/plan-anual/${id}/aprobar`,
    DESCARGAR: (id: string) => `/control-interno/plan-anual/${id}/download`,
    CRONOGRAMA: (id: string) => `/control-interno/plan-anual/${id}/cronograma`,
  },
  
  // Auditorías
  AUDITORIAS: {
    BASE: '/control-interno/auditorias',
    BY_ID: (id: string) => `/control-interno/auditorias/${id}`,
    DETALLE: (id: string) => `/control-interno/auditorias/${id}/detalle`,
    EQUIPO: (id: string) => `/control-interno/auditorias/${id}/equipo`,
    CRONOGRAMA: (id: string) => `/control-interno/auditorias/${id}/cronograma`,
    EVIDENCIAS: (id: string) => `/control-interno/auditorias/${id}/evidencias`,
    UPLOAD_EVIDENCIA: (id: string) => `/control-interno/auditorias/${id}/evidencias/upload`,
    CAMBIAR_ESTADO: (id: string) => `/control-interno/auditorias/${id}/estado`,
  },
  
  // Hallazgos
  HALLAZGOS: {
    BASE: '/control-interno/hallazgos',
    BY_ID: (id: string) => `/control-interno/hallazgos/${id}`,
    DETALLE: (id: string) => `/control-interno/hallazgos/${id}/detalle`,
    BY_AUDITORIA: (auditoriaId: string) => `/control-interno/hallazgos/auditoria/${auditoriaId}`,
    COMENTARIOS: (id: string) => `/control-interno/hallazgos/${id}/comentarios`,
    EVIDENCIAS: (id: string) => `/control-interno/hallazgos/${id}/evidencias`,
    SEGUIMIENTO: (id: string) => `/control-interno/hallazgos/${id}/seguimiento`,
    ESTADISTICAS: '/control-interno/hallazgos/estadisticas',
  },
  
  // Planes de Mejoramiento
  PLANES_MEJORAMIENTO: {
    BASE: '/control-interno/planes-mejoramiento',
    BY_ID: (id: string) => `/control-interno/planes-mejoramiento/${id}`,
    BY_HALLAZGO: (hallazgoId: string) => `/control-interno/planes-mejoramiento/hallazgo/${hallazgoId}`,
    ACCIONES: (id: string) => `/control-interno/planes-mejoramiento/${id}/acciones`,
    ACCION_BY_ID: (planId: string, accionId: string) => `/control-interno/planes-mejoramiento/${planId}/acciones/${accionId}`,
    AVANCE: (id: string) => `/control-interno/planes-mejoramiento/${id}/avance`,
    APROBAR: (id: string) => `/control-interno/planes-mejoramiento/${id}/aprobar`,
    RECHAZAR: (id: string) => `/control-interno/planes-mejoramiento/${id}/rechazar`,
  },
  
  // Listas de Chequeo
  LISTAS_CHEQUEO: {
    BASE: '/control-interno/listas-chequeo',
    BY_ID: (id: string) => `/control-interno/listas-chequeo/${id}`,
    BY_TIPO: (tipo: string) => `/control-interno/listas-chequeo/tipo/${tipo}`,
    ITEMS: (id: string) => `/control-interno/listas-chequeo/${id}/items`,
    EVALUAR: (id: string) => `/control-interno/listas-chequeo/${id}/evaluar`,
    RESULTADOS: (id: string) => `/control-interno/listas-chequeo/${id}/resultados`,
  },
  
  // Universo de Auditorías
  UNIVERSO: {
    BASE: '/control-interno/universo',
    PROCESOS: '/control-interno/universo/procesos',
    PROCESO_BY_ID: (id: string) => `/control-interno/universo/procesos/${id}`,
    EVALUACION_RIESGO: (procesoId: string) => `/control-interno/universo/procesos/${procesoId}/riesgo`,
    MATRIZ_RIESGO: '/control-interno/universo/matriz-riesgo',
  },
  
  // Reportes
  REPORTES: {
    AUDITORIA: '/control-interno/reportes/auditoria',
    HALLAZGOS: '/control-interno/reportes/hallazgos',
    PLAN_MEJORAMIENTO: '/control-interno/reportes/plan-mejoramiento',
    CONSOLIDADO: '/control-interno/reportes/consolidado',
    INDICADORES: '/control-interno/reportes/indicadores',
  }
};

// ============================================================================
// SERVICIO DE CONTROL INTERNO
// ============================================================================

class ControlInternoService {
  
  // ==========================================================================
  // DASHBOARD Y ESTADÍSTICAS
  // ==========================================================================
  
  /**
   * Obtiene el dashboard ejecutivo de Control Interno
   */
  async getDashboard(): Promise<DashboardControlInterno> {
    return apiClient.get<DashboardControlInterno>(ENDPOINTS.DASHBOARD);
  }
  
  /**
   * Obtiene estadísticas generales del módulo
   */
  async getEstadisticas(params?: { periodo?: string; territorial?: string }): Promise<EstadisticasControlInterno> {
    return apiClient.get<EstadisticasControlInterno>(ENDPOINTS.ESTADISTICAS, params);
  }
  
  /**
   * Obtiene KPIs del sistema de control interno
   */
  async getKPIs(periodo: string): Promise<any> {
    return apiClient.get(ENDPOINTS.KPI, { periodo });
  }
  
  /**
   * Obtiene alertas activas
   */
  async getAlertas(): Promise<any[]> {
    return apiClient.get(ENDPOINTS.ALERTAS);
  }
  
  // ==========================================================================
  // PLAN ANUAL DE AUDITORÍA
  // ==========================================================================
  
  /**
   * Obtiene todos los planes anuales
   */
  async getPlanes(params?: { year?: number; estado?: string }): Promise<PaginatedResponse<PlanAnualAuditoria>> {
    return apiClient.get<PaginatedResponse<PlanAnualAuditoria>>(ENDPOINTS.PLAN_ANUAL.BASE, params);
  }
  
  /**
   * Obtiene un plan anual por ID
   */
  async getPlanById(id: string): Promise<PlanAnualAuditoria> {
    return apiClient.get<PlanAnualAuditoria>(ENDPOINTS.PLAN_ANUAL.BY_ID(id));
  }
  
  /**
   * Obtiene el plan anual de un año específico
   */
  async getPlanByYear(year: number): Promise<PlanAnualAuditoria> {
    return apiClient.get<PlanAnualAuditoria>(ENDPOINTS.PLAN_ANUAL.BY_YEAR(year));
  }
  
  /**
   * Crea un nuevo plan anual
   */
  async createPlan(data: CreatePlanAnualRequest): Promise<PlanAnualAuditoria> {
    return apiClient.post<PlanAnualAuditoria>(ENDPOINTS.PLAN_ANUAL.BASE, data);
  }
  
  /**
   * Actualiza un plan anual
   */
  async updatePlan(id: string, data: UpdatePlanAnualRequest): Promise<PlanAnualAuditoria> {
    return apiClient.put<PlanAnualAuditoria>(ENDPOINTS.PLAN_ANUAL.BY_ID(id), data);
  }
  
  /**
   * Aprueba un plan anual
   */
  async aprobarPlan(id: string, observaciones?: string): Promise<PlanAnualAuditoria> {
    return apiClient.post<PlanAnualAuditoria>(ENDPOINTS.PLAN_ANUAL.APROBAR(id), { observaciones });
  }
  
  /**
   * Descarga el plan anual en PDF
   */
  async descargarPlan(id: string): Promise<Blob> {
    return apiClient.get<Blob>(ENDPOINTS.PLAN_ANUAL.DESCARGAR(id));
  }
  
  // ==========================================================================
  // AUDITORÍAS
  // ==========================================================================
  
  /**
   * Obtiene todas las auditorías con filtros
   */
  async getAuditorias(params?: FiltrosControlInterno): Promise<PaginatedResponse<Auditoria>> {
    return apiClient.get<PaginatedResponse<Auditoria>>(ENDPOINTS.AUDITORIAS.BASE, params);
  }
  
  /**
   * Obtiene una auditoría por ID
   */
  async getAuditoriaById(id: string): Promise<AuditoriaDetalle> {
    return apiClient.get<AuditoriaDetalle>(ENDPOINTS.AUDITORIAS.DETALLE(id));
  }
  
  /**
   * Crea una nueva auditoría
   */
  async createAuditoria(data: CreateAuditoriaRequest): Promise<Auditoria> {
    return apiClient.post<Auditoria>(ENDPOINTS.AUDITORIAS.BASE, data);
  }
  
  /**
   * Actualiza una auditoría
   */
  async updateAuditoria(id: string, data: UpdateAuditoriaRequest): Promise<Auditoria> {
    return apiClient.put<Auditoria>(ENDPOINTS.AUDITORIAS.BY_ID(id), data);
  }
  
  /**
   * Cambia el estado de una auditoría
   */
  async cambiarEstadoAuditoria(id: string, nuevoEstado: string, observaciones?: string): Promise<Auditoria> {
    return apiClient.post<Auditoria>(ENDPOINTS.AUDITORIAS.CAMBIAR_ESTADO(id), {
      estado: nuevoEstado,
      observaciones
    });
  }
  
  /**
   * Sube evidencias a una auditoría
   */
  async uploadEvidencia(id: string, archivo: File, descripcion?: string): Promise<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (descripcion) formData.append('descripcion', descripcion);
    
    return apiClient.upload(ENDPOINTS.AUDITORIAS.UPLOAD_EVIDENCIA(id), formData);
  }
  
  // ==========================================================================
  // HALLAZGOS
  // ==========================================================================
  
  /**
   * Obtiene todos los hallazgos con filtros
   */
  async getHallazgos(params?: FiltrosControlInterno): Promise<PaginatedResponse<Hallazgo>> {
    return apiClient.get<PaginatedResponse<Hallazgo>>(ENDPOINTS.HALLAZGOS.BASE, params);
  }
  
  /**
   * Obtiene un hallazgo por ID con detalle completo
   */
  async getHallazgoById(id: string): Promise<HallazgoDetalle> {
    return apiClient.get<HallazgoDetalle>(ENDPOINTS.HALLAZGOS.DETALLE(id));
  }
  
  /**
   * Obtiene hallazgos de una auditoría específica
   */
  async getHallazgosByAuditoria(auditoriaId: string): Promise<Hallazgo[]> {
    return apiClient.get<Hallazgo[]>(ENDPOINTS.HALLAZGOS.BY_AUDITORIA(auditoriaId));
  }
  
  /**
   * Crea un nuevo hallazgo
   */
  async createHallazgo(data: CreateHallazgoRequest): Promise<Hallazgo> {
    return apiClient.post<Hallazgo>(ENDPOINTS.HALLAZGOS.BASE, data);
  }
  
  /**
   * Actualiza un hallazgo
   */
  async updateHallazgo(id: string, data: UpdateHallazgoRequest): Promise<Hallazgo> {
    return apiClient.put<Hallazgo>(ENDPOINTS.HALLAZGOS.BY_ID(id), data);
  }
  
  /**
   * Elimina un hallazgo
   */
  async deleteHallazgo(id: string): Promise<void> {
    return apiClient.delete(ENDPOINTS.HALLAZGOS.BY_ID(id));
  }
  
  /**
   * Obtiene estadísticas de hallazgos
   */
  async getEstadisticasHallazgos(): Promise<any> {
    return apiClient.get(ENDPOINTS.HALLAZGOS.ESTADISTICAS);
  }
  
  // ==========================================================================
  // PLANES DE MEJORAMIENTO
  // ==========================================================================
  
  /**
   * Obtiene todos los planes de mejoramiento
   */
  async getPlanesMejoramiento(params?: FiltrosControlInterno): Promise<PaginatedResponse<PlanMejoramiento>> {
    return apiClient.get<PaginatedResponse<PlanMejoramiento>>(ENDPOINTS.PLANES_MEJORAMIENTO.BASE, params);
  }
  
  /**
   * Obtiene un plan de mejoramiento por ID
   */
  async getPlanMejoramientoById(id: string): Promise<PlanMejoramiento> {
    return apiClient.get<PlanMejoramiento>(ENDPOINTS.PLANES_MEJORAMIENTO.BY_ID(id));
  }
  
  /**
   * Crea un plan de mejoramiento
   */
  async createPlanMejoramiento(data: CreatePlanMejoramientoRequest): Promise<PlanMejoramiento> {
    return apiClient.post<PlanMejoramiento>(ENDPOINTS.PLANES_MEJORAMIENTO.BASE, data);
  }
  
  /**
   * Actualiza un plan de mejoramiento
   */
  async updatePlanMejoramiento(id: string, data: UpdatePlanMejoramientoRequest): Promise<PlanMejoramiento> {
    return apiClient.put<PlanMejoramiento>(ENDPOINTS.PLANES_MEJORAMIENTO.BY_ID(id), data);
  }
  
  /**
   * Crea una acción de mejora
   */
  async createAccionMejora(planId: string, data: Partial<AccionMejora>): Promise<AccionMejora> {
    return apiClient.post<AccionMejora>(ENDPOINTS.PLANES_MEJORAMIENTO.ACCIONES(planId), data);
  }
  
  /**
   * Actualiza una acción de mejora
   */
  async updateAccionMejora(planId: string, accionId: string, data: Partial<AccionMejora>): Promise<AccionMejora> {
    return apiClient.put<AccionMejora>(
      ENDPOINTS.PLANES_MEJORAMIENTO.ACCION_BY_ID(planId, accionId),
      data
    );
  }
  
  /**
   * Aprueba un plan de mejoramiento
   */
  async aprobarPlanMejoramiento(id: string, observaciones?: string): Promise<PlanMejoramiento> {
    return apiClient.post<PlanMejoramiento>(ENDPOINTS.PLANES_MEJORAMIENTO.APROBAR(id), { observaciones });
  }
  
  /**
   * Rechaza un plan de mejoramiento
   */
  async rechazarPlanMejoramiento(id: string, motivo: string): Promise<PlanMejoramiento> {
    return apiClient.post<PlanMejoramiento>(ENDPOINTS.PLANES_MEJORAMIENTO.RECHAZAR(id), { motivo });
  }
  
  // ==========================================================================
  // LISTAS DE CHEQUEO
  // ==========================================================================
  
  /**
   * Obtiene todas las listas de chequeo
   */
  async getListasChequeo(params?: { tipo?: string }): Promise<PaginatedResponse<ListaChequeo>> {
    return apiClient.get<PaginatedResponse<ListaChequeo>>(ENDPOINTS.LISTAS_CHEQUEO.BASE, params);
  }
  
  /**
   * Obtiene una lista de chequeo por ID
   */
  async getListaChequeoById(id: string): Promise<ListaChequeo> {
    return apiClient.get<ListaChequeo>(ENDPOINTS.LISTAS_CHEQUEO.BY_ID(id));
  }
  
  /**
   * Crea una lista de chequeo
   */
  async createListaChequeo(data: CreateListaChequeoRequest): Promise<ListaChequeo> {
    return apiClient.post<ListaChequeo>(ENDPOINTS.LISTAS_CHEQUEO.BASE, data);
  }
  
  /**
   * Evalúa una lista de chequeo
   */
  async evaluarListaChequeo(id: string, respuestas: any[]): Promise<any> {
    return apiClient.post(ENDPOINTS.LISTAS_CHEQUEO.EVALUAR(id), { respuestas });
  }
  
  // ==========================================================================
  // UNIVERSO DE AUDITORÍAS
  // ==========================================================================
  
  /**
   * Obtiene el universo de auditorías
   */
  async getUniverso(): Promise<UniversoAuditorias> {
    return apiClient.get<UniversoAuditorias>(ENDPOINTS.UNIVERSO.BASE);
  }
  
  /**
   * Obtiene todos los procesos auditables
   */
  async getProcesosAuditables(): Promise<ProcesoAuditable[]> {
    return apiClient.get<ProcesoAuditable[]>(ENDPOINTS.UNIVERSO.PROCESOS);
  }
  
  /**
   * Obtiene un proceso auditable por ID
   */
  async getProcesoById(id: string): Promise<ProcesoAuditable> {
    return apiClient.get<ProcesoAuditable>(ENDPOINTS.UNIVERSO.PROCESO_BY_ID(id));
  }
  
  /**
   * Obtiene la evaluación de riesgo de un proceso
   */
  async getEvaluacionRiesgo(procesoId: string): Promise<EvaluacionRiesgo> {
    return apiClient.get<EvaluacionRiesgo>(ENDPOINTS.UNIVERSO.EVALUACION_RIESGO(procesoId));
  }
  
  /**
   * Obtiene la matriz de riesgo
   */
  async getMatrizRiesgo(): Promise<any> {
    return apiClient.get(ENDPOINTS.UNIVERSO.MATRIZ_RIESGO);
  }
  
  // ==========================================================================
  // REPORTES
  // ==========================================================================
  
  /**
   * Genera reporte de auditoría
   */
  async generarReporteAuditoria(params: ReporteAuditoriaParams): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.AUDITORIA, params);
  }
  
  /**
   * Genera reporte de hallazgos
   */
  async generarReporteHallazgos(params: ReporteHallazgosParams): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.HALLAZGOS, params);
  }
  
  /**
   * Genera reporte consolidado
   */
  async generarReporteConsolidado(periodo: string): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.CONSOLIDADO, { periodo });
  }
}

// Singleton instance
export const controlInternoService = new ControlInternoService();
export default controlInternoService;