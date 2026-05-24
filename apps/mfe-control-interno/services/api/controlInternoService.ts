/**
 * Servicio API - Control Interno de Gestión
 * 
 * Conecta con el backend en: http://localhost:3007/api/v1
 * 
 * Servicios migrados a BD (funcionando):
 * 1. UniversoAuditoriasService ✅
 * 2. ProgramaAnualService ✅
 * 3. PlanIndividualService ✅
 * 4. ListasChequeoService ✅
 * 5. HallazgosService ✅
 * 6. InformesService ✅
 * 7. NotificacionesService ✅
 * 8. DocumentosService ✅
 * 9. ConfiguracionService ✅
 */

import { apiClient } from './apiClient';
import { getServiceUrl, API_MODE, MICROSERVICE_URLS } from '../../config/environment';

// Base URL del servicio de Control Interno usando variables de entorno
// En modo gateway: http://localhost:3000 o http://4.156.71.181/services
// En modo direct: http://localhost:3007
const CONTROL_INTERNO_BASE_URL = getServiceUrl('control-institucional');

// Prefijo del servicio para el API Gateway
// En modo gateway se usa: /control-institucional/api/v1
// En modo direct NO se usa prefijo - el microservicio no tiene prefijo global
// El gateway maneja: /control-institucional/api/v1/auditorias -> microservicio:3007/auditorias
const SERVICE_PREFIX = API_MODE === 'gateway' ? '/control-institucional/api/v1' : '';

// ============================================================================
// TIPOS (simplificados - ajustar según necesidades)
// ============================================================================

export interface ProcesoAuditable {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  macroproceso: string;
  responsable: string;
  dependencia: string;
  territorial?: string;
  evaluacionRiesgo: {
    probabilidad: number;
    impacto: number;
    nivelControl: number;
    riesgoInherente: number;
    riesgoResidual: number;
    nivelRiesgo: 'bajo' | 'medio' | 'alto';
    // Distribución de riesgos DAFP
    riesgosExtremos?: number;
    riesgosAltos?: number;
    riesgosModerados?: number;
    riesgosBajos?: number;
    totalRiesgos?: number;
    // Requerimientos especiales
    requerimientoComite?: boolean;
    requerimientoEntesReg?: boolean;
    // Campos DAFP calculados y decisión
    vigencia?: number;
    fechaCorte?: string;
    ponderacionRiesgo?: string;
    diasRotacion?: number;
    decisionRotacion?: string;
    decisionFinal?: string;
    motivoDecision?: string;
    prioridadRegla?: number;
    // Score C+E-M (modelo simplificado 0-15)
    criticidad?: number;
    exposicion?: number;
    mitigantes?: number;
    scoreRiesgo?: number;
  };
  frecuenciaAuditoria: string;
  ultimaAuditoria?: string;
  resultadoUltimaAuditoria?: string;
  proximaAuditoria?: string;
  prioridad: number;
  priorizacionAnos: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Evaluación de Proceso DAFP
 * Permite múltiples evaluaciones por proceso con diferentes vigencias/fechas
 */
export interface EvaluacionProceso {
  id: string;
  procesoId: string;
  proceso?: ProcesoAuditable;
  // Encabezado
  vigencia: number;
  fechaCorte: string;
  dependenciaResponsable: string;
  // Riesgos inherentes
  riesgosExtremos: number;
  riesgosAltos: number;
  riesgosModerados: number;
  riesgosBajos: number;
  totalRiesgos: number;
  // Requerimientos especiales
  requerimientoComite: boolean;
  requerimientoEntesReg: boolean;
  // Auditoría anterior
  fechaUltimaAuditoria?: string;
  resultadoUltimaAuditoria?: string;
  // Score C+E-M
  criticidad: number;
  exposicion: number;
  mitigantes: number;
  scoreRiesgo: number;
  // Criterios de priorización DAFP (migración 179)
  tiempoUltimaAuditoria?: number;
  temasAltaDireccion?: number;
  objetivosEstrategicos?: number;
  hallazgosAnteriores?: number;
  ponderacionFinalDafp?: number;
  nivelCriticidadDafp?: string;
  cicloRotacionDafp?: string;
  // Cálculos DAFP legacy
  ponderacionRiesgo?: string;
  diasTranscurridos?: number;
  planRotacion?: string;
  diasRotacion: number;
  decisionRotacion?: string;
  // Decisión final
  decisionFinal?: string;
  motivoDecision?: string;
  prioridadRegla?: number;
  // Metadatos
  creadoPor?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvaluacionProcesoDTO {
  procesoId: string;
  vigencia: number;
  fechaCorte: string;
  dependenciaResponsable: string;
  riesgosExtremos?: number;
  riesgosAltos?: number;
  riesgosModerados?: number;
  riesgosBajos?: number;
  requerimientoComite?: boolean;
  requerimientoEntesReg?: boolean;
  fechaUltimaAuditoria?: string;
  resultadoUltimaAuditoria?: string;
  criticidad?: number;
  exposicion?: number;
  mitigantes?: number;
  // Criterios de priorización DAFP (migración 179)
  tiempoUltimaAuditoria?: number;
  temasAltaDireccion?: number;
  objetivosEstrategicos?: number;
  hallazgosAnteriores?: number;
  ponderacionFinalDafp?: number;
  nivelCriticidadDafp?: string;
  cicloRotacionDafp?: string;
  decisionFinal?: string;
  motivoDecision?: string;
  prioridadRegla?: number;
}

export interface AuditoriaProgramada {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  procesoId?: string;
  procesoNombre?: string;
  año: number;
  estado: string;
  fechaInicio: string;
  fechaFin: string;
  auditorLider?: string;
  equipo?: string[];
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Hallazgo {
  id: string;
  codigo: string;
  categoria: 'critico' | 'controversia' | 'borrador';
  estado: string;
  area: string;
  auditoria: string;
  auditoriaEntity?: AuditoriaProgramada;
  descripcion: string;
  criterioIncumplido: string;
  causa?: string;
  efecto?: string;
  normativaRelacionada: string[];
  evidencias: Array<{
    id: string;
    nombre: string;
    tipo: string;
    fecha: string;
    url?: string;
  }>;
  recomendaciones: string[];
  fechaDeteccion: string;
  fechaNotificacion?: string;
  responsable?: string;
  fechaLimiteCorreccion?: string;
  observacionesControversia?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListaChequeo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: 'cumplimiento' | 'proceso' | 'sistema' | 'procedimiento' | 'planeacion' | 'ejecucion' | 'comunicacion' | 'seguimiento';
  categoria: string;
  version: string;
  estado: 'activa' | 'inactiva' | 'obsoleta';
  activa?: boolean; // ✅ Estado de activación
  items?: any[];
  itemsJsonb?: Array<{
    id: string;
    numero: number;
    pregunta: string;
    criterio: string;
    normativaReferencia?: string;
    tipoRespuesta: 'si_no' | 'cumple_no_cumple' | 'texto' | 'numerico';
    obligatorio: boolean;
    pesoCalificacion?: number;
    evidenciaRequerida: boolean;
  }>;
  aplicablePara: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  // ✅ VINCULACIÓN CON AUDITORÍA
  auditoriaId?: string;
  nombreAuditoria?: string;
  auditorResponsable?: string;
  fechaAplicacion?: string;
  itemsCompletados?: number;
  cumplimiento?: number;
  // ✅ FASES QUE IMPACTA LA LISTA
  fasePlaneacion?: boolean;
  faseEjecucion?: boolean;
  faseComunicacion?: boolean;
  faseSeguimiento?: boolean;
  // ✅ ETAPA KANBAN DINÁMICA (sistema moderno)
  etapaKanbanId?: string; // ID de la etapa kanban (UUID)
  etapaNombreKanban?: string; // Nombre de la etapa al momento de guardar (snapshot)
}

export interface PlanIndividual {
  id: string;
  auditoriaId: string;
  codigo: string;
  nombre: string;
  objetivo: string;
  alcance: string;
  metodologia: string;
  recursos: string[];
  cronograma: any;
  estado: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos para Tareas de Auditoría
export type EstadoTarea = 'Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada';
export type PrioridadTarea = 'Baja' | 'Media' | 'Alta' | 'Urgente';
export type FaseTarea = 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento';

export interface TareaAuditoria {
  id: string;
  auditoriaId: string;
  titulo: string;
  descripcion?: string;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  fase?: FaseTarea;
  responsableId: string;
  responsableNombre: string;
  fechaVencimiento?: string;
  fechaCompletado?: string;
  fechaCreacion: string;
  progreso: number;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTareaAuditoriaDto {
  auditoriaId: string;
  titulo: string;
  descripcion?: string;
  estado?: EstadoTarea;
  prioridad?: PrioridadTarea;
  fase?: FaseTarea;
  responsableId: string;
  responsableNombre: string;
  fechaVencimiento?: string;
  progreso?: number;
  notas?: string;
}

export interface UpdateTareaAuditoriaDto {
  titulo?: string;
  descripcion?: string;
  estado?: EstadoTarea;
  prioridad?: PrioridadTarea;
  fase?: FaseTarea;
  responsableId?: string;
  responsableNombre?: string;
  fechaVencimiento?: string;
  fechaCompletado?: string;
  progreso?: number;
  notas?: string;
}

// ============================================================================
// CLIENTE API ESPECÍFICO PARA CONTROL INTERNO
// ============================================================================

class ControlInternoAPIClient {
  private baseURL: string;
  private servicePrefix: string;

  constructor() {
    // Normalizar baseURL y evitar duplicar el prefijo cuando VITE_API_URL
    // ya viene configurada como `/services/control-institucional/api/v1`.
    const normalizedBase = (CONTROL_INTERNO_BASE_URL || '').replace(/\/$/, '');
    const normalizedPrefix = (SERVICE_PREFIX || '').replace(/\/$/, '');

    this.baseURL = normalizedBase;
    this.servicePrefix =
      API_MODE === 'gateway' &&
      normalizedPrefix &&
      normalizedBase.toLowerCase().endsWith(normalizedPrefix.toLowerCase())
        ? ''
        : SERVICE_PREFIX;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // En modo gateway: http://4.156.71.181/services/control-institucional/api/v1/plan-anual-5-roles
    // En modo direct: http://localhost:3007/plan-anual-5-roles (sin prefijo /api/v1)
    const url = `${this.baseURL}${this.servicePrefix}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8',
    };
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    // Manejar respuestas vacías (204 No Content) o sin contenido
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType?.includes('application/json')) {
      // Si no hay contenido, devolver un objeto vacío
      return {} as T;
    }

    // Intentar parsear JSON, si falla devolver objeto vacío
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : ({} as T);
    } catch {
      return {} as T;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload<T>(
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const url = `${this.baseURL}${this.servicePrefix}${endpoint}`;
    const headers: HeadersInit = {};
    // NO establecer Content-Type para FormData - el navegador lo hará automáticamente con el boundary

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.withCredentials = true;

      // Manejar progreso
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      // Manejar respuesta
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = xhr.responseText 
              ? JSON.parse(xhr.responseText) 
              : {};
            resolve(response as T);
          } catch (error) {
            resolve({} as T);
          }
        } else {
          try {
            const error = xhr.responseText 
              ? JSON.parse(xhr.responseText) 
              : { message: `HTTP ${xhr.status}` };
            reject(new Error(error.message || `HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        }
      });

      // Manejar errores
      xhr.addEventListener('error', () => {
        reject(new Error('Error de red al subir el archivo'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Carga cancelada'));
      });

      // Abrir y enviar
      xhr.open('POST', url);
      
      // Establecer headers
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });

      xhr.send(formData);
    });
  }
}

const client = new ControlInternoAPIClient();

// ============================================================================
// SERVICIO DE CONTROL INTERNO
// ============================================================================

class ControlInternoService {
  
  // ==========================================================================
  // UNIVERSO DE AUDITORÍAS
  // ==========================================================================
  
  /**
   * Obtiene procesos auditables. Por defecto solo activos (para catálogo parametrizado).
   */
  async getProcesosAuditables(soloActivos = true): Promise<ProcesoAuditable[]> {
    const q = soloActivos ? '' : '?soloActivos=false';
    return client.get<ProcesoAuditable[]>(`/universo-auditorias/procesos${q}`);
  }
  
  /**
   * Obtiene un proceso auditable por ID
   */
  async getProcesoById(id: string): Promise<ProcesoAuditable> {
    return client.get<ProcesoAuditable>(`/universo-auditorias/procesos/${id}`);
  }
  
  /**
   * Crea un nuevo proceso auditable
   */
  async createProceso(data: Partial<ProcesoAuditable>): Promise<ProcesoAuditable> {
    return client.post<ProcesoAuditable>('/universo-auditorias/procesos', data);
  }
  
  /**
   * Actualiza un proceso auditable
   */
  async updateProceso(id: string, data: Partial<ProcesoAuditable>): Promise<ProcesoAuditable> {
    return client.put<ProcesoAuditable>(`/universo-auditorias/procesos/${id}`, data);
  }

  /**
   * Elimina un proceso auditable
   */
  async deleteProceso(id: string): Promise<void> {
    return client.delete(`/universo-auditorias/procesos/${id}`);
  }

  /**
   * Inactiva un proceso (sin eliminar historial)
   */
  async inactivarProceso(id: string): Promise<ProcesoAuditable> {
    return client.patch<ProcesoAuditable>(`/universo-auditorias/procesos/${id}/inactivar`, {});
  }

  /**
   * Reactiva un proceso
   */
  async activarProceso(id: string): Promise<ProcesoAuditable> {
    return client.patch<ProcesoAuditable>(`/universo-auditorias/procesos/${id}/activar`, {});
  }

  /**
   * Obtiene la evaluación de riesgo de un proceso
   */
  async getEvaluacionRiesgo(procesoId: string): Promise<any> {
    return client.get(`/universo-auditorias/procesos/${procesoId}/riesgo`);
  }

  /**
   * Evalúa el riesgo de un proceso
   */
  async evaluarRiesgo(procesoId: string, data: any): Promise<any> {
    return client.post(`/universo-auditorias/procesos/${procesoId}/riesgo`, data);
  }

  /**
   * Obtiene la matriz de riesgo
   */
  async getMatrizRiesgo(): Promise<any> {
    return client.get('/universo-auditorias/matriz-riesgo');
  }

  /**
   * Obtiene la priorización de auditorías
   */
  async getPriorizacion(): Promise<any> {
    return client.get('/universo-auditorias/priorizacion');
  }

  // ==========================================================================
  // EVALUACIONES DE PROCESO (DAFP)
  // ==========================================================================

  /**
   * Obtiene todas las evaluaciones de proceso
   */
  async getEvaluaciones(vigencia?: number): Promise<EvaluacionProceso[]> {
    const q = vigencia ? `?vigencia=${vigencia}` : '';
    // `client` ya agrega `SERVICE_PREFIX` internamente (baseURL + servicePrefix + endpoint).
    return client.get<EvaluacionProceso[]>(`/universo-auditorias/evaluaciones${q}`);
  }

  /**
   * Obtiene una evaluación por ID
   */
  async getEvaluacionById(id: string): Promise<EvaluacionProceso> {
    return client.get<EvaluacionProceso>(`/universo-auditorias/evaluaciones/${id}`);
  }

  /**
   * Obtiene evaluaciones por proceso
   */
  async getEvaluacionesByProceso(procesoId: string): Promise<EvaluacionProceso[]> {
    return client.get<EvaluacionProceso[]>(`/universo-auditorias/evaluaciones/proceso/${procesoId}`);
  }

  /**
   * Obtiene estadísticas de evaluaciones por vigencia
   */
  async getEstadisticasEvaluaciones(vigencia: number): Promise<any> {
    return client.get(`/universo-auditorias/evaluaciones/estadisticas/${vigencia}`);
  }

  /**
   * Crea una nueva evaluación de proceso
   */
  async createEvaluacion(data: CreateEvaluacionProcesoDTO): Promise<EvaluacionProceso> {
    // `client` ya agrega `SERVICE_PREFIX` internamente (baseURL + servicePrefix + endpoint).
    return client.post<EvaluacionProceso>(`/universo-auditorias/evaluaciones`, data);
  }

  /**
   * Actualiza una evaluación de proceso
   */
  async updateEvaluacion(id: string, data: Partial<CreateEvaluacionProcesoDTO>): Promise<EvaluacionProceso> {
    return client.put<EvaluacionProceso>(`/universo-auditorias/evaluaciones/${id}`, data);
  }

  /**
   * Elimina una evaluación de proceso
   */
  async deleteEvaluacion(id: string): Promise<void> {
    return client.delete(`/universo-auditorias/evaluaciones/${id}`);
  }

  // ==========================================================================
  // PROGRAMA ANUAL
  // ==========================================================================
  
  /**
   * Obtiene todos los programas anuales
   */
  async getProgramasAnuales(year?: string): Promise<any> {
    const query = year ? `?year=${year}` : '';
    return client.get<any>(`/programa-anual${query}`);
  }

  /**
   * Obtiene un programa anual por ID
   */
  async getProgramaById(id: string): Promise<AuditoriaProgramada> {
    return client.get<AuditoriaProgramada>(`/programa-anual/${id}`);
  }

  /**
   * Crea un nuevo programa anual
   */
  async createPrograma(data: { year: number; version?: string; creadoPor?: string }): Promise<any> {
    return client.post<any>('/programa-anual', data);
  }

  /**
   * Actualiza un programa anual
   */
  async updatePrograma(id: string, data: Partial<AuditoriaProgramada>): Promise<AuditoriaProgramada> {
    return client.put<AuditoriaProgramada>(`/programa-anual/${id}`, data);
  }

  /**
   * Elimina un programa anual
   */
  async deletePrograma(id: string): Promise<void> {
    return client.delete(`/programa-anual/${id}`);
  }

  /**
   * Importa auditorías a un programa
   */
  async importarAuditorias(programaId: string, data: any): Promise<any> {
    return client.post(`/programa-anual/${programaId}/importar-auditorias`, data);
  }

  /**
   * Obtiene las auditorías de un programa
   */
  async getAuditoriasPrograma(programaId: string): Promise<AuditoriaProgramada[]> {
    return client.get<AuditoriaProgramada[]>(`/programa-anual/${programaId}/auditorias`);
  }

  /**
   * Obtiene el cronograma de un programa
   */
  async getCronograma(programaId: string): Promise<any> {
    return client.get(`/programa-anual/${programaId}/cronograma`);
  }

  /**
   * Amplía el plazo de una auditoría
   */
  async ampliarPlazo(auditoriaId: string, data: any): Promise<any> {
    return client.post(`/programa-anual/auditorias/${auditoriaId}/ampliar-plazo`, data);
  }

  /**
   * Genera el documento oficial de un programa
   */
  async generarDocumentoOficial(programaId: string): Promise<any> {
    return client.get(`/programa-anual/${programaId}/documento-oficial`);
  }
  
  // ==========================================================================
  // HALLAZGOS
  // ==========================================================================
  
  /**
   * Obtiene todos los hallazgos
   */
  async getHallazgos(params?: { categoria?: string; estado?: string; area?: string }): Promise<Hallazgo[]> {
    const queryParams = new URLSearchParams();
    if (params?.categoria) queryParams.append('categoria', params.categoria);
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.area) queryParams.append('area', params.area);
    
    const query = queryParams.toString();
    return client.get<Hallazgo[]>(`/hallazgos${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene un hallazgo por ID
   */
  async getHallazgoById(id: string): Promise<Hallazgo> {
    return client.get<Hallazgo>(`/hallazgos/${id}`);
  }
  
  /**
   * Crea un nuevo hallazgo
   */
  async createHallazgo(data: any): Promise<Hallazgo> {
    return client.post<Hallazgo>('/hallazgos', data);
  }
  
  /**
   * Actualiza un hallazgo
   */
  async updateHallazgo(id: string, data: any): Promise<Hallazgo> {
    return client.put<Hallazgo>(`/hallazgos/${id}`, data);
  }
  
  /**
   * Elimina un hallazgo
   */
  async deleteHallazgo(id: string): Promise<void> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error('ID de hallazgo no válido');
    }
    // Asegurarse de que el ID esté codificado correctamente en la URL
    const encodedId = encodeURIComponent(id.trim());
    return client.delete(`/hallazgos/${encodedId}`);
  }

  /**
   * Obtiene hallazgos críticos
   */
  async getHallazgosCriticos(): Promise<Hallazgo[]> {
    return client.get<Hallazgo[]>('/hallazgos/categoria/criticos');
  }

  /**
   * Obtiene controversias
   */
  async getControversias(): Promise<Hallazgo[]> {
    return client.get<Hallazgo[]>('/hallazgos/categoria/controversias');
  }

  /**
   * Obtiene borradores
   */
  async getBorradores(): Promise<Hallazgo[]> {
    return client.get<Hallazgo[]>('/hallazgos/categoria/borradores');
  }

  /**
   * Obtiene hallazgos por auditoría ID
   */
  async getHallazgosByAuditoria(auditoriaId: string): Promise<Hallazgo[]> {
    return client.get<Hallazgo[]>(`/auditorias/${auditoriaId}/hallazgos`);
  }

  /**
   * Área auditada acepta el hallazgo
   */
  async aceptarHallazgo(hallazgoId: string): Promise<Hallazgo> {
    return client.post<Hallazgo>(`/hallazgos/${hallazgoId}/aceptar`, {});
  }

  /**
   * Área auditada presenta controversia (documento debe subirse antes vía POST /documentos)
   */
  async presentarControversia(
    hallazgoId: string,
    data: { argumentos: string; documentoId: string; documentoNombre: string },
  ): Promise<Hallazgo> {
    return client.post<Hallazgo>(`/hallazgos/${hallazgoId}/controversia`, data);
  }

  /**
   * Auditor toma decisión sobre controversia
   */
  async decisionAuditor(
    hallazgoId: string,
    data: { tipoDecision: 'ratificado' | 'modificado' | 'retirado'; fundamentacionTecnica: string; auditorId?: number },
  ): Promise<Hallazgo> {
    return client.post<Hallazgo>(`/hallazgos/${hallazgoId}/decision-auditor`, data);
  }

  /**
   * Genera informe preliminar y notifica al área (actualiza hallazgos a NOTIFICADO)
   */
  async generarInformePreliminar(auditoriaId: string): Promise<{ generado: boolean; hallazgosNotificados: number; mensaje: string }> {
    return client.post<any>(`/auditorias/${auditoriaId}/informe-preliminar/generar`, {});
  }

  /**
   * Estado del flujo de comunicación para la UI
   */
  async getEstadoComunicacion(auditoriaId: string): Promise<{
    informePreliminarGenerado: boolean;
    informeFinalGenerado?: boolean;
    informeEjecutivoGenerado?: boolean;
    hayControversiasPendientes: boolean;
    puedeGenerarInformeFinal: boolean;
    conteo: { pendiente: number; aceptado: number; enControversia: number };
  }> {
    return client.get<any>(`/auditorias/${auditoriaId}/comunicacion/estado`);
  }

  async generarInformeFinal(auditoriaId: string) {
    return client.post<any>(`/auditorias/${auditoriaId}/informe-final/generar`, {});
  }

  async generarInformeEjecutivo(auditoriaId: string) {
    return client.post<any>(`/auditorias/${auditoriaId}/informe-ejecutivo/generar`, {});
  }
  
  // ==========================================================================
  // TAREAS DE AUDITORÍA
  // ==========================================================================
  
  /**
   * Obtiene todas las tareas con filtros opcionales
   */
  async getTareasAuditoria(params?: { 
    auditoriaId?: string; 
    estado?: string; 
    prioridad?: string;
    fase?: string;
    responsableId?: string;
  }): Promise<TareaAuditoria[]> {
    const queryParams = new URLSearchParams();
    if (params?.auditoriaId) queryParams.append('auditoriaId', params.auditoriaId);
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.prioridad) queryParams.append('prioridad', params.prioridad);
    if (params?.fase) queryParams.append('fase', params.fase);
    if (params?.responsableId) queryParams.append('responsableId', params.responsableId);
    
    const query = queryParams.toString();
    return client.get<TareaAuditoria[]>(`/tareas-auditoria${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene tareas de una auditoría específica
   */
  async getTareasByAuditoria(auditoriaId: string): Promise<TareaAuditoria[]> {
    return client.get<TareaAuditoria[]>(`/tareas-auditoria/auditoria/${auditoriaId}`);
  }

  /**
   * Obtiene una tarea por ID
   */
  async getTareaById(id: string): Promise<TareaAuditoria> {
    return client.get<TareaAuditoria>(`/tareas-auditoria/${id}`);
  }

  /**
   * Crea una nueva tarea
   */
  async createTarea(data: CreateTareaAuditoriaDto): Promise<TareaAuditoria> {
    return client.post<TareaAuditoria>('/tareas-auditoria', data);
  }

  /**
   * Actualiza una tarea
   */
  async updateTarea(id: string, data: UpdateTareaAuditoriaDto): Promise<TareaAuditoria> {
    return client.put<TareaAuditoria>(`/tareas-auditoria/${id}`, data);
  }

  /**
   * Marca una tarea como completada
   */
  async completarTarea(id: string): Promise<TareaAuditoria> {
    return client.patch<TareaAuditoria>(`/tareas-auditoria/${id}/completar`);
  }

  /**
   * Elimina una tarea
   */
  async deleteTarea(id: string): Promise<void> {
    return client.delete(`/tareas-auditoria/${id}`);
  }

  /**
   * Obtiene estadísticas de tareas por auditoría
   */
  async getEstadisticasTareas(auditoriaId: string): Promise<{
    total: number;
    pendientes: number;
    enProgreso: number;
    completadas: number;
    canceladas: number;
    progresoGeneral: number;
  }> {
    return client.get(`/tareas-auditoria/auditoria/${auditoriaId}/estadisticas`);
  }
  
  // ==========================================================================
  // LISTAS DE CHEQUEO
  // ==========================================================================
  
  /**
   * Obtiene todas las listas de chequeo
   */
  async getListasChequeo(params?: { tipo?: string; categoria?: string }): Promise<ListaChequeo[]> {
    const queryParams = new URLSearchParams();
    if (params?.tipo) queryParams.append('tipo', params.tipo);
    if (params?.categoria) queryParams.append('categoria', params.categoria);
    
    const query = queryParams.toString();
    return client.get<ListaChequeo[]>(`/listas-chequeo${query ? `?${query}` : ''}`);
  }
  
  /**
   * Obtiene una lista de chequeo por ID
   */
  async getListaChequeoById(id: string): Promise<ListaChequeo> {
    return client.get<ListaChequeo>(`/listas-chequeo/${id}`);
  }

  /**
   * Crea una nueva lista de chequeo
   */
  async createListaChequeo(data: Partial<ListaChequeo>): Promise<ListaChequeo> {
    return client.post<ListaChequeo>('/listas-chequeo', data);
  }

  /**
   * Actualiza una lista de chequeo
   */
  async updateListaChequeo(id: string, data: Partial<ListaChequeo>): Promise<ListaChequeo> {
    return client.put<ListaChequeo>(`/listas-chequeo/${id}`, data);
  }

  /**
   * Elimina una lista de chequeo
   */
  async deleteListaChequeo(id: string): Promise<void> {
    return client.delete(`/listas-chequeo/${id}`);
  }

  /**
   * Obtiene los items de una lista
   */
  async getItemsLista(id: string): Promise<any[]> {
    return client.get<any[]>(`/listas-chequeo/${id}/items`);
  }

  /**
   * Agrega un item a una lista
   */
  async agregarItemLista(id: string, item: any): Promise<any> {
    return client.post(`/listas-chequeo/${id}/items`, item);
  }

  /**
   * Actualiza un item de una lista (marcar completado/pendiente)
   * @param listaId - ID de la lista de chequeo
   * @param itemId - ID del item a actualizar
   * @param data - Datos a actualizar incluyendo auditoriaId para guardar estado específico
   */
  async actualizarItemLista(listaId: string, itemId: string, data: {
    completado?: boolean;
    responsable?: string;
    fechaCompletado?: string;
    observaciones?: string;
    auditoriaId?: string; // ID de la auditoría para guardar estado específico
  }): Promise<any> {
    return client.patch(`/listas-chequeo/${listaId}/items/${itemId}`, data);
  }

  /**
   * Aplica una lista a una auditoría
   */
  async aplicarLista(data: {
    listaChequeoId: string;
    auditoriaId: string;
    aplicadoPor: string;
    respuestas: Array<{
      itemId: string;
      respuesta: string | number | boolean;
      observaciones?: string;
      evidencias?: string[];
    }>;
  }): Promise<any> {
    return client.post('/listas-chequeo/aplicar', data);
  }

  /**
   * Obtiene las listas aplicadas a una auditoría
   */
  async getListasAplicadas(auditoriaId: string): Promise<any[]> {
    // Validar que sea un UUID válido antes de hacer la llamada
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!auditoriaId || !uuidRegex.test(auditoriaId)) {
      console.warn(`[getListasAplicadas] auditoriaId inválido (no es UUID): ${auditoriaId}`);
      return [];
    }
    return client.get<any[]>(`/listas-chequeo/auditoria/${auditoriaId}`);
  }

  /**
   * Obtiene los resultados de listas aplicadas
   */
  async getResultadosListas(auditoriaId: string): Promise<any> {
    // Validar que sea un UUID válido antes de hacer la llamada
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!auditoriaId || !uuidRegex.test(auditoriaId)) {
      console.warn(`[getResultadosListas] auditoriaId inválido (no es UUID): ${auditoriaId}`);
      return null;
    }
    return client.get(`/listas-chequeo/auditoria/${auditoriaId}/resultados`);
  }
  
  // ==========================================================================
  // PLAN INDIVIDUAL
  // ==========================================================================
  
  /**
   * Obtiene el plan individual de una auditoría
   */
  async getPlanIndividualByAuditoria(auditoriaId: string): Promise<PlanIndividual> {
    return client.get<PlanIndividual>(`/plan-individual/auditoria/${auditoriaId}`);
  }

  /**
   * Obtiene un plan individual por ID
   */
  async getPlanIndividualById(id: string): Promise<PlanIndividual> {
    return client.get<PlanIndividual>(`/plan-individual/${id}`);
  }

  /**
   * Crea un plan individual
   */
  async createPlanIndividual(data: Partial<PlanIndividual>): Promise<PlanIndividual> {
    return client.post<PlanIndividual>('/plan-individual', data);
  }

  /**
   * Actualiza un plan individual
   */
  async updatePlanIndividual(id: string, data: Partial<PlanIndividual>): Promise<PlanIndividual> {
    return client.put<PlanIndividual>(`/plan-individual/${id}`, data);
  }

  // ==========================================================================
  // PLAN ANUAL
  // ==========================================================================
  
  /**
   * Obtiene todos los planes anuales
   */
  async getPlanesAnuales(year?: string): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (year) queryParams.append('year', year);
    const query = queryParams.toString();
    return client.get<any[]>(`/plan-anual-5-roles${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene un plan anual por ID
   */
  async getPlanAnualById(id: string): Promise<any> {
    return client.get<any>(`/plan-anual-5-roles/${id}`);
  }

  /**
   * Borrador del asistente «Nuevo plan» persistido en servidor (por usuario).
   * Permite recuperar el progreso tras cerrar sesión o cambiar de dispositivo.
   */
  async getWizardBorradorPlanAnual(): Promise<{
    payload: Record<string, unknown> | null;
    updatedAt: string | null;
  }> {
    return client.get(`/plan-anual-5-roles/wizard-borrador/me`);
  }

  async saveWizardBorradorPlanAnual(
    payload: Record<string, unknown>,
  ): Promise<{ ok: boolean; savedAt: string }> {
    return client.put(`/plan-anual-5-roles/wizard-borrador/me`, { payload });
  }

  async deleteWizardBorradorPlanAnual(): Promise<void> {
    await client.delete(`/plan-anual-5-roles/wizard-borrador/me`);
  }

  /**
   * Crea un nuevo plan anual
   */
  async createPlanAnual(data: { año: number; responsable?: string; estado?: string }): Promise<any> {
    return client.post<any>('/plan-anual-5-roles', data);
  }

  /**
   * Actualiza un plan anual
   */
  async updatePlanAnual(id: string, data: any): Promise<any> {
    return client.put<any>(`/plan-anual/${id}`, data);
  }

  /**
   * Elimina un plan anual
   */
  async deletePlanAnual(id: string): Promise<any> {
    return client.delete<any>(`/plan-anual/${id}`);
  }

  /**
   * Obtiene el cumplimiento de un plan anual
   */
  async getCompliancePlanAnual(id: string): Promise<any> {
    return client.get(`/plan-anual/${id}/compliance`);
  }

  /**
   * Obtiene los roles de un plan anual
   */
  async getRolesPlanAnual(id: string): Promise<any> {
    return client.get(`/plan-anual-5-roles/${id}/roles`);
  }

  /**
   * Agrega una actividad a un rol del plan anual
   */
  async addActividadPlanAnual(rolId: string, data: {
    nombre: string;
    descripcion?: string;
    responsable: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado?: 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';
    porcentaje_avance?: number;
    observaciones?: string;
    prioridad?: 'Alta' | 'Media' | 'Baja';
  }): Promise<any> {
    return client.post(`/plan-anual-5-roles/${rolId}/actividades`, data);
  }

  /**
   * Actualiza una actividad del plan anual
   */
  async updateActividadPlanAnual(actividadId: string, data: any): Promise<any> {
    return client.put(`/plan-anual-5-roles/actividades/${actividadId}`, data);
  }

  /**
   * Elimina una actividad del plan anual
   */
  async deleteActividadPlanAnual(actividadId: string): Promise<void> {
    return client.delete(`/plan-anual-5-roles/actividades/${actividadId}`);
  }

  /**
   * Obtiene el cronograma de un plan anual
   */
  async getCronogramaPlanAnual(id: string): Promise<any> {
    return client.get(`/plan-anual/${id}/cronograma`);
  }

  /**
   * Agrega una auditoría al cronograma de un plan anual
   */
  async agregarAuditoriaCronograma(id: string, auditoria: any): Promise<any> {
    return client.post(`/plan-anual/${id}/cronograma`, auditoria);
  }

  /**
   * Asigna un equipo a una auditoría del cronograma
   */
  async asignarEquipoAuditoria(id: string, auditoriaId: string, equipo: any): Promise<any> {
    return client.put(`/plan-anual/${id}/auditorias/${auditoriaId}/equipo`, equipo);
  }

  /**
   * Actualiza un rol de un plan anual
   */
  async actualizarRolPlanAnual(id: string, rolId: string, datosRol: any): Promise<any> {
    return client.put(`/plan-anual-5-roles/${id}/roles/${rolId}`, datosRol);
  }

  // ==========================================================================
  // VINCULACIÓN: AUDITORÍAS ↔ ROL 4 (EVALUACIÓN Y SEGUIMIENTO)
  // ==========================================================================

  /**
   * Obtiene el cumplimiento del programa de auditorías para un año
   */
  async getCumplimientoAuditorias(año: number): Promise<{
    totalProgramadas: number;
    totalFinalizadas: number;
    porcentajeCumplimiento: number;
    desglosePorTipo: Record<string, { programadas: number; finalizadas: number; en_proceso: number; pendientes: number }>;
    actividadId?: string;
  }> {
    return client.get(`/plan-anual-5-roles/auditorias/cumplimiento/${año}`);
  }

  /**
   * Configura una actividad para cálculo automático de auditorías
   */
  async configurarActividadAuditorias(actividadId: string, año: number): Promise<any> {
    return client.post('/plan-anual-5-roles/auditorias/configurar', { actividadId, año });
  }

  /**
   * Obtiene las auditorías vinculadas a una actividad
   */
  async getAuditoriasVinculadas(actividadId: string): Promise<{
    total: number;
    auditorias: Array<{
      id: string;
      codigo: string;
      nombre: string;
      tipo: string;
      estadoKanban: string;
      progreso: number;
      fechaInicio: Date;
      fechaFin: Date;
    }>;
  }> {
    return client.get(`/plan-anual-5-roles/actividades/${actividadId}/auditorias`);
  }

  /**
   * Recalcula manualmente el cumplimiento de auditorías para un año
   */
  async recalcularCumplimientoAuditorias(año: number): Promise<{
    success: boolean;
    actividadActualizada?: string;
    cumplimiento: {
      totalProgramadas: number;
      totalFinalizadas: number;
      porcentajeCumplimiento: number;
    };
  }> {
    return client.post(`/plan-anual-5-roles/auditorias/recalcular/${año}`, {});
  }

  // ==========================================================================
  // PLANES DE MEJORAMIENTO
  // ==========================================================================
  
  /**
   * Obtiene todos los planes de mejoramiento
   */
  async getPlanesMejoramiento(params?: { estado?: string; area?: string }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.area) queryParams.append('area', params.area);
    const query = queryParams.toString();
    return client.get<any[]>(`/planes-mejoramiento${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene un plan de mejoramiento por ID
   */
  async getPlanMejoramientoById(id: string): Promise<any> {
    return client.get<any>(`/planes-mejoramiento/${id}`);
  }

  /**
   * Obtiene los eventos del timeline (historial) de un plan de mejoramiento
   */
  async getEventosTimelinePlan(planId: string): Promise<any[]> {
    try {
      const response = await client.get<{ success: boolean; eventos: any[] }>(`/planes-mejoramiento/${planId}/eventos`);
      return response.eventos || [];
    } catch (error) {
      console.error('[controlInternoService.getEventosTimelinePlan] Error:', error);
      return [];
    }
  }

  /**
   * Obtiene el plan de mejoramiento de un hallazgo
   */
  async getPlanMejoramientoByHallazgo(hallazgoId: string): Promise<any> {
    return client.get<any>(`/planes-mejoramiento/hallazgo/${hallazgoId}`);
  }

  /**
   * Obtiene los planes de mejoramiento de una auditoría (para verificación OCI / Cierre)
   */
  async getPlanesMejoramientoByAuditoria(auditoriaId: string): Promise<any[]> {
    return client.get<any[]>(`/planes-mejoramiento/auditoria/${auditoriaId}`);
  }

  /**
   * Registra la verificación OCI de una acción (Cierre - Sección 1). Inmutable tras registrar.
   */
  async registrarVerificacionOci(
    planId: string,
    accionId: string,
    dto: { estadoVerificacionOci: 'cumplida' | 'parcial' | 'incumplida'; evidenciaVerificada: string; observacionOci?: string },
  ): Promise<any> {
    return client.patch<any>(`/planes-mejoramiento/${planId}/acciones/${accionId}/verificacion-oci`, dto);
  }

  /**
   * Resumen ejecutivo para el Informe de Cierre
   */
  async getResumenEjecutivoCierre(auditoriaId: string): Promise<any> {
    return client.get<any>(`/auditorias/${auditoriaId}/resumen-ejecutivo-cierre`);
  }

  /**
   * Guarda borrador del Informe de Cierre (lecciones y recomendaciones)
   */
  async updateInformeCierre(
    auditoriaId: string,
    dto: { leccionesAprendidas?: string; recomendacionesFuturasAuditorias?: string },
  ): Promise<any> {
    return client.patch<any>(`/auditorias/${auditoriaId}/informe-cierre`, dto);
  }

  /**
   * Aprueba el Informe de Cierre (Jefe OCI). Auditoría pasa a Finalizada.
   */
  async aprobarInformeCierre(auditoriaId: string, body?: { aprobadoPor?: string; aprobadoPorId?: number }): Promise<any> {
    return client.post<any>(`/auditorias/${auditoriaId}/aprobar-informe-cierre`, body || {});
  }

  /**
   * Crea un nuevo plan de mejoramiento
   */
  async createPlanMejoramiento(data: any): Promise<any> {
    return client.post<any>('/planes-mejoramiento', data);
  }

  /**
   * Actualiza un plan de mejoramiento
   */
  async updatePlanMejoramiento(id: string, data: any): Promise<any> {
    return client.put<any>(`/planes-mejoramiento/${id}`, data);
  }

  /**
   * Aprobar un plan de mejoramiento
   */
  async aprobarPlanMejoramiento(id: string, observaciones?: string): Promise<any> {
    return client.post<any>(`/planes-mejoramiento/${id}/aprobar`, { observaciones });
  }

  /**
   * Rechazar un plan de mejoramiento
   */
  async rechazarPlanMejoramiento(id: string, motivo: string): Promise<any> {
    return client.post<any>(`/planes-mejoramiento/${id}/rechazar`, { motivo_rechazo: motivo });
  }

  /**
   * Crear una acción en un plan de mejoramiento
   */
  async crearAccionPlanMejoramiento(planId: string, accion: any): Promise<any> {
    return client.post<any>(`/planes-mejoramiento/${planId}/acciones`, accion);
  }

  /**
   * Actualizar una acción de un plan de mejoramiento
   */
  async actualizarAccionPlanMejoramiento(planId: string, accionId: string, data: any): Promise<any> {
    return client.put<any>(`/planes-mejoramiento/${planId}/acciones/${accionId}`, data);
  }

  /**
   * Eliminar una acción de un plan de mejoramiento
   */
  async eliminarAccionPlanMejoramiento(planId: string, accionId: string): Promise<void> {
    return client.delete(`/planes-mejoramiento/${planId}/acciones/${accionId}`);
  }

  // ==========================================================================
  // DOCUMENTOS DE PLAN DE MEJORAMIENTO (Por Acción)
  // ==========================================================================

  /**
   * Subir documento/evidencia para una acción correctiva específica
   * Usa el campo JSONB 'evidencias' de la entidad AccionCorrectiva
   */
  async subirDocumentoAccion(
    planId: string,
    accionId: string,
    archivo: File,
    metadata: {
      nombre?: string;
      descripcion?: string;
      tipoDocumento?: string;
      subidoPor: string;
      subidoPorId?: number;
    },
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', archivo);
    if (metadata.descripcion) formData.append('descripcion', metadata.descripcion);
    formData.append('subidoPor', metadata.subidoPor);

    // Usar endpoint de evidencias JSONB en AccionCorrectiva
    return client.upload<any>(`/planes-mejoramiento/${planId}/acciones/${accionId}/evidencias/upload`, formData, onProgress);
  }

  /**
   * Obtener evidencias/documentos de una acción correctiva (desde JSONB)
   */
  async getDocumentosAccion(planId: string, accionId: string): Promise<any[]> {
    // Obtener el plan y extraer las evidencias de la acción
    const plan = await this.getPlanMejoramiento(planId);
    const accion = plan?.acciones?.find((a: any) => a.id === accionId);
    return accion?.evidencias || [];
  }

  /**
   * Obtener todos los documentos del plan agrupados por acción
   */
  async getDocumentosPlanAgrupados(planId: string): Promise<{
    documentosGenerales: any[];
    documentosPorAccion: { accionId: string; documentos: any[] }[];
  }> {
    return client.get<any>(`/planes-mejoramiento/${planId}/documentos/agrupados`);
  }

  /**
   * Validar documento de una acción (auditor)
   */
  async validarDocumentoAccion(
    planId: string,
    documentoId: string,
    data: {
      estadoValidacion: 'ACEPTADA' | 'CON_OBSERVACIONES' | 'RECHAZADA';
      validadoPor: string;
      comentariosAuditor?: string;
      solicitaNuevaEvidencia?: boolean;
    }
  ): Promise<any> {
    return client.post<any>(`/planes-mejoramiento/${planId}/documentos/${documentoId}/validar`, data);
  }

  /**
   * Descargar documento
   */
  async descargarDocumentoAccion(planId: string, documentoId: string): Promise<Blob> {
    const url = `${CONTROL_INTERNO_BASE_URL}${SERVICE_PREFIX}/planes-mejoramiento/${planId}/documentos/${documentoId}/descargar`;
    const response = await fetch(url, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Error al descargar documento: ${response.status}`);
    }
    
    return response.blob();
  }

  /**
   * Cargar evidencia en una acción (metadata, sin archivo)
   * @deprecated Usar subirDocumentoAccion en su lugar
   */
  async cargarEvidenciaAccion(planId: string, accionId: string, evidencia: any): Promise<any> {
    return client.post<any>(`/planes-mejoramiento/${planId}/acciones/${accionId}/evidencias`, evidencia);
  }

  /**
   * Validar evidencia de una acción
   */
  async validarEvidenciaAccion(planId: string, accionId: string, evidenciaId: string, data: any): Promise<any> {
    return client.post<any>(`/planes-mejoramiento/${planId}/acciones/${accionId}/evidencias/${evidenciaId}/validar`, data);
  }

  /**
   * Registrar avance de un plan de mejoramiento
   */
  async registrarAvancePlanMejoramiento(planId: string, data: any): Promise<any> {
    return client.post<any>(`/planes-mejoramiento/${planId}/avance`, data);
  }

  /**
   * Obtener seguimiento de un plan de mejoramiento
   */
  async getSeguimientoPlanMejoramiento(planId: string): Promise<any> {
    return client.get<any>(`/planes-mejoramiento/${planId}/seguimiento`);
  }

  /**
   * Obtener semáforo de cumplimiento de un plan
   */
  async getSemaforoPlanMejoramiento(planId: string): Promise<any> {
    return client.get<any>(`/planes-mejoramiento/${planId}/semaforo`);
  }

  /**
   * Crear un registro de seguimiento para una acción
   */
  async createRegistroSeguimiento(planId: string, seguimientoId: string, data: any): Promise<any> {
    return client.post<any>(`/planes-mejoramiento/${planId}/seguimientos/${seguimientoId}/registros`, data);
  }

  // ==========================================================================
  // APROBACIONES
  // ==========================================================================
  
  /**
   * Obtiene todas las aprobaciones
   */
  async getAprobaciones(params?: { estado?: string }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.append('estado', params.estado);
    const query = queryParams.toString();
    return client.get<any[]>(`/aprobaciones${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene aprobaciones pendientes
   */
  async getAprobacionesPendientes(): Promise<any[]> {
    return client.get<any[]>('/aprobaciones/pendientes');
  }

  /**
   * Obtiene una aprobación por ID
   */
  async getAprobacionById(id: string): Promise<any> {
    return client.get<any>(`/aprobaciones/${id}`);
  }

  /**
   * Aprueba una solicitud
   */
  async aprobar(id: string, data: { observaciones?: string }): Promise<any> {
    return client.post<any>(`/aprobaciones/${id}/aprobar`, data);
  }

  /**
   * Rechaza una solicitud
   */
  async rechazar(id: string, data: { motivo: string }): Promise<any> {
    return client.post<any>(`/aprobaciones/${id}/rechazar`, { motivo_rechazo: data.motivo });
  }

  /**
   * Obtiene estadísticas de aprobaciones
   */
  async getAprobacionesEstadisticas(): Promise<any> {
    return client.get<any>('/aprobaciones/estadisticas');
  }

  /**
   * Crea una nueva aprobación
   */
  async createAprobacion(data: any): Promise<any> {
    return client.post<any>('/aprobaciones', data);
  }

  /**
   * Actualiza una aprobación
   */
  async updateAprobacion(id: string, data: any): Promise<any> {
    return client.put<any>(`/aprobaciones/${id}`, data);
  }

  /**
   * Elimina una aprobación
   */
  async deleteAprobacion(id: string): Promise<void> {
    return client.delete(`/aprobaciones/${id}`);
  }

  // ==========================================================================
  // INFORMES LEY
  // ==========================================================================
  
  /**
   * Obtiene todos los informes
   */
  async getInformes(params?: { estado?: string }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.estado) queryParams.append('estado', params.estado);
    const query = queryParams.toString();
    return client.get<any[]>(`/informes${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene informes de ley
   */
  async getInformesLey(): Promise<any[]> {
    return client.get<any[]>('/informes/ley');
  }

  /**
   * Obtiene informes próximos a vencer
   */
  async getInformesProximosAVencer(): Promise<any[]> {
    return client.get<any[]>('/informes/ley/proximos-vencer');
  }

  /**
   * Obtiene un informe por ID
   */
  async getInformeById(id: string): Promise<any> {
    return client.get<any>(`/informes/${id}`);
  }

  // ==========================================================================
  // DOCUMENTOS
  // ==========================================================================
  
  /**
   * Obtiene todos los documentos
   */
  async getDocumentos(params?: { auditoriaId?: string; etapa?: string; tipo?: string; tipoDocumento?: string }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.auditoriaId) queryParams.append('auditoriaId', params.auditoriaId);
    if (params?.etapa) queryParams.append('etapa', params.etapa);
    const tipo = params?.tipoDocumento || params?.tipo;
    if (tipo) queryParams.append('tipoDocumento', tipo);
    const query = queryParams.toString();
    return client.get<any[]>(`/documentos${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene documentos de una auditoría
   */
  async getDocumentosByAuditoria(auditoriaId: string): Promise<any[]> {
    return client.get<any[]>(`/documentos/auditoria/${auditoriaId}`);
  }

  /**
   * Obtiene documentos por etapa
   */
  async getDocumentosByEtapa(auditoriaId: string, etapa: string): Promise<any[]> {
    return client.get<any[]>(`/documentos/auditoria/${auditoriaId}/etapa/${etapa}`);
  }

  /**
   * Plantillas de biblioteca requeridas para una auditoría en una etapa (solo aplicables a esa auditoría).
   * Usar para validar cantidad de documentos a subir en planeación.
   */
  async getPlantillasRequeridas(etapa: string, auditoriaId: string): Promise<any[]> {
    return client.get<any[]>(`/documentos/plantillas-requeridas?etapa=${encodeURIComponent(etapa)}&auditoriaId=${encodeURIComponent(auditoriaId)}`);
  }

  /**
   * Obtiene un documento por ID
   */
  async getDocumentoById(id: string): Promise<any> {
    return client.get<any>(`/documentos/${id}`);
  }

  /**
   * Crea un documento (sube archivo)
   */
  async createDocumento(
    file: File,
    metadata: {
      nombre: string;
      descripcion?: string;
      tipoDocumento: string;
      etapa?: string;
      /** ID de la etapa en etapa_kanban (estable si cambia el nombre) */
      etapaKanbanId?: string;
      /** Nombre de la etapa al momento de guardar (snapshot) */
      etapaNombreKanban?: string;
      auditoriaId?: string;
      hallazgoId?: string;
      planMejoramientoId?: string;
      documentoBibliotecaId?: string;
      visibleAuditoriaId?: string;
      subidoPor?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nombre', metadata.nombre);
    if (metadata.descripcion) formData.append('descripcion', metadata.descripcion);
    formData.append('tipoDocumento', metadata.tipoDocumento);
    if (metadata.etapa) formData.append('etapa', metadata.etapa);
    if (metadata.etapaKanbanId) formData.append('etapaKanbanId', metadata.etapaKanbanId);
    if (metadata.etapaNombreKanban) formData.append('etapaNombreKanban', metadata.etapaNombreKanban);
    if (metadata.auditoriaId) formData.append('auditoriaId', metadata.auditoriaId);
    if (metadata.hallazgoId) formData.append('hallazgoId', metadata.hallazgoId);
    if (metadata.planMejoramientoId) formData.append('planMejoramientoId', metadata.planMejoramientoId);
    if (metadata.documentoBibliotecaId) formData.append('documentoBibliotecaId', metadata.documentoBibliotecaId);
    if (metadata.visibleAuditoriaId) formData.append('visibleAuditoriaId', metadata.visibleAuditoriaId);
    if (metadata.subidoPor) formData.append('subidoPor', metadata.subidoPor);

    return client.upload<any>('/documentos', formData, onProgress);
  }

  /**
   * Actualiza un documento
   */
  async updateDocumento(id: string, data: any): Promise<any> {
    return client.put<any>(`/documentos/${id}`, data);
  }

  /**
   * Elimina un documento
   */
  async deleteDocumento(id: string): Promise<void> {
    return client.delete(`/documentos/${id}`);
  }

  /**
   * Obtiene versiones de un documento
   */
  async getVersionesDocumento(id: string): Promise<any[]> {
    return client.get<any[]>(`/documentos/${id}/versiones`);
  }

  /**
   * Crea una nueva versión de un documento
   */
  async crearVersionDocumento(id: string, data: any): Promise<any> {
    return client.post<any>(`/documentos/${id}/version`, data);
  }

  // ==========================================================================
  // EVIDENCIAS/DOCUMENTOS (Sistema Independiente)
  // ==========================================================================

  /**
   * Crea una evidencia/documento (sube archivo)
   */
  async createEvidencia(
    file: File,
    metadata: {
      nombre: string;
      descripcion?: string;
      tipoDocumento: 'evidencia_hallazgo' | 'evidencia_accion' | 'evidencia_plan' | 'documento_plan' | 'certificado' | 'acta' | 'informe' | 'otro';
      hallazgoId?: string;
      accionCorrectivaId?: string;
      planMejoramientoId?: string;
      auditoriaId?: string;
      subidoPor?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nombre', metadata.nombre);
    if (metadata.descripcion) formData.append('descripcion', metadata.descripcion);
    formData.append('tipoDocumento', metadata.tipoDocumento);
    if (metadata.hallazgoId) formData.append('hallazgoId', metadata.hallazgoId);
    if (metadata.accionCorrectivaId) formData.append('accionCorrectivaId', metadata.accionCorrectivaId);
    if (metadata.planMejoramientoId) formData.append('planMejoramientoId', metadata.planMejoramientoId);
    if (metadata.auditoriaId) formData.append('auditoriaId', metadata.auditoriaId);
    if (metadata.subidoPor) formData.append('subidoPor', metadata.subidoPor);

    return client.upload<any>('/evidencias', formData, onProgress);
  }

  /**
   * Obtiene evidencias por acción correctiva
   */
  async getEvidenciasByAccion(accionId: string): Promise<any[]> {
    return client.get<any[]>(`/evidencias/accion/${accionId}`);
  }

  /**
   * Obtiene evidencias por hallazgo
   */
  async getEvidenciasByHallazgo(hallazgoId: string): Promise<any[]> {
    return client.get<any[]>(`/evidencias/hallazgo/${hallazgoId}`);
  }

  /**
   * Obtiene evidencias por plan de mejoramiento
   */
  async getEvidenciasByPlan(planId: string): Promise<any[]> {
    return client.get<any[]>(`/evidencias/plan/${planId}`);
  }

  /**
   * Obtiene evidencias por auditoría
   */
  async getEvidenciasByAuditoria(auditoriaId: string): Promise<any[]> {
    return client.get<any[]>(`/evidencias/auditoria/${auditoriaId}`);
  }

  /**
   * Obtiene una evidencia por ID
   */
  async getEvidenciaById(id: string): Promise<any> {
    return client.get<any>(`/evidencias/${id}`);
  }

  /**
   * Descarga una evidencia
   */
  async downloadEvidencia(id: string): Promise<Blob> {
    const url = `${CONTROL_INTERNO_BASE_URL}${SERVICE_PREFIX}/evidencias/${id}/download`;
    const response = await fetch(url, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Error al descargar: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Valida una evidencia (US-032)
   */
  async validarEvidencia(
    id: string,
    estadoValidacion: 'pendiente' | 'aceptado' | 'rechazado' | 'con_observaciones',
    observaciones?: string
  ): Promise<any> {
    return client.post<any>(`/evidencias/${id}/validar`, {
      estadoValidacion,
      observacionesValidacion: observaciones,
    });
  }

  /**
   * Elimina una evidencia
   */
  async deleteEvidencia(id: string): Promise<void> {
    return client.delete(`/evidencias/${id}`);
  }

  // ==========================================================================
  // ETAPAS DE AUDITORÍA
  // ==========================================================================
  
  /**
   * Obtiene las etapas de una auditoría
   */
  async getEtapasAuditoria(auditoriaId: string): Promise<any> {
    return client.get<any>(`/etapas-auditoria/auditoria/${auditoriaId}`);
  }

  /**
   * Obtiene una etapa específica de una auditoría
   */
  async getEtapaAuditoria(auditoriaId: string, etapa: 'planeacion' | 'ejecucion' | 'comunicacion'): Promise<any> {
    return client.get<any>(`/etapas-auditoria/auditoria/${auditoriaId}/etapa/${etapa}`);
  }

  // Planeación
  async iniciarPlaneacion(auditoriaId: string, data: any): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/planeacion/iniciar`, data);
  }

  async generarOficioAnuncio(auditoriaId: string): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/planeacion/generar-oficio`);
  }

  async generarCartas(auditoriaId: string): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/planeacion/generar-cartas`);
  }

  async solicitarInformacion(auditoriaId: string, data: any): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/planeacion/solicitar-informacion`, data);
  }

  async completarPlaneacion(auditoriaId: string): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/planeacion/completar`);
  }

  // Ejecución
  async iniciarEjecucion(auditoriaId: string, data: any): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/ejecucion/iniciar`, data);
  }

  async getReunionApertura(auditoriaId: string): Promise<any> {
    return client.get<any>(`/etapas-auditoria/auditoria/${auditoriaId}/ejecucion/reunion-apertura`);
  }

  async getReunionCierre(auditoriaId: string): Promise<any> {
    return client.get<any>(`/etapas-auditoria/auditoria/${auditoriaId}/ejecucion/reunion-cierre`);
  }

  async registrarReunionApertura(auditoriaId: string, data: any): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/ejecucion/reunion-apertura`, data);
  }

  async registrarReunionCierre(auditoriaId: string, data: any): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/ejecucion/reunion-cierre`, data);
  }

  async presentarHallazgosPreliminares(auditoriaId: string): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/ejecucion/presentar-hallazgos-preliminares`);
  }

  async completarEjecucion(auditoriaId: string): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/ejecucion/completar`);
  }

  // Comunicación - generarInformeFinal y generarInformeEjecutivo usan /auditorias/ (ver métodos arriba)
  async iniciarComunicacion(auditoriaId: string, data: any): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/comunicacion/iniciar`, data);
  }

  async completarComunicacion(auditoriaId: string): Promise<any> {
    return client.post<any>(`/etapas-auditoria/auditoria/${auditoriaId}/comunicacion/completar`);
  }

  // ==========================================================================
  // AUDITORÍAS (Gestión de Auditorías)
  // ==========================================================================
  
  /**
   * Obtiene todas las auditorías con filtros opcionales
   */
  async getAuditorias(filters?: {
    tipo?: string;
    fase?: string;
    prioridad?: string;
    territorial?: string;
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    planAnualId?: string;
    planAnualVigencia?: number;
    year?: number;
    light?: boolean;
    activasOnly?: boolean;
    vinculadaPlanAnual?: boolean;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (filters?.tipo) queryParams.append('tipo', filters.tipo);
    if (filters?.fase) queryParams.append('fase', filters.fase);
    if (filters?.prioridad) queryParams.append('prioridad', filters.prioridad);
    if (filters?.territorial) queryParams.append('territorial', filters.territorial);
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.fechaDesde) queryParams.append('fechaDesde', filters.fechaDesde);
    if (filters?.fechaHasta) queryParams.append('fechaHasta', filters.fechaHasta);
    if (filters?.planAnualId) queryParams.append('planAnualId', filters.planAnualId);
    // if (filters?.planAnualVigencia != null) {
    //   queryParams.append('planAnualVigencia', String(filters.planAnualVigencia));
    // }
    if (filters?.year != null) queryParams.append('year', String(filters.year));
    if (filters?.light !== false) queryParams.append('light', 'true');
    if (filters?.activasOnly !== false) queryParams.append('activasOnly', 'true');
    if (filters?.vinculadaPlanAnual) queryParams.append('vinculadaPlanAnual', 'true');
    
    const query = queryParams.toString();
    return client.get<any[]>(`/auditorias${query ? `?${query}` : ''}`);
  }

  /**
   * Obtiene una auditoría por ID
   */
  async getAuditoriaById(id: string): Promise<any> {
    return client.get<any>(`/auditorias/${id}`);
  }

  /**
   * Obtiene una auditoría por código
   */
  async getAuditoriaByCodigo(codigo: string): Promise<any> {
    return client.get<any>(`/auditorias/codigo/${codigo}`);
  }

  /**
   * Crea una nueva auditoría
   */
  async createAuditoria(data: any): Promise<any> {
    return client.post<any>('/auditorias', data);
  }

  /**
   * Actualiza una auditoría
   */
  async updateAuditoria(id: string, data: any): Promise<any> {
    return client.patch<any>(`/auditorias/${id}`, data);
  }

  /**
   * Elimina una auditoría
   */
  async deleteAuditoria(id: string): Promise<void> {
    return client.delete(`/auditorias/${id}`);
  }

  /**
   * Actualiza el progreso de una auditoría
   */
  async updateProgresoAuditoria(id: string, progreso: number): Promise<any> {
    return client.patch<any>(`/auditorias/${id}/progreso`, { progreso });
  }

  /**
   * Actualiza la fase de una auditoría
   */
  async updateFaseAuditoria(id: string, fase: string): Promise<any> {
    return client.patch<any>(`/auditorias/${id}/fase`, { fase });
  }

  /**
   * Actualiza el estado Kanban de una auditoría (para drag & drop)
   * Soporta todos los estados: 'Plan Anual', 'Planeación', 'Ejecución', 'Comunicación', 'Seguimiento', 'Finalizada'
   */
  async updateEstadoKanbanAuditoria(id: string, estadoKanban: string): Promise<any> {
    return client.patch<any>(`/auditorias/${id}/estado-kanban`, { estadoKanban });
  }

  /**
   * Obtiene auditorías por fase
   */
  async getAuditoriasByFase(fase: string): Promise<any[]> {
    return client.get<any[]>(`/auditorias/fase/${fase}`);
  }

  /**
   * Incrementa el contador de hallazgos de una auditoría
   */
  async incrementarHallazgosAuditoria(id: string): Promise<any> {
    return client.post<any>(`/auditorias/${id}/hallazgos/incrementar`);
  }

  /**
   * Decrementa el contador de hallazgos de una auditoría
   */
  async decrementarHallazgosAuditoria(id: string): Promise<any> {
    return client.post<any>(`/auditorias/${id}/hallazgos/decrementar`);
  }

  /**
   * Obtiene estadísticas de auditorías
   */
  async getEstadisticasAuditorias(): Promise<{
    totalAuditorias: number;
    enCurso: number;
    completadas: number;
    hallazgosTotal: number;
    porFase: { fase: string; cantidad: number }[];
    porTipo: { tipo: string; cantidad: number }[];
    porPrioridad: { prioridad: string; cantidad: number }[];
  }> {
    return client.get('/auditorias/estadisticas');
  }

  /**
   * Obtiene todas las auditorías para el Kanban con todas las relaciones
   */
  async getAuditoriasKanban(): Promise<any[]> {
    return client.get<any[]>('/auditorias/kanban/all');
  }

  // ==========================================================================
  // NOTAS DE AUDITORÍA
  // ==========================================================================

  /**
   * Obtiene todas las notas de una auditoría
   */
  async getNotasAuditoria(auditoriaId: string): Promise<any[]> {
    return client.get<any[]>(`/auditorias/${auditoriaId}/notas`);
  }

  /**
   * Crea una nueva nota para una auditoría
   * Categorías válidas: General, Hallazgo, Seguimiento, Evidencia, Recomendación, Observación
   */
  async createNotaAuditoria(auditoriaId: string, data: {
    contenido: string;
    categoria?: 'General' | 'Hallazgo' | 'Seguimiento' | 'Evidencia' | 'Recomendación' | 'Observación';
    esImportante?: boolean;
    usuarioId?: string;
    usuarioNombre?: string;
  }): Promise<any> {
    return client.post<any>(`/auditorias/${auditoriaId}/notas`, data);
  }

  /**
   * Actualiza una nota existente
   */
  async updateNotaAuditoria(auditoriaId: string, notaId: string, data: {
    contenido?: string;
    categoria?: 'General' | 'Hallazgo' | 'Seguimiento' | 'Evidencia' | 'Recomendación' | 'Observación';
    esImportante?: boolean;
  }): Promise<any> {
    return client.patch<any>(`/auditorias/${auditoriaId}/notas/${notaId}`, data);
  }

  /**
   * Elimina una nota (soft delete)
   */
  async deleteNotaAuditoria(auditoriaId: string, notaId: string): Promise<void> {
    return client.delete(`/auditorias/${auditoriaId}/notas/${notaId}`);
  }

  /**
   * Marca o desmarca una nota como importante
   */
  async toggleImportanteNota(auditoriaId: string, notaId: string): Promise<any> {
    return client.patch<any>(`/auditorias/${auditoriaId}/notas/${notaId}/importante`);
  }

  // ==========================================================================
  // HISTORIAL / TRAZABILIDAD DE AUDITORÍA
  // ==========================================================================

  /**
   * Obtiene el historial completo de cambios de una auditoría
   */
  async getHistorialAuditoria(auditoriaId: string): Promise<any[]> {
    return client.get<any[]>(`/auditorias/${auditoriaId}/historial`);
  }

  // ==========================================================================
  // APROBACIÓN DE AUDITORÍAS
  // ==========================================================================

  /**
   * Aprueba una auditoría
   */
  async aprobarAuditoria(id: string, data?: {
    comentarios?: string;
    usuarioId?: number;
    usuarioNombre?: string;
  }): Promise<any> {
    return client.post<any>(`/auditorias/${id}/aprobar`, data || {});
  }

  /**
   * Rechaza una auditoría
   */
  async rechazarAuditoria(id: string, justificacion: string): Promise<any> {
    return client.post<any>(`/auditorias/${id}/rechazar`, { justificacion });
  }

  /**
   * Finaliza una auditoría con documento de cierre
   */
  async finalizarAuditoria(
    id: string, 
    archivo: File, 
    observaciones: string,
    finalizadaPor: string,
    finalizadaPorId: number
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('observaciones', observaciones);
    formData.append('finalizadaPor', finalizadaPor);
    formData.append('finalizadaPorId', finalizadaPorId.toString());

    // Usar client.upload que maneja baseURL + servicePrefix automáticamente
    // -> directo: http://localhost:3007/auditorias/:id/finalizar
    // -> gateway: http://host/services/control-institucional/api/v1/auditorias/:id/finalizar
    return client.upload<any>(`/auditorias/${id}/finalizar`, formData);
  }

  /**
   * Solicita modificación de una auditoría
   */
  async solicitarModificacionAuditoria(id: string, observaciones: string): Promise<any> {
    return client.post<any>(`/auditorias/${id}/modificacion`, { observaciones });
  }

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================
  
  /**
   * Obtiene datos del dashboard
   * Nota: Este endpoint puede no existir aún, usar datos consolidados
   */
  async getDashboard(): Promise<any> {
    // Si el endpoint existe, usarlo. Si no, consolidar datos de otros servicios
    try {
      return await client.get('/dashboard');
    } catch {
      // Si no existe, retornar estructura vacía para que el componente maneje
      return {
        estadisticas: {},
        alertas: [],
        actividadesRecientes: [],
      };
    }
  }

  // ==========================================================================
  // NOTIFICACIONES - CONFIGURACIÓN
  // ==========================================================================

  /**
   * Obtiene las preferencias de notificación de un usuario
   */
  async getPreferenciasNotificacion(usuarioId: string): Promise<any> {
    return client.get(`/notificaciones/preferencias/${usuarioId}`);
  }

  /**
   * Actualiza las preferencias de notificación de un usuario
   */
  async updatePreferenciasNotificacion(usuarioId: string, preferencias: any): Promise<any> {
    return client.put(`/notificaciones/preferencias/${usuarioId}`, preferencias);
  }

  /**
   * Obtiene todas las notificaciones de un usuario
   */
  async getNotificacionesUsuario(usuarioId: string, filtros?: {
    estado?: string;
    tipo?: string;
    leida?: boolean;
    prioridad?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.leida !== undefined) params.append('leida', String(filtros.leida));
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);
    
    const queryString = params.toString();
    return client.get(`/notificaciones/usuario/${usuarioId}${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Obtiene el conteo de notificaciones no leídas
   */
  async getConteoNotificacionesNoLeidas(usuarioId: string): Promise<{ count: number }> {
    return client.get(`/notificaciones/usuario/${usuarioId}/conteo`);
  }

  /**
   * Marca una notificación como leída
   */
  async marcarNotificacionLeida(notificacionId: string, usuarioId: string): Promise<any> {
    return client.put(`/notificaciones/${notificacionId}/leida`, { usuarioId });
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async marcarTodasNotificacionesLeidas(usuarioId: string): Promise<any> {
    return client.put(`/notificaciones/usuario/${usuarioId}/todas-leidas`, {});
  }

  /**
   * Crea una nueva notificación personalizada
   */
  async crearNotificacion(data: {
    usuarioId: string;
    titulo: string;
    mensaje: string;
    tipo?: string;
    prioridad?: string;
    canal?: string;
    accion?: { texto: string; url: string };
  }): Promise<any> {
    return client.post('/notificaciones', data);
  }

  /**
   * Obtiene todas las notificaciones (admin)
   */
  async getTodasNotificaciones(filtros?: {
    estado?: string;
    tipo?: string;
    leida?: boolean;
    prioridad?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.leida !== undefined) params.append('leida', String(filtros.leida));
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);
    
    const queryString = params.toString();
    return client.get(`/notificaciones/todas${queryString ? `?${queryString}` : ''}`);
  }

  /**
   * Ejecuta el job de notificaciones automáticas (admin/testing)
   */
  async ejecutarJobNotificaciones(): Promise<any> {
    return client.post('/notificaciones/ejecutar-job-automatico', {});
  }
}

// Singleton instance
export const controlInternoService = new ControlInternoService();
export default controlInternoService;
