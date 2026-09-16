/**
 * Servicio transversal de Dependencias ESAP (MFE).
 *
 * Catálogo alojado en `auth.dependencias` (auth-service) expuesto en:
 *   GET /auth/api/v1/estructura-organizacional/dependencias
 *
 * Consumido por el módulo de gestión de personas para que el usuario
 * seleccione una dependencia real (idDependencia) en lugar de usar
 * texto libre (`dependenciaGrupoPrograma`).
 */
import { apiClient } from './apiClient';

const SERVICE_PREFIX = '/auth/api/v1';
const BASE = `${SERVICE_PREFIX}/estructura-organizacional/dependencias`;

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

export const dependenciasService = {
  async listar(options: { includeInactive?: boolean; search?: string } = {}): Promise<Dependencia[]> {
    const params: Record<string, string> = {};
    if (options.includeInactive) params.includeInactive = 'true';
    if (options.search) params.search = options.search;
    const res = await apiClient.get<unknown>(BASE, params);
    return extraerListaDependencias(res);
  },

  async obtenerPorId(id: number): Promise<Dependencia | null> {
    const res = await apiClient.get<unknown>(`${BASE}/${id}`);
    if (!res || typeof res !== 'object') return null;
    const obj = res as Record<string, unknown>;
    return (obj.data ?? obj) as Dependencia;
  },
};

export default dependenciasService;
