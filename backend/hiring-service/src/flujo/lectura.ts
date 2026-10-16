import { EntityManager } from 'typeorm';

import type { LaHace } from '../auth/la-hace';

/**
 * Lectura de las versiones del flujo (migración 111), sin inyección de
 * dependencias: la usan el guard, las cadenas, los avisos y los puestos, y
 * ninguno debería depender de un módulo para preguntar algo a la base.
 *
 * Una versión dice, por actividad y por modalidad, quién la hace y quién la
 * aprueba. La fila sin modalidad es la general; la de una modalidad la
 * reemplaza solo ahí. NULL en una columna es «hereda la general».
 */

export type EstadoVersion = 'BORRADOR' | 'ACTIVA' | 'RETIRADA';

/** Quién hace la actividad, tal como se guarda. */
export type LaHaceGuardada =
  | { tipo: 'PERMISO' }
  | { tipo: 'PUESTO'; puestoId: string }
  | { tipo: 'PERSONAS'; personas: string[] };

/** Quién la aprueba, tal como se guarda. */
export type AprobacionGuardada =
  | { tipo: 'NINGUNA' }
  | { tipo: 'CADENA'; cadenaId: string }
  | { tipo: 'ESCALON'; roles: string[]; personas: string[]; puestos: string[] };

export interface FilaAsignacion {
  numeral: string;
  modalidad: string | null;
  laHace: LaHaceGuardada | null;
  aprobacion: AprobacionGuardada | null;
}

/** Lo que rige en una actividad para una modalidad, y de dónde sale. */
export interface AsignacionEfectiva {
  laHace: LaHaceGuardada;
  aprobacion: AprobacionGuardada;
  /** Si lo de la modalidad reemplaza a lo general en cada columna. */
  propiaDeLaModalidad: { laHace: boolean; aprobacion: boolean };
}

const POR_PERMISO: LaHaceGuardada = { tipo: 'PERMISO' };
const SIN_APROBACION: AprobacionGuardada = { tipo: 'NINGUNA' };

/**
 * Lo que rige: la fila de la modalidad, columna por columna, y si no dice
 * nada, la general; sin ninguna de las dos, por permiso y sin aprobación.
 */
export function asignacionQueRige(
  filas: FilaAsignacion[],
  numeral: string,
  modalidad: string | null,
): AsignacionEfectiva {
  const general = filas.find((f) => f.numeral === numeral && f.modalidad === null);
  const propia = modalidad ? filas.find((f) => f.numeral === numeral && f.modalidad === modalidad) : undefined;
  return {
    laHace: propia?.laHace ?? general?.laHace ?? POR_PERMISO,
    aprobacion: propia?.aprobacion ?? general?.aprobacion ?? SIN_APROBACION,
    propiaDeLaModalidad: { laHace: !!propia?.laHace, aprobacion: !!propia?.aprobacion },
  };
}

/** La regla «quién la hace» en la forma que entiende el resto del módulo. */
export function aLaHace(guardada: LaHaceGuardada): LaHace | null {
  if (guardada.tipo === 'PUESTO') return { puestoId: guardada.puestoId };
  if (guardada.tipo === 'PERSONAS' && guardada.personas.length) return { personas: guardada.personas };
  return null;
}

/** La aprobación en la forma de `config` que lee `leerConfigDeRegla`. */
export function aConfigDeAprobacion(guardada: AprobacionGuardada): Record<string, unknown> | null {
  if (guardada.tipo === 'CADENA') return { cadenaId: guardada.cadenaId };
  if (guardada.tipo === 'ESCALON') {
    return { roles: guardada.roles ?? [], personas: guardada.personas ?? [], puestos: guardada.puestos ?? [] };
  }
  return null;
}

// ---------------------------------------------------------------- base --

export async function versionActiva(em: EntityManager): Promise<string | null> {
  const [fila] = await em.query(`SELECT id::text AS id FROM hiring.flujo_versiones WHERE estado = 'ACTIVA'`);
  return fila?.id ?? null;
}

export async function versionBorrador(em: EntityManager): Promise<string | null> {
  const [fila] = await em.query(`SELECT id::text AS id FROM hiring.flujo_versiones WHERE estado = 'BORRADOR'`);
  return fila?.id ?? null;
}

/** La versión con la que corre el proceso; la activa si el proceso no tiene. */
export async function versionDelProceso(em: EntityManager, procesoId: string): Promise<string | null> {
  const [fila] = await em.query(
    `SELECT COALESCE(p.flujo_version_id, (SELECT id FROM hiring.flujo_versiones WHERE estado = 'ACTIVA'))::text AS id
       FROM hiring.procesos p WHERE p.id::text = $1`,
    [procesoId],
  );
  return fila?.id ?? (await versionActiva(em));
}

/** Las versiones de varios procesos, de una vez. */
export async function versionesDeProcesos(em: EntityManager, procesoIds: string[]): Promise<Map<string, string>> {
  if (!procesoIds.length) return new Map();
  const filas: { id: string; version: string | null }[] = await em.query(
    `SELECT p.id::text AS id,
            COALESCE(p.flujo_version_id, (SELECT id FROM hiring.flujo_versiones WHERE estado = 'ACTIVA'))::text AS version
       FROM hiring.procesos p WHERE p.id::text = ANY($1::text[])`,
    [procesoIds],
  );
  return new Map(filas.filter((f) => f.version).map((f) => [f.id, f.version as string]));
}

export async function filasDeVersion(
  em: EntityManager,
  versionId: string | null,
  numeral?: string,
): Promise<FilaAsignacion[]> {
  if (!versionId) return [];
  const filas: { numeral: string; modalidad: string | null; la_hace: any; aprobacion: any }[] = await em.query(
    `SELECT numeral, modalidad, la_hace, aprobacion FROM hiring.flujo_asignaciones
      WHERE version_id::text = $1 AND ($2::text IS NULL OR numeral = $2)`,
    [versionId, numeral ?? null],
  );
  return filas.map((f) => ({ numeral: f.numeral, modalidad: f.modalidad, laHace: f.la_hace, aprobacion: f.aprobacion }));
}

/**
 * Lo que rige en una actividad: para el proceso, con su versión; sin proceso,
 * con la activa.
 */
export async function asignacionPara(
  em: EntityManager,
  numeral: string,
  modalidad: string | null,
  procesoId?: string | null,
): Promise<AsignacionEfectiva> {
  const version = procesoId ? await versionDelProceso(em, procesoId) : await versionActiva(em);
  return asignacionQueRige(await filasDeVersion(em, version, numeral), numeral, modalidad);
}

/** Por versión, todas sus filas: para resolver muchas actividades de una vez. */
export async function filasDeVersiones(em: EntityManager, versiones: string[]): Promise<Map<string, FilaAsignacion[]>> {
  const unicas = [...new Set(versiones)];
  const mapa = new Map<string, FilaAsignacion[]>();
  for (const v of unicas) mapa.set(v, await filasDeVersion(em, v));
  return mapa;
}
