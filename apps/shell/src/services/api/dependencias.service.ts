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
const BASE_CARGOS = '/auth/api/v1/estructura-organizacional/cargos';

export interface Cargo {
  idCargo: number;
  codCargo: string;
  nomCargo: string;
  descripcion?: string | null;
  nivelJerarquico?: string;
  activo: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface CargoInput {
  codCargo: string;
  nomCargo: string;
  descripcion?: string | null;
  nivelJerarquico?: string;
  activo?: boolean;
}

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
  cargos?: Cargo[];
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
> & {
  cargosIds?: number[];
};

/**
 * Extrae la lista de la respuesta del auth-service. El backend envuelve
 * con `{ data: { data: [...] }, meta }`, `{ data: [...] }` o array directo.
 */
function extraerListaGenerica<T>(res: unknown): T[] {
  if (Array.isArray(res)) {
    return res as T[];
  }
  if (!res || typeof res !== 'object') {
    return [];
  }
  const obj = res as Record<string, unknown>;
  if (Array.isArray(obj.data)) {
    return obj.data as T[];
  }
  const nested = obj.data as Record<string, unknown> | undefined;
  if (nested && Array.isArray(nested.data)) {
    return nested.data as T[];
  }
  return [];
}

function extraerObjetoGenerico<T>(res: unknown): T {
  if (!res || typeof res !== 'object') {
    throw new Error('Respuesta vacía del servidor');
  }
  const obj = res as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return obj.data as T;
  }
  return obj as T;
}

export const dependenciasService = {
  async listar(
    options: { includeInactive?: boolean; search?: string } = {},
  ): Promise<Dependencia[]> {
    const params: Record<string, string | boolean> = {};
    if (options.includeInactive) params.includeInactive = 'true';
    if (options.search) params.search = options.search;
    const res = await apiClient.get<unknown>(BASE, params);
    return extraerListaGenerica<Dependencia>(res);
  },

  async obtenerPorId(id: number): Promise<Dependencia> {
    const res = await apiClient.get<unknown>(`${BASE}/${id}`);
    return extraerObjetoGenerico<Dependencia>(res);
  },

  async crear(payload: DependenciaInput): Promise<Dependencia> {
    const res = await apiClient.post<unknown>(BASE, payload);
    return extraerObjetoGenerico<Dependencia>(res);
  },

  async actualizar(id: number, payload: DependenciaInput): Promise<Dependencia> {
    const res = await apiClient.put<unknown>(`${BASE}/${id}`, payload);
    return extraerObjetoGenerico<Dependencia>(res);
  },

  async eliminar(id: number): Promise<void> {
    await apiClient.delete(`${BASE}/${id}`);
  },

  // ==================== CARGOS ====================

  async listarCargos(
    options: { includeInactive?: boolean; search?: string } = {},
  ): Promise<Cargo[]> {
    const params: Record<string, string | boolean> = {};
    if (options.includeInactive) params.includeInactive = 'true';
    if (options.search) params.search = options.search;
    const res = await apiClient.get<unknown>(BASE_CARGOS, params);
    return extraerListaGenerica<Cargo>(res);
  },

  async crearCargo(payload: CargoInput): Promise<Cargo> {
    const res = await apiClient.post<unknown>(BASE_CARGOS, payload);
    return extraerObjetoGenerico<Cargo>(res);
  },

  async obtenerCargosPorDependencia(idDependencia: number): Promise<Cargo[]> {
    const res = await apiClient.get<unknown>(`${BASE}/${idDependencia}/cargos`);
    return extraerListaGenerica<Cargo>(res);
  },

  async asignarCargos(
    idDependencia: number,
    cargosIds: number[],
  ): Promise<Cargo[]> {
    const res = await apiClient.post<unknown>(`${BASE}/${idDependencia}/cargos`, {
      cargosIds,
    });
    return extraerListaGenerica<Cargo>(res);
  },
};

export default dependenciasService;
