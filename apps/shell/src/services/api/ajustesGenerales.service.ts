/**
 * Servicio transversal de Ajustes Generales ESAP.
 *
 * Administra parámetros maestros centralizados en el esquema `auth`:
 * - Salario Mínimo Legal Vigente (SMMLV)
 * - Días Festivos Oficiales de Colombia y sincronización con API nacional
 */
import { apiClient } from './apiClient';

const BASE = '/auth/api/v1/ajustes-generales';

export interface SalarioMinimoData {
  salarioMinimo: number;
  moneda: string;
  anioVigente: number;
  actualizadoEn: string;
}

export interface FestivoColombia {
  id: number;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  origen?: string;
  regla?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface SincronizarFestivosResponse {
  success: boolean;
  year: number;
  total: number;
  festivos: FestivoColombia[];
  mensaje: string;
}

function extraerData<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)) {
    return (res as Record<string, unknown>).data as T;
  }
  return res as T;
}

export const ajustesGeneralesService = {
  /**
   * Obtiene la configuración del Salario Mínimo Mensual Legal Vigente
   */
  async getSalarioMinimo(): Promise<SalarioMinimoData> {
    const res = await apiClient.get<unknown>(`${BASE}/salario-minimo`);
    return extraerData<SalarioMinimoData>(res);
  },

  /**
   * Actualiza el Salario Mínimo Mensual Legal Vigente
   */
  async updateSalarioMinimo(salarioMinimo: number, anio?: number): Promise<SalarioMinimoData> {
    const res = await apiClient.put<unknown>(`${BASE}/salario-minimo`, { salarioMinimo, anio });
    return extraerData<SalarioMinimoData>(res);
  },

  /**
   * Lista los días festivos registrados en la base de datos maestra (filtro opcional por año)
   */
  async getFestivos(year?: number): Promise<FestivoColombia[]> {
    const params: Record<string, string> = {};
    if (year) params.year = String(year);
    const res = await apiClient.get<unknown>(`${BASE}/festivos`, params);
    const list = extraerData<FestivoColombia[]>(res);
    return Array.isArray(list) ? list : [];
  },

  /**
   * Sincroniza los festivos con la API oficial nacional para el año especificado (o el año actual)
   */
  async sincronizarFestivos(year?: number): Promise<SincronizarFestivosResponse> {
    const params: Record<string, string> = {};
    if (year) params.year = String(year);
    const res = await apiClient.post<unknown>(`${BASE}/festivos/sincronizar`, { year }, params);
    return extraerData<SincronizarFestivosResponse>(res);
  },

  /**
   * Agrega un festivo de forma manual
   */
  async crearFestivo(data: { fecha: string; descripcion: string; origen?: string; regla?: string }): Promise<FestivoColombia> {
    const res = await apiClient.post<unknown>(`${BASE}/festivos`, data);
    return extraerData<FestivoColombia>(res);
  },

  /**
   * Actualiza un festivo manual
   */
  async actualizarFestivo(id: number, data: Partial<{ fecha: string; descripcion: string; origen?: string; regla?: string }>): Promise<FestivoColombia> {
    const res = await apiClient.put<unknown>(`${BASE}/festivos/${id}`, data);
    return extraerData<FestivoColombia>(res);
  },

  /**
   * Elimina un festivo
   */
  async eliminarFestivo(id: number): Promise<void> {
    await apiClient.delete(`${BASE}/festivos/${id}`);
  },
};

export default ajustesGeneralesService;
