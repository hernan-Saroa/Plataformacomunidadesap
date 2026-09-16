/**
 * Servicio transversal de Dependencias ESAP.
 *
 * Catálogo alojado en `auth.dependencias` (auth-service) y consumido por
 * múltiples módulos: viáticos (cupo presupuestal de tiquetes), estructura
 * organizacional, control interno, etc.
 *
 * Se expone desde el shell para que la página de "Configuración General
 * > Dependencias" no dependa del remote mfe-viaticos y pueda renderearse
 * como un módulo independiente.
 */
import { apiClient } from './apiClient';

const BASE = '/auth/api/v1/estructura-organizacional/dependencias';

export interface Dependencia {
  idDependencia: number;
  idEmpresa: number;
  codDependencia: string;
  nomDependencia: string;
  dirDependencia: string | null;
  dirEmail: string | null;
  urlDependencia: string | null;
  idGeopolitica: number | null;
  idSede: number | null;
  idCargo: number | null;
  idTercero: number | null;
  tipUnidad: number | null;
  genTipUnidad: string | null;
  descripcion: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export type DependenciaInput = Partial<
  Pick<
    Dependencia,
    | 'codDependencia'
    | 'nomDependencia'
    | 'descripcion'
    | 'dirDependencia'
    | 'dirEmail'
    | 'urlDependencia'
    | 'idGeopolitica'
    | 'idSede'
    | 'idCargo'
    | 'idTercero'
    | 'tipUnidad'
    | 'genTipUnidad'
    | 'activo'
  >
>;

/**
 * Extrae la lista de dependencias de la respuesta del auth-service. El
 * backend envuelve con `{ data: { data: [...] }, meta }`, por lo que la
 * lista puede estar en `res.data.data`, `res.data` o `res` como array
 * directo.
 */
function extraerListaDependencias(res: unknown): Dependencia[] {
  if (Array.isArray(res)) {
    return res as Dependencia[];
  }
  if (!res || typeof res !== 'object') {
    return [];
  }
  const obj = res as Record<string, unknown>;
  if (Array.isArray(obj.data)) {
    return obj.data as Dependencia[];
  }
  const nested = obj.data as Record<string, unknown> | undefined;
  if (nested && Array.isArray(nested.data)) {
    return nested.data as Dependencia[];
  }
  return [];
}

function extraerDependencia(res: unknown): Dependencia {
  if (!res || typeof res !== 'object') {
    throw new Error('Respuesta vacía del servidor');
  }
  const obj = res as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object') {
    return obj.data as Dependencia;
  }
  return obj as Dependencia;
}

export const dependenciasService = {
  async listar(
    options: { includeInactive?: boolean; search?: string } = {},
  ): Promise<Dependencia[]> {
    const params: Record<string, string | boolean> = {};
    if (options.includeInactive) params.includeInactive = 'true';
    if (options.search) params.search = options.search;
    const res = await apiClient.get<unknown>(BASE, params);
    return extraerListaDependencias(res);
  },

  async obtenerPorId(id: number): Promise<Dependencia> {
    const res = await apiClient.get<unknown>(`${BASE}/${id}`);
    return extraerDependencia(res);
  },

  async crear(payload: DependenciaInput): Promise<Dependencia> {
    const res = await apiClient.post<unknown>(BASE, payload);
    return extraerDependencia(res);
  },

  async actualizar(id: number, payload: DependenciaInput): Promise<Dependencia> {
    const res = await apiClient.put<unknown>(`${BASE}/${id}`, payload);
    return extraerDependencia(res);
  },

  async eliminar(id: number): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },
};

export default dependenciasService;
