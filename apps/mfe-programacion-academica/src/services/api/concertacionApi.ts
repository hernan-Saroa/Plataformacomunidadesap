import { getApiGatewayBaseUrl } from '../../../config/environment';
import { invalidarProgramacion } from '../actualizacionProgramacion';

/**
 * Cliente de la concertación de la docencia — EFDS-2315.
 *
 * Archivo propio, no `catalogoApi.ts` (coordinación de la ronda). Después de
 * cada escritura CONFIRMADA invalida con el mecanismo común de Codex
 * (`actualizacionProgramacion`): así Programación General, el portal y el
 * acumulado vuelven a leer del servidor sin recargar (EFDS-2311). Una escritura
 * rechazada no invalida nada.
 */
const BASE = '/programacion-academica/api/v1/concertacion';

export type EstadoConcertacion = 'ENVIADA' | 'REVISADA' | 'APROBADA' | 'DEVUELTA' | 'POR_ACEPTAR' | 'ACEPTADA' | 'NOVEDAD';

export interface ConfiguracionConcertacion {
  habilitada: boolean;
  /** Primer periodo (AAAA-S) en que la Docencia se concerta; antes de él la aprueba el PTA. */
  desdePeriodo?: string | null;
  firmaSimulada: boolean;
  revisionesRequeridas: string[];
}

export interface FirmaConcertacion {
  rol: 'docente' | 'revisor' | 'aprobador';
  firmadoEn: string;
  modoOtp: 'simulado' | 'real';
}

export interface ConcertacionDocente {
  idConcertacion: string;
  nivel: 'pregrado' | 'posgrado';
  estado: EstadoConcertacion;
  horas: number;
  comentario: string | null;
  firmas: FirmaConcertacion[];
  franjas?: { idFranja: string; idGrupo: string; codigoAsignatura: string; asignatura: string; horas: number }[];
  novedad?: { tipo: TipoNovedad; justificacion: string; creadaEn: string } | null;
  actualizadaEn?: string;
}

export interface ConcertacionBandeja {
  idConcertacion: string;
  idPeriodo: string;
  /** Código del periodo (AAAA-S), para mostrarlo (aditivo). */
  periodoCodigo?: string | null;
  nivel: 'pregrado' | 'posgrado';
  estado: EstadoConcertacion;
  horas: number;
  numFranjas: number;
  franjas: Array<{ idFranja: string; codigoAsignatura: string; asignatura: string; horas: number }>;
  docente: string;
  documento: string;
  revisiones: string[];
  /** Registro de firmas hasta ahora (aditivo). */
  firmas?: FirmaConcertacion[];
  puede: { revisar: string[]; aprobar: boolean; devolver: boolean };
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getApiGatewayBaseUrl()}${BASE}${ruta}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    let detalle = '';
    try { const c = await res.json(); detalle = c?.message || ''; } catch { /* sin cuerpo útil */ }
    throw new Error(detalle || `No se pudo completar la operación de concertación (error ${res.status}).`);
  }
  const cuerpo = await res.json();
  return (cuerpo?.data ?? cuerpo) as T;
}

/** Recursos que cambian cuando cambia una concertación. */
const RECURSOS = ['programacion', 'horarios', 'portal-docente', 'acumulado', 'jefatura', 'concertacion'];

export function getConfiguracionConcertacion(): Promise<ConfiguracionConcertacion> {
  return pedir('/configuracion');
}

export function getMiConcertacion(idPeriodo: string): Promise<ConcertacionDocente[]> {
  return pedir(`/mia?periodo=${encodeURIComponent(idPeriodo)}`);
}

export function getBandejaConcertacion(idPeriodo?: string): Promise<ConcertacionBandeja[]> {
  return pedir(`/bandeja${idPeriodo ? `?periodo=${encodeURIComponent(idPeriodo)}` : ''}`);
}

export async function revisarConcertacion(id: string, codigo: string, tipo = 'academica') {
  const r = await pedir(`/${encodeURIComponent(id)}/revisar`, { method: 'POST', body: JSON.stringify({ tipo, codigo }) });
  invalidarProgramacion(...RECURSOS);
  return r;
}

export async function devolverConcertacion(id: string, comentario: string) {
  const r = await pedir(`/${encodeURIComponent(id)}/devolver`, { method: 'POST', body: JSON.stringify({ comentario }) });
  invalidarProgramacion(...RECURSOS);
  return r;
}

export async function aprobarConcertacion(id: string, codigo: string) {
  const r = await pedir(`/${encodeURIComponent(id)}/aprobar`, { method: 'POST', body: JSON.stringify({ codigo }) });
  invalidarProgramacion(...RECURSOS);
  return r;
}

export type TipoNovedad = 'investigacion' | 'movilidad' | 'perfil' | 'otra';
/** §23.3: foto enviada por nivel, comentario de devolución y novedad del docente. */
export interface RevisionProgramador {
  idConcertacion: string;
  documento: string;
  docente: string;
  nivel: 'pregrado' | 'posgrado';
  estado: EstadoConcertacion;
  horas: number;
  numFranjas: number;
  comentario: string | null;
  actualizadaEn: string;
  novedad: { tipo: TipoNovedad; justificacion: string; creadaEn: string } | null;
}
export function getRevisionProgramador(idPeriodo: string): Promise<RevisionProgramador[]> {
  return pedir(`/programador?periodo=${encodeURIComponent(idPeriodo)}`);
}
export async function enviarDocenciaARevision(idPeriodo: string, documento: string): Promise<RevisionProgramador[]> {
  const r = await pedir<RevisionProgramador[]>('/enviar', { method: 'POST', body: JSON.stringify({ idPeriodo, documento }) });
  invalidarProgramacion(...RECURSOS);
  return r;
}
export async function aceptarProgramacion(id: string, codigo: string) {
  const r = await pedir(`/${encodeURIComponent(id)}/aceptar`, { method: 'POST', body: JSON.stringify({ codigo }) });
  invalidarProgramacion(...RECURSOS);
  return r;
}
export async function reportarNovedad(id: string, tipo: TipoNovedad, justificacion: string) {
  const r = await pedir(`/${encodeURIComponent(id)}/novedad`, { method: 'POST', body: JSON.stringify({ tipo, justificacion }) });
  invalidarProgramacion(...RECURSOS);
  return r;
}
