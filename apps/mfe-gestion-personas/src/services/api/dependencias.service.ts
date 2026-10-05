/**
 * Servicio transversal de Dependencias y Cargos ESAP (MFE).
 *
 * Catálogo alojado en `auth.dependencias` y `auth.cargos` (auth-service) expuesto en:
 *   GET /auth/api/v1/estructura-organizacional/dependencias
 *   GET /auth/api/v1/estructura-organizacional/cargos
 *   GET /auth/api/v1/estructura-organizacional/dependencias/:id/cargos
 *
 * Consumido por el módulo de gestión de personas para que el usuario
 * seleccione dependencia y cargos dependientes de dicha dependencia.
 */
import { apiClient } from './apiClient';

const SERVICE_PREFIX = '/auth/api/v1';
const BASE = `${SERVICE_PREFIX}/estructura-organizacional/dependencias`;
const BASE_CARGOS = `${SERVICE_PREFIX}/estructura-organizacional/cargos`;

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

export const dependenciasService = {
  async listar(options: { includeInactive?: boolean; search?: string } = {}): Promise<Dependencia[]> {
    const params: Record<string, string> = {};
    if (options.includeInactive) params.includeInactive = 'true';
    if (options.search) params.search = options.search;
    const res = await apiClient.get<unknown>(BASE, params);
    return extraerListaGenerica<Dependencia>(res);
  },

  async obtenerPorId(id: number): Promise<Dependencia | null> {
    const res = await apiClient.get<unknown>(`${BASE}/${id}`);
    if (!res || typeof res !== 'object') return null;
    const obj = res as Record<string, unknown>;
    return (obj.data ?? obj) as Dependencia;
  },

  async listarCargos(options: { includeInactive?: boolean; search?: string } = {}): Promise<Cargo[]> {
    const params: Record<string, string> = {};
    if (options.includeInactive) params.includeInactive = 'true';
    if (options.search) params.search = options.search;
    const res = await apiClient.get<unknown>(BASE_CARGOS, params);
    return extraerListaGenerica<Cargo>(res);
  },

  async obtenerCargosPorDependencia(idDependencia: number): Promise<Cargo[]> {
    const res = await apiClient.get<unknown>(`${BASE}/${idDependencia}/cargos`);
    return extraerListaGenerica<Cargo>(res);
  },
};

export default dependenciasService;
