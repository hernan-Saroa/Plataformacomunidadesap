import { pedirJson } from './catalogoApi';

/**
 * Clientes de las vistas de la programación — EFDS-2344 (árbol) y EFDS-2343
 * (calendario del docente). Contratos en INTEGRACION-claude.md §19; los tipos
 * reflejan exactamente lo que devuelve el servidor.
 */

const BASE = '/programacion-academica/api/v1';

export type TipoVinculacion = 'carrera' | 'ocasional' | 'especial' | 'catedra' | 'periodo_prueba' | 'otra';
export interface Vinculacion { tipo: TipoVinculacion; texto: string }

export interface PeriodoVista {
  id: string;
  codigo: string | null;
  estado: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
}

export interface FranjaArbol {
  idFranja: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipoSesion: string;
  jornada: string | null;
  aulaCodigo: string | null;
  estado: string;
  idDocente: string | null;
}

export interface DocenteDelGrupo {
  idDocente: string;
  documento: string | null;
  nombre: string | null;
  vinculacion: Vinculacion | null;
  fraccion: number;
  /** null si el cálculo de horas (contrato con el PTA) no respondió. */
  horas: number | null;
}

export interface GrupoArbol {
  idGrupo: string;
  numeroGrupo: number;
  estado: string;
  tipoOferta: string | null;
  cicloInicio: string | null;
  cicloFin: string | null;
  cupoMaximo: number;
  oferta: {
    idOfertaCetap: string;
    cetap: { id: string; codigo: string; nombre: string };
    territorial: { codigo: string | null; nombre: string | null };
  } | null;
  horas: { programadas: number | null; requeridas: number | null; semanas: number | null; excede: boolean };
  estadoFranjas: Record<'PROGRAMADO' | 'PUBLICADA' | 'TOMADA' | 'APROBADA' | 'DEVUELTA', number>;
  docentes: DocenteDelGrupo[];
  franjas: FranjaArbol[];
}

export interface AsignaturaArbol {
  idAsignatura: string;
  codigo: string;
  nombre: string;
  semestre: number | null;
  creditos: number | null;
  horasClase: number | null;
  area: { id: string; codigo: string; nombre: string } | null;
  grupos: GrupoArbol[];
}

export interface ProgramaArbol {
  idPrograma: string;
  codigo: string | null;
  nombre: string;
  nivel: 'pregrado' | 'posgrado';
  tipo: string | null;
  asignaturas: AsignaturaArbol[];
}

export interface ArbolProgramacion {
  periodo: PeriodoVista;
  resumen: { programas: number; asignaturas: number; grupos: number; franjas: number; franjasSinDocente: number };
  programas: ProgramaArbol[];
}

export interface FranjaCalendario {
  idFranja: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  /** true: de un nivel que el usuario no ve; solo se sabe que está ocupado (los demás campos vienen null). */
  reservada: boolean;
  idGrupo: string | null;
  numeroGrupo: number | null;
  tipoOferta: string | null;
  cicloInicio: string | null;
  cicloFin: string | null;
  idAsignatura: string | null;
  codigoAsignatura: string | null;
  asignatura: string | null;
  programa: string | null;
  nivel: 'pregrado' | 'posgrado' | null;
  aulaCodigo: string | null;
  tipoSesion: string | null;
  jornada: string | null;
  estado: string | null;
}

export interface CalendarioDocente {
  docente: { idDocente: string; documento: string | null; nombre: string | null; vinculacion: Vinculacion | null };
  periodo: PeriodoVista;
  horas: { total: number | null; tope: number | null };
  /** Horas del docente en cada grupo visible (cálculo único). */
  horasPorGrupo: Record<string, number | null>;
  franjas: FranjaCalendario[];
}

export interface DocenteBuscado {
  idDocente: string;
  documento: string | null;
  nombre: string | null;
  vinculacion: Vinculacion | null;
  horas: number | null;
  franjas: number;
}

const qs = (o: Record<string, string | undefined | boolean>) =>
  Object.entries(o).filter(([, v]) => v !== undefined && v !== '' && v !== false)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

export interface MisPermisos {
  ver: Array<'pregrado' | 'posgrado'>;
  programar: Array<'pregrado' | 'posgrado'>;
  asignar: Array<'pregrado' | 'posgrado'>;
  disponibilidad: boolean;
}

/** EFDS-2342 · qué niveles ve, programa y asigna el usuario (solo para la pantalla; el servidor decide). */
export function getMisPermisos(): Promise<MisPermisos> {
  return pedirJson<MisPermisos>(`${BASE}/programacion/mis-permisos`, { method: 'GET' });
}

/** EFDS-2344 · árbol programa → asignatura → grupo → franjas del periodo (niveles visibles). */
export function getArbolProgramacion(filtros: {
  periodo: string; nivel?: 'pregrado' | 'posgrado'; programa?: string; tipoOferta?: string; soloSinDocente?: boolean;
}): Promise<ArbolProgramacion> {
  return pedirJson<ArbolProgramacion>(`${BASE}/programacion/arbol?${qs(filtros)}`, { method: 'GET' });
}

/** EFDS-2343 · buscador de docentes (cédula o nombre; sin texto, los que tienen franjas en el periodo). */
export function buscarDocentes(periodo: string, q?: string): Promise<DocenteBuscado[]> {
  return pedirJson<DocenteBuscado[]>(`${BASE}/programacion/docentes?${qs({ periodo, q })}`, { method: 'GET' });
}

/** EFDS-2343 · calendario semanal de un docente (backoffice). */
export function getCalendarioDocente(periodo: string, docente: { documento?: string; idDocente?: string }): Promise<CalendarioDocente> {
  return pedirJson<CalendarioDocente>(`${BASE}/programacion/docentes/calendario?${qs({ periodo, ...docente })}`, { method: 'GET' });
}

/** EFDS-2343/2348 · calendario del docente autenticado (portal). Sin periodo, el en curso. */
export function getMiCalendario(periodo?: string): Promise<CalendarioDocente> {
  return pedirJson<CalendarioDocente>(`${BASE}/portal-docente/mi-calendario?${qs({ periodo })}`, { method: 'GET' });
}

/** EFDS-2348 · qué flujo rige: con `tomaFranjas: false` el docente recibe su programación asignada. */
export function getConfiguracionPortal(): Promise<{ tomaFranjas: boolean }> {
  return pedirJson<{ tomaFranjas: boolean }>(`${BASE}/portal-docente/configuracion`, { method: 'GET' });
}
