import { EntityManager } from 'typeorm';

import { Accion } from './alcance';
import { aLaHace, asignacionPara } from '../flujo/lectura';

/**
 * Quién hace una actividad (migración 109, regla `LA_HACE`).
 *
 * Sin regla, la hace cualquiera con el permiso de la actividad, que es lo de
 * siempre. Con regla, de los que tienen el permiso solo la hace:
 *
 * - `{ puestoId }`: quien ocupe ese puesto en el proceso, asignado en la 3.3.
 * - `{ personas }`: esas personas del directorio (`id_person`), en todos los
 *   procesos.
 *
 * Nunca da un permiso: solo recorta a quien ya lo tiene. Así los permisos por
 * etapa siguen siendo el único sitio que dice quién PUEDE, y la regla dice
 * quién lo HACE en cada proceso.
 */
export type LaHace = { puestoId: string } | { personas: string[] };

export function leerLaHace(config: Record<string, unknown> | null | undefined): LaHace | null {
  const c = config ?? {};
  if (typeof c.puestoId === 'string' && c.puestoId.trim()) return { puestoId: c.puestoId.trim() };
  const personas = Array.isArray(c.personas)
    ? [...new Set(c.personas.filter((p): p is string => typeof p === 'string' && p.trim() !== ''))]
    : [];
  return personas.length ? { personas } : null;
}

/**
 * La acción que hace la actividad quien la hace.
 *
 * Editar en casi todas. La causal (3.6) y el registro del comité (3.7) se
 * protegen con «aprobar» desde que eran del abogado, y así quedaron sembrados
 * los permisos de cada rol: cambiarlo aquí dejaría sin quien las haga a los
 * procesos en curso.
 *
 * La 5.6.1 (113) va igual: la hace el mismo abogado que la 3.7, y con
 * «editar» el puesto pedía un permiso que los roles de abogado no tienen en la
 * etapa 5 y se quedaba sin candidatos en la 3.3.
 */
const ACCION_QUE_HACE: Readonly<Record<string, Exclude<Accion, 'ver'>>> = {
  '3.6': 'aprobar',
  '3.7': 'aprobar',
  '5.6.1': 'aprobar',
};

export function accionQueHace(numeral: string): Exclude<Accion, 'ver'> {
  return ACCION_QUE_HACE[numeral] ?? 'editar';
}

/**
 * La regla que rige (111): la de la versión del flujo del proceso —o la
 * activa, sin proceso—; la de la modalidad manda sobre la general.
 */
export async function reglaLaHace(
  em: EntityManager,
  numeral: string,
  modalidad: string | null,
  procesoId?: string | null,
): Promise<LaHace | null> {
  return aLaHace((await asignacionPara(em, numeral, modalidad, procesoId)).laHace);
}

/** De una lista de reglas, la que rige para el numeral y la modalidad. */
export function laQueRige(
  reglas: { numeral: string; modalidad: string | null; regla: LaHace }[],
  numeral: string,
  modalidad: string | null,
): LaHace | null {
  const delNumeral = reglas.filter((r) => r.numeral === numeral && (!r.modalidad || r.modalidad === modalidad));
  return (delNumeral.find((r) => r.modalidad) ?? delNumeral[0])?.regla ?? null;
}

/** Por qué alguien con el permiso no hace la actividad en este proceso. */
export type MotivoNoHace = 'SIN_PERMISO' | 'SIN_ASIGNAR' | 'NO_ES_TUYO';

/**
 * La regla pura: permiso primero, después la regla.
 *
 * `ocupante` es quien ocupa el puesto en el proceso (si la regla es de
 * puesto), y `esElOcupante` / `estaEntreLasPersonas` si es quien pregunta.
 */
export function motivoParaNoHacer(args: {
  tienePermiso: boolean;
  regla: LaHace | null;
  hayOcupante: boolean;
  esElOcupante: boolean;
  estaEntreLasPersonas: boolean;
}): MotivoNoHace | null {
  if (!args.tienePermiso) return 'SIN_PERMISO';
  if (!args.regla) return null;
  if ('puestoId' in args.regla) {
    if (!args.hayOcupante) return 'SIN_ASIGNAR';
    return args.esElOcupante ? null : 'NO_ES_TUYO';
  }
  return args.estaEntreLasPersonas ? null : 'NO_ES_TUYO';
}
