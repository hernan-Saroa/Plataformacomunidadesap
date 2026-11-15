import { getApiGatewayBaseUrl } from '../../../config/environment';
import { invalidarProgramacion } from '../actualizacionProgramacion';

const BASE = '/programacion-academica/api/v1';

/** Una fila de la plantilla (una sesión). `fila` es el número de fila del Excel. */
export interface FilaCarga {
  fila: number;
  codigoAsignatura?: string;
  grupo?: string | number;
  tipoOferta?: string;
  modalidad?: string;
  cupo?: string | number;
  cetap?: string;
  fechaInicio?: string;
  fechaFin?: string;
  dia?: string;
  horaInicio?: string;
  horaFin?: string;
  tipoSesion?: string;
  aula?: string;
  documentoDocente?: string;
}

export interface ErrorFila { fila: number | null; mensaje: string }

export interface ResultadoCarga {
  valido: boolean;
  aplicado: boolean;
  periodo: { idPeriodo: string; codigo: string };
  resumen: { filas: number; gruposNuevos: number; gruposExistentes: number; sesiones: number; asignaciones: number };
  errores: ErrorFila[];
  avisos: ErrorFila[];
  grupos: Array<{ codigoAsignatura: string; asignatura: string | null; grupo: number; tipoOferta: string; nuevo: boolean; sesiones: number; docentes: string[] }>;
}

export interface ReferenciaPlantilla {
  periodo: { idPeriodo: string; codigo: string; fechaInicio: string | null; fechaFin: string | null };
  asignaturas: Array<{ codigo: string; nombre: string; codigoPrograma: string; programa: string; creditos: number | null; horasClase: number | null; ofertada: boolean }>;
  ofertas: Array<{ codigoCetap: string; cetap: string; codigoPrograma: string; programa: string }>;
  maxFilas: number;
}

export type AlcanceReutilizacion = 'catalogo' | 'catalogo_grupos' | 'catalogo_grupos_docentes';

export interface ResultadoReutilizacion {
  valido: boolean;
  aplicado: boolean;
  alcance: AlcanceReutilizacion;
  origen: { idPeriodo: string; codigo: string };
  destino: { idPeriodo: string; codigo: string };
  corrimientoDias: number;
  catalogo: { ofertasCopiadas: number; ofertasYaExistentes: number; activacionesCetapCopiadas: number };
  grupos: { copiados: number; yaExistentes: number; sesiones: number; fechasAjustadas: number; sinOferta: number };
  docentes: { asignados: number; noAsignados: Array<{ grupo: string; documento: string; nombre: string | null; motivos: string[] }> };
  errores: Array<{ grupo: string | null; mensaje: string }>;
  avisos: string[];
}

/** Error con el reporte del servidor (409 de una carga o copia con errores: no se escribió nada). */
export class ErrorConReporte<T> extends Error {
  constructor(message: string, readonly status: number, readonly reporte: T | null) { super(message); }
}

async function peticion<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${ruta}`, {
    credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  let cuerpo: any = null;
  try { cuerpo = await res.json(); } catch { /* sin JSON */ }
  if (!res.ok || cuerpo?.success === false) {
    const m = cuerpo?.message;
    const reporte = cuerpo && typeof cuerpo === 'object' && ('errores' in cuerpo) ? cuerpo as T : null;
    throw new ErrorConReporte<T>(Array.isArray(m) ? m.join(' ') : m || `La solicitud falló (${res.status}).`, res.status, reporte);
  }
  return (cuerpo?.data ?? cuerpo) as T;
}

export const getReferenciaPlantilla = (idPeriodo: string) =>
  peticion<ReferenciaPlantilla>(`${BASE}/carga-programacion/referencia?periodo=${encodeURIComponent(idPeriodo)}`);

export const validarCarga = (idPeriodo: string, filas: FilaCarga[]) =>
  peticion<ResultadoCarga>(`${BASE}/carga-programacion/validar`, { method: 'POST', body: JSON.stringify({ idPeriodo, filas }) });

export async function cargarProgramacion(idPeriodo: string, filas: FilaCarga[]): Promise<ResultadoCarga> {
  const r = await peticion<ResultadoCarga>(`${BASE}/carga-programacion`, { method: 'POST', body: JSON.stringify({ idPeriodo, filas }) });
  invalidarProgramacion('programacion', 'periodos');
  return r;
}

export const validarReutilizacion = (idDestino: string, idPeriodoOrigen: string, alcance: AlcanceReutilizacion) =>
  peticion<ResultadoReutilizacion>(`${BASE}/periodos/${encodeURIComponent(idDestino)}/reutilizar/validar`, {
    method: 'POST', body: JSON.stringify({ idPeriodoOrigen, alcance }),
  });

export async function reutilizarPeriodo(idDestino: string, idPeriodoOrigen: string, alcance: AlcanceReutilizacion): Promise<ResultadoReutilizacion> {
  const r = await peticion<ResultadoReutilizacion>(`${BASE}/periodos/${encodeURIComponent(idDestino)}/reutilizar`, {
    method: 'POST', body: JSON.stringify({ idPeriodoOrigen, alcance }),
  });
  invalidarProgramacion('programacion', 'periodos', 'catalogo');
  return r;
}
