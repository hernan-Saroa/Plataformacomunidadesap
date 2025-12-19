/**
 * Términos y Alertas Service
 * Servicio para gestión de términos procesales, días festivos y alertas
 * 
 * RF006 - GESTIÓN DE TÉRMINOS Y ALERTAS
 * 
 * Nota: Todos los endpoints van al servicio 'control-disciplinario' del API Gateway
 * URL: /control-disciplinario/api/v1/* -> internal-disciplinary-control-service:3005/*
 */

import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway
const SERVICE_PREFIX = '/control-disciplinario/api/v1';

// ============================================================================
// TIPOS Y DTOs
// ============================================================================

export interface DiaFestivo {
  id: string;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  tipo: 'nacional' | 'regional' | 'institucional';
  territorio?: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface Termino {
  id: string;
  procesoId: string;
  numeroProceso: string;
  proceso: string; // Nombre del denunciado
  actuacion: string;
  responsableId: string;
  responsable: string;
  emailResponsable: string;
  fechaInicio: string; // YYYY-MM-DD
  diasHabiles: number;
  fechaVencimiento: string; // Calculada automáticamente
  diasRestantes: number; // Calculado
  estado: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido';
  alertaEnviada: boolean;
  fechaCumplimiento?: string;
  observaciones?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface Alerta {
  id: string;
  terminoId: string;
  proceso: string;
  tipo: 'email' | 'visual' | 'sistema';
  fechaEnvio: string;
  destinatario: string;
  estado: 'enviada' | 'pendiente' | 'error';
  asunto: string;
  mensaje?: string;
  reglaAlertaId?: string;
}

export interface ReglaAlerta {
  id: string;
  nombre: string;
  diasAnticipacion: number;
  activa: boolean;
  enviarEmail: boolean;
  mostrarPanel: boolean;
  descripcion: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface CreateTerminoDto {
  procesoId: string;
  actuacion: string;
  responsableId: string;
  fechaInicio: string;
  diasHabiles: number;
}

export interface UpdateTerminoDto {
  actuacion?: string;
  responsableId?: string;
  fechaInicio?: string;
  diasHabiles?: number;
}

export interface MarcarCumplidoDto {
  fechaCumplimiento: string;
  observaciones?: string;
}

export interface CreateFestivoDto {
  fecha: string;
  descripcion: string;
  tipo: 'nacional' | 'regional' | 'institucional';
  territorio?: string;
}

export interface CreateReglaAlertaDto {
  nombre: string;
  diasAnticipacion: number;
  activa: boolean;
  enviarEmail: boolean;
  mostrarPanel: boolean;
  descripcion: string;
}

export interface ListarTerminosParams {
  page?: number;
  limit?: number;
  estado?: 'pendiente' | 'proximo_vencer' | 'vencido' | 'cumplido';
  procesoId?: string;
  responsableId?: string;
  search?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ListarFestivosParams {
  tipo?: 'nacional' | 'regional' | 'institucional';
  territorio?: string;
  year?: number;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface ListarAlertasParams {
  page?: number;
  limit?: number;
  terminoId?: string;
  tipo?: 'email' | 'visual' | 'sistema';
  estado?: 'enviada' | 'pendiente' | 'error';
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats?: any;
}

export interface RecalculoResult {
  terminosActualizados: number;
  cambiosEstado: {
    pendiente: number;
    proximo_vencer: number;
    vencido: number;
  };
}

// ============================================================================
// SERVICIO
// ============================================================================

class TerminosAlertasService {
  // ==================== TÉRMINOS PROCESALES ====================

  /**
   * Listar términos con filtros y paginación
   */
  async listarTerminos(params?: ListarTerminosParams): Promise<PaginatedResponse<Termino>> {
    return apiClient.get<PaginatedResponse<Termino>>(
      `${SERVICE_PREFIX}/terminos-procesales`,
      params
    );
  }

  /**
   * Obtener término por ID
   */
  async obtenerTermino(id: string): Promise<Termino> {
    return apiClient.get<Termino>(`${SERVICE_PREFIX}/terminos-procesales/${id}`);
  }

  /**
   * Crear nuevo término procesal
   */
  async crearTermino(dto: CreateTerminoDto): Promise<Termino> {
    return apiClient.post<Termino>(`${SERVICE_PREFIX}/terminos-procesales`, dto);
  }

  /**
   * Actualizar término
   */
  async actualizarTermino(id: string, dto: UpdateTerminoDto): Promise<Termino> {
    return apiClient.put<Termino>(`${SERVICE_PREFIX}/terminos-procesales/${id}`, dto);
  }

  /**
   * Marcar término como cumplido
   */
  async marcarCumplido(id: string, dto: MarcarCumplidoDto): Promise<Termino> {
    return apiClient.patch<Termino>(
      `${SERVICE_PREFIX}/terminos-procesales/${id}/marcar-cumplido`,
      dto
    );
  }

  /**
   * Recalcular todos los términos activos
   */
  async recalcularTerminos(): Promise<RecalculoResult> {
    return apiClient.post<RecalculoResult>(
      `${SERVICE_PREFIX}/terminos-procesales/recalcular`,
      {}
    );
  }

  /**
   * Buscar proceso por radicadoProceso (numeroProceso)
   */
  async buscarProcesoPorRadicado(radicadoProceso: string): Promise<any> {
    return apiClient.get<any>(`${SERVICE_PREFIX}/disciplinary-processes/by-radicado/${radicadoProceso}`);
  }

  /**
   * Eliminar término (solo si está cumplido)
   */
  async eliminarTermino(id: string): Promise<void> {
    return apiClient.delete<void>(`${SERVICE_PREFIX}/terminos-procesales/${id}`);
  }

  // ==================== DÍAS FESTIVOS ====================

  /**
   * Listar días festivos
   */
  async listarFestivos(params?: ListarFestivosParams): Promise<{ festivos: DiaFestivo[]; total: number }> {
    return apiClient.get<{ festivos: DiaFestivo[]; total: number }>(
      `${SERVICE_PREFIX}/dias-festivos`,
      params
    );
  }

  /**
   * Obtener festivo por ID
   */
  async obtenerFestivo(id: string): Promise<DiaFestivo> {
    return apiClient.get<DiaFestivo>(`${SERVICE_PREFIX}/dias-festivos/${id}`);
  }

  /**
   * Crear nuevo día festivo
   */
  async crearFestivo(dto: CreateFestivoDto): Promise<DiaFestivo> {
    return apiClient.post<DiaFestivo>(`${SERVICE_PREFIX}/dias-festivos`, dto);
  }

  /**
   * Actualizar día festivo
   */
  async actualizarFestivo(id: string, dto: Partial<CreateFestivoDto>): Promise<DiaFestivo> {
    return apiClient.put<DiaFestivo>(`${SERVICE_PREFIX}/dias-festivos/${id}`, dto);
  }

  /**
   * Eliminar día festivo
   */
  async eliminarFestivo(id: string): Promise<void> {
    return apiClient.delete<void>(`${SERVICE_PREFIX}/dias-festivos/${id}`);
  }

  // ==================== REGLAS DE ALERTA ====================

  /**
   * Listar reglas de alerta
   */
  async listarReglasAlerta(): Promise<{ reglas: ReglaAlerta[] }> {
    return apiClient.get<{ reglas: ReglaAlerta[] }>(`${SERVICE_PREFIX}/reglas-alerta`);
  }

  /**
   * Obtener regla por ID
   */
  async obtenerReglaAlerta(id: string): Promise<ReglaAlerta> {
    return apiClient.get<ReglaAlerta>(`${SERVICE_PREFIX}/reglas-alerta/${id}`);
  }

  /**
   * Crear nueva regla de alerta
   */
  async crearReglaAlerta(dto: CreateReglaAlertaDto): Promise<ReglaAlerta> {
    return apiClient.post<ReglaAlerta>(`${SERVICE_PREFIX}/reglas-alerta`, dto);
  }

  /**
   * Actualizar regla de alerta
   */
  async actualizarReglaAlerta(id: string, dto: Partial<CreateReglaAlertaDto>): Promise<ReglaAlerta> {
    return apiClient.put<ReglaAlerta>(`${SERVICE_PREFIX}/reglas-alerta/${id}`, dto);
  }

  /**
   * Activar/desactivar regla
   */
  async toggleReglaAlerta(id: string): Promise<ReglaAlerta> {
    return apiClient.patch<ReglaAlerta>(`${SERVICE_PREFIX}/reglas-alerta/${id}/toggle`, {});
  }

  /**
   * Eliminar regla de alerta
   */
  async eliminarReglaAlerta(id: string): Promise<void> {
    return apiClient.delete<void>(`${SERVICE_PREFIX}/reglas-alerta/${id}`);
  }

  // ==================== HISTORIAL DE ALERTAS ====================

  /**
   * Listar alertas enviadas
   */
  async listarAlertas(params?: ListarAlertasParams): Promise<PaginatedResponse<Alerta>> {
    return apiClient.get<PaginatedResponse<Alerta>>(
      `${SERVICE_PREFIX}/alertas`,
      params
    );
  }

  /**
   * Obtener alerta por ID
   */
  async obtenerAlerta(id: string): Promise<Alerta> {
    return apiClient.get<Alerta>(`${SERVICE_PREFIX}/alertas/${id}`);
  }
}

export const terminosAlertasService = new TerminosAlertasService();
export default terminosAlertasService;

