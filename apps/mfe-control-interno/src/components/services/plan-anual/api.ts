/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API SERVICE - PLAN ANUAL DE AUDITORÍA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Capa de abstracción para comunicación con el backend.
 * Todos los endpoints del módulo plan-anual-5-roles.
 * 
 * Endpoints Backend:
 * - GET    /plan-anual-5-roles
 * - GET    /plan-anual-5-roles/:id
 * - GET    /plan-anual-5-roles/year/:year
 * - POST   /plan-anual-5-roles
 * - PUT    /plan-anual-5-roles/:id
 * - GET    /plan-anual-5-roles/:planId/roles
 * - POST   /plan-anual-5-roles/:rolId/actividades
 * - PUT    /plan-anual-5-roles/actividades/:actividadId
 * - DELETE /plan-anual-5-roles/actividades/:actividadId
 */

import {
  PlanAnual,
  Rol,
  Actividad,
  Auditor,
  EstadisticasPlan,
  CreatePlanAnualDto,
  UpdatePlanAnualDto,
  UpdateRolPlanAnualDto,
  CreateActividadDto,
  UpdateActividadDto,
  ApiResponse,
  FiltrosPlanAnual,
} from './types';
import { getServiceUrl, API_MODE, getDefaultHeaders } from '../../../../../config/environment';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// URL base del servicio de Control Interno (puerto 3007)
const BASE_URL = getServiceUrl('control-institucional');
// En modo gateway necesita el prefijo del servicio
const API_BASE_URL = API_MODE === 'gateway' 
  ? `${BASE_URL}/control-institucional/api/v1` 
  : BASE_URL;
const PLAN_ANUAL_ENDPOINT = '/plan-anual-5-roles';

const PLANES_LIST_CACHE_TTL_MS = 45_000;
let planesListCache: { key: string; data: PlanAnual[]; ts: number } | null = null;

export function invalidatePlanAnualListCache(): void {
  planesListCache = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER PARA REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    // Manejar respuestas sin contenido
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      let errorMsg = data?.message || data?.error || `Error ${response.status}`;
      // NestJS ValidationPipe returns an array of messages
      if (Array.isArray(errorMsg)) {
        errorMsg = errorMsg.join(', ');
      } else if (Array.isArray(data?.message)) {
        errorMsg = data.message.join(', ');
      }
      return {
        success: false,
        error: errorMsg,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error('API Request Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión con el servidor',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API: PLAN ANUAL
// ═══════════════════════════════════════════════════════════════════════════

export const planAnualApi = {
  /**
   * Obtener todos los planes anuales
   */
  getAll: async (filtros?: FiltrosPlanAnual): Promise<ApiResponse<PlanAnual[]>> => {
    const params = new URLSearchParams();
    if (filtros?.año) params.append('year', String(filtros.año));
    if (filtros?.estado) params.append('estado', filtros.estado);
    const light = filtros?.light !== false;
    if (light) params.append('light', 'true');

    const query = params.toString();
    const cacheKey = query || 'all';
    if (
      !filtros?.skipCache &&
      planesListCache &&
      planesListCache.key === cacheKey &&
      Date.now() - planesListCache.ts < PLANES_LIST_CACHE_TTL_MS
    ) {
      return { success: true, data: planesListCache.data };
    }

    const response = await apiRequest<PlanAnual[]>(
      `${PLAN_ANUAL_ENDPOINT}${query ? `?${query}` : ''}`,
    );
    if (response.success && response.data) {
      planesListCache = { key: cacheKey, data: response.data, ts: Date.now() };
    }
    return response;
  },

  /**
   * Obtener plan anual por ID
   */
  getById: async (id: string): Promise<ApiResponse<PlanAnual>> => {
    return apiRequest<PlanAnual>(`${PLAN_ANUAL_ENDPOINT}/${id}`);
  },

  /**
   * Obtener plan anual por año (el más usado)
   */
  getByYear: async (year: number): Promise<ApiResponse<PlanAnual>> => {
    return apiRequest<PlanAnual>(`${PLAN_ANUAL_ENDPOINT}/year/${year}`);
  },

  /**
   * Crear nuevo plan anual
   */
  create: async (data: CreatePlanAnualDto): Promise<ApiResponse<PlanAnual>> => {
    invalidatePlanAnualListCache();
    return apiRequest<PlanAnual>(PLAN_ANUAL_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar plan anual (estado, responsable)
   */
  update: async (id: string, data: UpdatePlanAnualDto): Promise<ApiResponse<PlanAnual>> => {
    invalidatePlanAnualListCache();
    return apiRequest<PlanAnual>(`${PLAN_ANUAL_ENDPOINT}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar plan anual
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    invalidatePlanAnualListCache();
    return apiRequest<void>(`${PLAN_ANUAL_ENDPOINT}/${id}`, {
      method: 'DELETE',
    });
  },

  deleteWizardBorrador: async (): Promise<void> => {
    await apiRequest<void>(`${PLAN_ANUAL_ENDPOINT}/wizard-borrador/me`, { method: 'DELETE' });
  },

  saveWizardBorrador: async (payload: Record<string, unknown>): Promise<ApiResponse<{ ok: boolean; savedAt: string }>> => {
    return apiRequest(`${PLAN_ANUAL_ENDPOINT}/wizard-borrador/me`, {
      method: 'PUT',
      body: JSON.stringify({ payload }),
    });
  },

  /**
   * Obtener roles de un plan
   */
  getRoles: async (planId: string): Promise<ApiResponse<Rol[]>> => {
    return apiRequest<Rol[]>(`${PLAN_ANUAL_ENDPOINT}/${planId}/roles`);
  },

  /**
   * Actualizar responsable del rol (no modifica actividades).
   */
  updateRol: async (
    planId: string,
    rolId: string,
    data: UpdateRolPlanAnualDto,
  ): Promise<ApiResponse<Rol>> => {
    return apiRequest<Rol>(`${PLAN_ANUAL_ENDPOINT}/${planId}/roles/${rolId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Solicitar al responsable del plan que revise y envíe al comité PAI (notificación in-app).
   */
  notificarResponsable: async (
    planId: string,
    body?: { solicitanteNombre?: string; mensaje?: string; responsableEmail?: string },
  ): Promise<
    ApiResponse<{
      ok: boolean;
      destinatarioNombre: string;
      porcentajeAsignacion: number;
      listoParaEnvio: boolean;
    }>
  > => {
    return apiRequest(`${PLAN_ANUAL_ENDPOINT}/${planId}/notificar-responsable`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    });
  },

  /**
   * Exportar plan a Excel (descarga archivo .xlsx)
   */
  exportExcel: async (planId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}${PLAN_ANUAL_ENDPOINT}/${planId}/export/excel`, {
        credentials: 'include',
      });
      if (!response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        return { success: false, error: data?.message || `Error ${response.status}` };
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const nombre = match ? match[1] : `plan-anual-${planId}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Error al exportar' };
    }
  },

  /**
   * Obtener datos del plan para exportar a PDF (el front puede abrir vista de impresión)
   */
  exportPdfData: async (planId: string): Promise<ApiResponse<PlanAnual>> => {
    return apiRequest<PlanAnual>(`${PLAN_ANUAL_ENDPOINT}/${planId}/export/pdf`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// API: ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════

export const actividadesApi = {
  /**
   * Crear nueva actividad en un rol
   */
  create: async (rolId: string, data: CreateActividadDto): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/${rolId}/actividades`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar actividad
   */
  update: async (actividadId: string, data: UpdateActividadDto): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar actividad
   */
  delete: async (actividadId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Actualizar progreso de actividad (shortcut)
   */
  updateProgress: async (actividadId: string, porcentaje: number): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify({ porcentaje_avance: porcentaje }),
    });
  },

  /**
   * Cambiar estado de actividad (shortcut)
   */
  updateStatus: async (actividadId: string, estado: string): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// API: AUDITORES (Para asignar responsables)
// ═══════════════════════════════════════════════════════════════════════════

export const auditoresApi = {
  /**
   * Obtener lista de auditores/personas disponibles
   * Endpoint correcto: /auditorias/personas/disponibles
   */
  getAll: async (): Promise<ApiResponse<Auditor[]>> => {
    // Usar el endpoint correcto del backend de control interno
    const response = await apiRequest<any[]>('/auditorias/personas/disponibles');
    
    if (response.success && response.data) {
      // Transformar al formato Auditor del frontend
      // El backend devuelve: { id, nombre, cargo, email, ... }
      const auditores: Auditor[] = response.data.map(persona => ({
        id: String(persona.id || persona.idPersona || persona.documento),
        nombre: persona.nombre || persona.nombre_completo || `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() || 'Sin nombre',
        cargo: persona.cargo || 'Auditor',
        email: persona.email || '',
      }));
      return { success: true, data: auditores };
    }
    
    return response as ApiResponse<Auditor[]>;
  },

  /**
   * Buscar personas por término
   */
  buscar: async (termino: string): Promise<ApiResponse<Auditor[]>> => {
    const response = await apiRequest<any[]>(`/auditorias/personas/buscar?q=${encodeURIComponent(termino)}`);
    
    if (response.success && response.data) {
      const auditores: Auditor[] = response.data.map(persona => ({
        id: String(persona.id || persona.idPersona || persona.documento),
        nombre: persona.nombre || persona.nombre_completo || `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() || 'Sin nombre',
        cargo: persona.cargo || 'Auditor',
        email: persona.email || '',
      }));
      return { success: true, data: auditores };
    }
    
    return response as ApiResponse<Auditor[]>;
  },

  /**
   * Obtener auditor por ID
   */
  getById: async (id: string): Promise<ApiResponse<Auditor>> => {
    return apiRequest<Auditor>(`/auditorias/personas/buscar?id=${id}`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// API: ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════

export const estadisticasApi = {
  /**
   * Obtener estadísticas del plan anual
   * Nota: Si el endpoint no existe, se calculan desde el plan
   */
  getByPlanId: async (planId: string): Promise<ApiResponse<EstadisticasPlan>> => {
    return apiRequest<EstadisticasPlan>(`${PLAN_ANUAL_ENDPOINT}/${planId}/estadisticas`);
  },

  /**
   * Calcular estadísticas localmente desde un plan
   */
  calcularDesdeplan: (plan: PlanAnual): EstadisticasPlan => {
    const actividades = plan.roles.flatMap(r => r.actividades);
    
    const actividadesCompletadas = actividades.filter(a => a.estado === 'completada').length;
    const actividadesEnProgreso = actividades.filter(a => a.estado === 'en-progreso').length;
    const actividadesPendientes = actividades.filter(a => a.estado === 'pendiente').length;
    const actividadesRetrasadas = actividades.filter(a => a.estado === 'retrasada').length;
    
    const porcentajeCumplimiento = actividades.length > 0
      ? Math.round((actividadesCompletadas / actividades.length) * 100)
      : 0;

    const porcentajesPorRol = plan.roles.map(rol => ({
      rol: rol.rol_numero,
      nombre: rol.nombre,
      porcentaje: rol.porcentaje_cumplimiento,
    }));

    return {
      totalActividades: actividades.length,
      actividadesCompletadas,
      actividadesEnProgreso,
      actividadesPendientes,
      actividadesRetrasadas,
      porcentajeCumplimiento,
      porcentajesPorRol,
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT UNIFICADO
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// API: ADJUNTOS DE ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════

import type { AdjuntoActividad, CreateAdjuntoDto, UpdateActividadExtendidoDto } from './types';

export interface AdjuntoTareaPersistido {
  id: string;
  nombre: string;
  url: string;
  fecha: string;
}

export interface AdjuntoTareaUploadResponse {
  id: string;
  nombre: string;
  tipo: string;
  tamanio: number;
  fecha: string;
  urlDownload: string;
  urlPreview: string;
  tareaId?: string;
}

function extraerIdAdjuntoDeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/\/adjuntos\/([0-9a-f-]{36})(?:\/|$)/i);
  return match?.[1];
}

/** Normaliza adjuntos de tarea al cargar desde BD (reemplaza blob: por URLs del API). */
export function normalizarAdjuntosTareaDesdeBackend(
  adjuntos: Array<{ id?: string; nombre?: string; url?: string; fecha?: string }> = [],
): AdjuntoTareaPersistido[] {
  return adjuntos
    .map((adj) => {
      const id = adj.id || extraerIdAdjuntoDeUrl(adj.url);
      if (!id) {
        if (!adj.url || adj.url.startsWith('blob:')) return null;
        return {
          id: '',
          nombre: adj.nombre || 'Archivo',
          url: adj.url,
          fecha: adj.fecha || new Date().toISOString(),
        };
      }
      return {
        id,
        nombre: adj.nombre || 'Archivo',
        url: `${PLAN_ANUAL_ENDPOINT}/adjuntos/${id}/download`,
        fecha: adj.fecha || new Date().toISOString(),
      };
    })
    .filter((a): a is AdjuntoTareaPersistido => a !== null && !!a.nombre);
}

/** URL absoluta para descargar/previsualizar un adjunto de tarea. */
export function resolverUrlAdjuntoTarea(
  adj: { id?: string; url?: string },
  action: 'download' | 'preview' = 'download',
): string | null {
  if (adj.id) {
    return `${API_BASE_URL}${PLAN_ANUAL_ENDPOINT}/adjuntos/${adj.id}/${action}`;
  }
  const url = (adj.url || '').trim();
  if (!url || url.startsWith('blob:')) return null;
  if (url.startsWith('http')) return url.replace(/\/download$/, `/${action}`);
  if (url.startsWith('/services/')) {
    return `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`.replace(
      /\/download$/,
      `/${action}`,
    );
  }
  const path = url.startsWith(PLAN_ANUAL_ENDPOINT) ? url : `${PLAN_ANUAL_ENDPOINT}${url}`;
  const withAction = path.includes(`/adjuntos/`) && !path.endsWith(`/${action}`)
    ? path.replace(/\/download$/, `/${action}`)
    : path;
  return `${API_BASE_URL}${withAction}`;
}

export type TipoPreviewAdjuntoTarea = 'pdf' | 'imagen' | 'docx' | 'xlsx' | 'otro';

export function tipoPreviewAdjuntoTarea(nombre: string): TipoPreviewAdjuntoTarea {
  const ext = (nombre.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'imagen';
  if (ext === 'docx') return 'docx';
  if (ext === 'xls' || ext === 'xlsx') return 'xlsx';
  return 'otro';
}

/** Descarga el binario del adjunto (autenticado). */
export async function obtenerArrayBufferAdjuntoTarea(
  adj: { id?: string; nombre: string; url?: string },
): Promise<ArrayBuffer> {
  if (adj.url?.startsWith('blob:')) {
    const res = await fetch(adj.url);
    if (!res.ok) throw new Error('No se pudo leer el archivo local');
    return res.arrayBuffer();
  }

  const downloadUrl = resolverUrlAdjuntoTarea(adj, 'download');
  if (!downloadUrl) {
    throw new Error('No hay archivo disponible en el servidor');
  }

  const res = await fetch(downloadUrl, {
    credentials: 'include',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
  }
  return res.arrayBuffer();
}

export interface ContenidoPreviewEvidencia {
  tipo: TipoPreviewAdjuntoTarea;
  blobUrl?: string;
  docxHtml?: string;
  xlsxHtml?: string;
}

/** Carga contenido para el visor (PDF/imagen vía preview; Office vía download + conversión). */
export async function cargarPreviewEvidenciaPlanAnual(
  adj: { id?: string; nombre: string; url?: string },
): Promise<ContenidoPreviewEvidencia> {
  const tipo = tipoPreviewAdjuntoTarea(adj.nombre);
  if (tipo === 'otro') {
    throw new Error('PREVIEW_NO_SOPORTADO');
  }

  if (tipo === 'docx') {
    const mammoth = await import('mammoth');
    const buffer = await obtenerArrayBufferAdjuntoTarea(adj);
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    return { tipo, docxHtml: result.value || '<p>(documento vacío)</p>' };
  }

  if (tipo === 'xlsx') {
    const XLSX = await import('xlsx');
    const buffer = await obtenerArrayBufferAdjuntoTarea(adj);
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { tipo, xlsxHtml: '<p>Hoja de cálculo vacía</p>' };
    }
    const html = XLSX.utils.sheet_to_html(workbook.Sheets[sheetName], { id: 'plan-anual-xlsx-preview' });
    return { tipo, xlsxHtml: html };
  }

  if (adj.url?.startsWith('blob:')) {
    return { tipo, blobUrl: adj.url };
  }

  const previewUrl = resolverUrlAdjuntoTarea(adj, 'preview');
  if (!previewUrl) {
    throw new Error('No hay vista previa disponible para este archivo');
  }

  const res = await fetch(previewUrl, {
    credentials: 'include',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
  }
  const blob = await res.blob();
  return { tipo, blobUrl: URL.createObjectURL(blob) };
}

/** @deprecated Usar cargarPreviewEvidenciaPlanAnual */
export async function obtenerBlobPreviewAdjuntoTarea(
  adj: { id?: string; nombre: string; url?: string },
): Promise<{ blobUrl: string; mimeType: string; tipo: TipoPreviewAdjuntoTarea }> {
  const contenido = await cargarPreviewEvidenciaPlanAnual(adj);
  if (!contenido.blobUrl) {
    throw new Error('PREVIEW_NO_SOPORTADO');
  }
  return { blobUrl: contenido.blobUrl, mimeType: '', tipo: contenido.tipo };
}

/** Descarga autenticada de evidencia de tarea (persistida en servidor o blob legacy). */
export async function descargarAdjuntoTareaPlanAnual(
  adj: { id?: string; nombre: string; url?: string },
): Promise<void> {
  if (adj.url?.startsWith('blob:')) {
    const enlace = document.createElement('a');
    enlace.href = adj.url;
    enlace.download = adj.nombre || 'evidencia';
    enlace.rel = 'noopener noreferrer';
    enlace.target = '_blank';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    return;
  }

  const downloadUrl = resolverUrlAdjuntoTarea(adj, 'download');
  if (!downloadUrl) {
    throw new Error('No hay archivo disponible para descargar');
  }

  const res = await fetch(downloadUrl, {
    credentials: 'include',
    headers: getDefaultHeaders(),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'No autorizado' : `Error ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = adj.nombre || 'evidencia';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

export const adjuntosApi = {
  /**
   * Obtener adjuntos de una actividad
   */
  getByActividad: async (actividadId: string): Promise<ApiResponse<AdjuntoActividad[]>> => {
    return apiRequest<AdjuntoActividad[]>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}/adjuntos`);
  },

  /**
   * Agregar adjunto a una actividad
   */
  create: async (actividadId: string, data: CreateAdjuntoDto): Promise<ApiResponse<AdjuntoActividad>> => {
    return apiRequest<AdjuntoActividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}/adjuntos`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar adjunto
   */
  delete: async (adjuntoId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`${PLAN_ANUAL_ENDPOINT}/adjuntos/${adjuntoId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Subir archivo real al servidor (evidencia de tarea del plan anual).
   */
  uploadTarea: async (
    actividadId: string,
    file: File,
    tareaId?: string,
  ): Promise<ApiResponse<AdjuntoTareaUploadResponse>> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (tareaId) {
        formData.append('tareaId', tareaId);
      }

      const response = await fetch(
        `${API_BASE_URL}${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}/adjuntos/upload`,
        {
          method: 'POST',
          credentials: 'include',
          body: formData,
        },
      );

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        const errorMsg = data?.message || data?.error || `Error ${response.status}`;
        return { success: false, error: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg };
      }

      return { success: true, data: data as AdjuntoTareaUploadResponse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error subiendo archivo',
      };
    }
  },

  /**
   * Guardar adjuntos y observaciones de una actividad
   * Método helper que actualiza la actividad y maneja los adjuntos
   */
  guardarEvidencias: async (
    actividadId: string,
    adjuntosNuevos: CreateAdjuntoDto[],
    adjuntosAEliminar: string[],
    observaciones: string
  ): Promise<ApiResponse<{ actividad: Actividad; adjuntos: AdjuntoActividad[] }>> => {
    try {
      // 1. Actualizar observaciones en la actividad
      const updateResponse = await actividadesApi.update(actividadId, {
        observaciones,
      });

      if (!updateResponse.success) {
        return { success: false, error: updateResponse.error };
      }

      // 2. Eliminar adjuntos marcados
      for (const adjuntoId of adjuntosAEliminar) {
        await adjuntosApi.delete(adjuntoId);
      }

      // 3. Crear nuevos adjuntos
      const adjuntosCreados: AdjuntoActividad[] = [];
      for (const adjunto of adjuntosNuevos) {
        const result = await adjuntosApi.create(actividadId, adjunto);
        if (result.success && result.data) {
          adjuntosCreados.push(result.data);
        }
      }

      // 4. Obtener lista actualizada de adjuntos
      const adjuntosResponse = await adjuntosApi.getByActividad(actividadId);

      return {
        success: true,
        data: {
          actividad: updateResponse.data!,
          adjuntos: adjuntosResponse.data || adjuntosCreados,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error guardando evidencias',
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVIDADES EXTENDIDO (con campos nuevos)
// ═══════════════════════════════════════════════════════════════════════════

export const actividadesExtendidoApi = {
  /**
   * Actualizar actividad con todos los campos (incluye nuevos: control, evaluacion, etc)
   */
  updateCompleto: async (actividadId: string, data: UpdateActividadExtendidoDto): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Verificar actividad por el Director OCI
   */
  verificarPorDirector: async (
    actividadId: string,
    observaciones?: string
  ): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify({
        verificadaPorDirector: true,
        fechaVerificacion: new Date().toISOString(),
        observacionesDirector: observaciones,
      }),
    });
  },
};

export const planAnualService = {
  plan: planAnualApi,
  actividades: actividadesApi,
  actividadesExtendido: actividadesExtendidoApi,
  adjuntos: adjuntosApi,
  auditores: auditoresApi,
  estadisticas: estadisticasApi,
};

export default planAnualService;
