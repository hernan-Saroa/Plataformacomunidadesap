import { apiClient } from './apiClient';

export type ApiResult<T> = { success: boolean; data: T; message?: string; error?: string };

export interface BancoDocentesPage {
  data: any[];
  total: number;
  page: number;
  pages: number;
  limit?: number;
}

const SERVICE_BASE = '/pta/api/v1';

const PTA_BASE = SERVICE_BASE;

function normalizeResult<T>(raw: any, fallback: T): ApiResult<T> {
  if (raw !== undefined && raw !== null) {
    // Si raw es un array, o si no tiene las props de wrapper, apiClient ya lo desenvolvió
    const success = raw.success !== false && raw.exito !== false && raw.ok !== false;
    const data = (raw.data !== undefined ? raw.data : (raw.datos !== undefined ? raw.datos : (raw.result !== undefined ? raw.result : raw))) as T;
    return { success, data: (data ?? fallback) as T };
  }
  return { success: false, data: fallback };
}

function getApiErrorMessage(error: any, fallback: string): string {
  const responseMessage = error?.response?.data?.message;
  if (Array.isArray(responseMessage)) return responseMessage.join(', ');
  if (responseMessage && typeof responseMessage === 'object') {
    return responseMessage.message || fallback;
  }
  return responseMessage || error?.message || fallback;
}

export async function getCatalogoTerritoriales(periodo?: string) {
  try {
    const params = periodo ? { periodo } : undefined;
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/territoriales`, params);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-rund][getCatalogoTerritoriales] Error:', error);
    return { success: false, data: [] };
  }
}

const BD_BASE = '/rund/api/v1/pta/banco-docentes';

export async function getBancoDocentes(filters?: {
  territorial?: string;
  dedicacion?: string;
  vinculacion?: string;
  estado?: string;
  search?: string;
  page?: number;
  limit?: number;
  periodoCarga?: string;
}): Promise<ApiResult<BancoDocentesPage>> {
  try {
    // El backend devuelve { success, items:[...], total, pages } sin wrapper "data"
    // para que el apiClient no desenvuelva y descarte la paginación.
    const raw = await apiClient.get<any>(BD_BASE, filters);
    const r = raw && typeof raw === 'object' ? raw : {};
    const items = Array.isArray(r.items) ? r.items : (Array.isArray(r.data) ? r.data : (Array.isArray(raw) ? raw : []));
    return { success: true, data: { data: items, total: r.total ?? items.length, page: r.page ?? 1, pages: r.pages ?? 1 } };
  } catch (error) {
    console.error('[mfe-rund][getBancoDocentes] Error:', error);
    return { success: false, data: { data: [], total: 0, page: 1, limit: 50, pages: 1 } };
  }
}

export async function getBancoDocenteStats(filters?: { territorial?: string; dedicacion?: string; vinculacion?: string; estado?: string; periodoCarga?: string }) {
  try {
    const params = new URLSearchParams();
    if (filters?.territorial) params.set('territorial', filters.territorial);
    if (filters?.dedicacion) params.set('dedicacion', filters.dedicacion);
    if (filters?.vinculacion) params.set('vinculacion', filters.vinculacion);
    if (filters?.estado) params.set('estado', filters.estado);
    if (filters?.periodoCarga) params.set('periodoCarga', filters.periodoCarga);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const raw = await apiClient.get<any>(`${BD_BASE}/stats${qs}`);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-rund][getBancoDocenteStats] Error:', error);
    return { success: false, data: null };
  }
}

export async function getBancoDocenteById(id: string, periodoCarga?: string) {
  try {
    const raw = await apiClient.get<any>(
      `${BD_BASE}/${id}`,
      periodoCarga ? { periodoCarga } : undefined,
    );
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.warn('[mfe-rund][getBancoDocenteById] No encontrado o error al buscar docente:', error instanceof Error ? error.message : error);
    return { success: false, data: null };
  }
}

export async function getBancoDocenteCabezote(id: string, periodoCarga?: string) {
  try {
    const raw = await apiClient.get<any>(
      `${BD_BASE}/${encodeURIComponent(id)}/cabezote`,
      periodoCarga ? { periodoCarga } : undefined,
    );
    return normalizeResult<any>(raw, null);
  } catch {
    return { success: false, data: null };
  }
}

export async function createBancoDocente(body: any) {
  try {
    const raw = await apiClient.post<any>(BD_BASE, body);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-rund][createBancoDocente] Error:', error);
    return { success: false, data: null, message: getApiErrorMessage(error, 'No fue posible crear el docente.') };
  }
}

export async function updateBancoDocente(id: string, body: any) {
  try {
    const raw = await apiClient.put<any>(`${BD_BASE}/${id}`, body);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-rund][updateBancoDocente] Error:', error);
    return { success: false, data: null, message: getApiErrorMessage(error, 'No fue posible actualizar el docente.') };
  }
}

export async function toggleBancoDocenteEstado(id: string, body: {
  estadoObjetivo: 'ACTIVO' | 'INACTIVO';
  justificacion: string;
  soporteId: string;
  actorId?: string;
  periodoCarga?: string;
}) {
  try {
    const raw = await apiClient.put<any>(`${BD_BASE}/${id}/estado`, body);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-rund][toggleBancoDocenteEstado] Error:', error);
    return { success: false, data: null, message: getApiErrorMessage(error, 'No fue posible cambiar el estado del docente.') };
  }
}

export async function bulkUploadBancoDocentes(file: File, dryRun = false, omitErrors = false, periodoCarga?: string): Promise<ApiResult<any>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const query = new URLSearchParams();
    if (dryRun) query.append('dry_run', 'true');
    if (omitErrors) query.append('omit_errors', 'true');
    if (periodoCarga) query.append('periodo_carga', periodoCarga);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await apiClient.upload<any>(`${BD_BASE}/bulk${queryString}`, formData, { timeoutMs: 300000 });
    return normalizeResult<any>(raw, null);
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || 'Error en la carga masiva';
    return { success: false, data: null, error: msg };
  }
}

export async function vincularRundSoporte(docenteId: string, bloque: string, data: {
  tipoSoporte: string;
  documentoCarpetaId?: string;
  nombreArchivo?: string;
  fechaVencimiento?: string;
  cargadoPor?: string;
  autogestionToken?: string;
}, file?: File) {
  try {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipoSoporte', data.tipoSoporte);
      if (data.documentoCarpetaId) formData.append('documentoCarpetaId', data.documentoCarpetaId);
      if (data.nombreArchivo) formData.append('nombreArchivo', data.nombreArchivo);
      if (data.fechaVencimiento) formData.append('fechaVencimiento', data.fechaVencimiento);
      if (data.cargadoPor) formData.append('cargadoPor', data.cargadoPor);
      if (data.autogestionToken) formData.append('autogestionToken', data.autogestionToken);
      
      const suffix = data.autogestionToken ? '/autogestion' : '';
      const raw = await apiClient.upload<any>(`${BD_BASE}/${docenteId}/bloques/${bloque}/soportes${suffix}`, formData);
      return normalizeResult<any>(raw, null);
    } else {
      const raw = await apiClient.post<any>(`${BD_BASE}/${docenteId}/bloques/${bloque}/soportes`, data);
      return normalizeResult<any>(raw, null);
    }
  } catch (error) {
    console.error('[mfe-rund][vincularRundSoporte] Error:', error);
    return { success: false, data: null, message: getApiErrorMessage(error, 'No fue posible cargar el soporte documental.') };
  }
}
