/**
 * Servicio transversal de Tabla de Retención Documental (TRD) y TVD.
 *
 * Catálogo alojado en `auth.trd_configuraciones` y `auth.trd_series_subseries` (auth-service)
 * y consumido por Control Disciplinario y la administración general de la plataforma ESAP.
 */
import { apiClient } from './apiClient';

const BASE = '/auth/api/v1/trd';

export interface TrdSerieSubserie {
  id: number;
  trdId: number;
  codigoDependencia: string;
  nombreDependencia: string;
  codigoSerie: string;
  nombreSerie: string;
  codigoSubserie: string;
  nombreSubserie: string;
  codigoIdentificacionExpediente?: string | null;
  modulo: string;
  activo: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface TrdConfiguracion {
  id: number;
  version: string; // ej: 'TRD V1', 'TRD V4'
  nombre: string;
  tipo: 'TRD' | 'TVD';
  fechaInicio: string; // YYYY-MM-DD
  fechaFin: string | null; // YYYY-MM-DD o null si es vigente
  actoAdministrativo: string; // Decreto o Resolución
  convalidacionEstado: string; // Concepto técnico, Comité de archivo, etc.
  descripcion?: string | null;
  activo: boolean;
  esVigente: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
  series?: TrdSerieSubserie[];
}

export interface TrdVigenteResponse {
  trd: TrdConfiguracion;
  serieSubserie: TrdSerieSubserie | null;
}

export type TrdInput = Omit<
  TrdConfiguracion,
  'id' | 'creadoEn' | 'actualizadoEn' | 'series'
>;

export type TrdSerieInput = Omit<
  TrdSerieSubserie,
  'id' | 'creadoEn' | 'actualizadoEn'
>;

function extraerData<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
    return (res as Record<string, unknown>).data as T;
  }
  return res as T;
}

export const trdService = {
  /**
   * Obtiene la lista completa de versiones de TRD/TVD con sus series y subseries
   */
  async getTrdList(): Promise<TrdConfiguracion[]> {
    const res = await apiClient.get<unknown>(BASE);
    const data = extraerData<TrdConfiguracion[]>(res);
    return Array.isArray(data) ? data : [];
  },

  /**
   * Obtiene la TRD vigente o la que aplica según la fecha histórica del documento
   */
  async getTrdVigente(modulo = 'control-disciplinario', fecha?: string): Promise<TrdVigenteResponse> {
    const params = new URLSearchParams();
    if (modulo) params.append('modulo', modulo);
    if (fecha) params.append('fecha', fecha);
    const url = `${BASE}/vigente${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await apiClient.get<unknown>(url);
    return extraerData<TrdVigenteResponse>(res);
  },

  /**
   * Obtiene el detalle de una versión de TRD por ID
   */
  async getTrdById(id: number): Promise<TrdConfiguracion> {
    const res = await apiClient.get<unknown>(`${BASE}/${id}`);
    return extraerData<TrdConfiguracion>(res);
  },

  /**
   * Crea una nueva versión de TRD/TVD
   */
  async createTrd(dto: Partial<TrdInput>): Promise<TrdConfiguracion> {
    const res = await apiClient.post<unknown>(BASE, dto);
    return extraerData<TrdConfiguracion>(res);
  },

  /**
   * Actualiza una versión existente de TRD
   */
  async updateTrd(id: number, dto: Partial<TrdInput>): Promise<TrdConfiguracion> {
    const res = await apiClient.put<unknown>(`${BASE}/${id}`, dto);
    return extraerData<TrdConfiguracion>(res);
  },

  /**
   * Alterna el estado activo / inactivo de una versión de TRD
   */
  async toggleTrdActivo(id: number): Promise<TrdConfiguracion> {
    const res = await apiClient.patch<unknown>(`${BASE}/${id}/toggle`, {});
    return extraerData<TrdConfiguracion>(res);
  },

  /**
   * Marca una versión como la TRD vigente oficial de la institución
   */
  async setTrdVigente(id: number): Promise<TrdConfiguracion> {
    const res = await apiClient.post<unknown>(`${BASE}/${id}/set-vigente`, {});
    return extraerData<TrdConfiguracion>(res);
  },

  /**
   * Elimina una versión de TRD (si no es la vigente)
   */
  async deleteTrd(id: number): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<unknown>(`${BASE}/${id}`);
    return extraerData<{ success: boolean; message: string }>(res);
  },

  /**
   * Agrega una serie y subserie asociada a una TRD
   */
  async addSerie(trdId: number, dto: Partial<TrdSerieInput>): Promise<TrdSerieSubserie> {
    const res = await apiClient.post<unknown>(`${BASE}/${trdId}/series`, dto);
    return extraerData<TrdSerieSubserie>(res);
  },

  /**
   * Actualiza una serie y subserie existente
   */
  async updateSerie(serieId: number, dto: Partial<TrdSerieInput>): Promise<TrdSerieSubserie> {
    const res = await apiClient.put<unknown>(`${BASE}/series/${serieId}`, dto);
    return extraerData<TrdSerieSubserie>(res);
  },

  /**
   * Alterna el estado activo de una serie/subserie
   */
  async toggleSerieActivo(serieId: number): Promise<TrdSerieSubserie> {
    const res = await apiClient.patch<unknown>(`${BASE}/series/${serieId}/toggle`, {});
    return extraerData<TrdSerieSubserie>(res);
  },

  /**
   * Elimina una serie y subserie asociada
   */
  async deleteSerie(serieId: number): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<unknown>(`${BASE}/series/${serieId}`);
    return extraerData<{ success: boolean; message: string }>(res);
  },
};
