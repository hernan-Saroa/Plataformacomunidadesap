import { EntityManager } from 'typeorm';

import { Accion } from './alcance';

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
 */
const ACCION_QUE_HACE: Readonly<Record<string, Exclude<Accion, 'ver'>>> = {
  '3.6': 'aprobar',
  '3.7': 'aprobar',
};

export function accionQueHace(numeral: string): Exclude<Accion, 'ver'> {
  return ACCION_QUE_HACE[numeral] ?? 'editar';
}

/** La regla que rige: la de la modalidad manda sobre la general. */
export async function reglaLaHace(
  em: EntityManager,
  numeral: string,
  modalidad: string | null,
): Promise<LaHace | null> {
  const filas: { modalidad: string | null; config: Record<string, unknown> }[] = await em.query(
    `SELECT modalidad, config FROM hiring.reglas_actividad
      WHERE numeral = $1 AND tipo = 'LA_HACE' AND vigente_hasta IS NULL
        AND (modalidad IS NULL OR modalidad = $2)`,
    [numeral, modalidad],
  );
  const fila = filas.find((f) => f.modalidad) ?? filas[0];
  return fila ? leerLaHace(fila.config) : null;
}

/** Todas las reglas vigentes, para resolver muchas actividades de una vez. */
export async function reglasLaHace(
  em: EntityManager,
): Promise<{ numeral: string; modalidad: string | null; regla: LaHace }[]> {
  const filas: { numeral: string; modalidad: string | null; config: Record<string, unknown> }[] = await em.query(
    `SELECT numeral, modalidad, config FROM hiring.reglas_actividad
      WHERE tipo = 'LA_HACE' AND vigente_hasta IS NULL`,
  );
  return filas
    .map((f) => ({ numeral: f.numeral, modalidad: f.modalidad, regla: leerLaHace(f.config) }))
    .filter((f): f is { numeral: string; modalidad: string | null; regla: LaHace } => !!f.regla);
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
