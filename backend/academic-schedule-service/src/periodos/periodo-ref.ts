/**
 * Referencia a un periodo — EFDS-2328 (periodo único de plataforma).
 *
 * Conviven dos modelos mientras dure la transición:
 *   · plataforma — `academic_work_plan.periodo_academico` (el del PTA). Su id
 *                  es un BIGINT y viaja como texto ("12"). Es el modelo nuevo.
 *   · legado     — `"academic-schedule".periodo_programacion`, id UUID. Quedan
 *                  aquí los periodos sin equivalencia (2026-INT, pruebas).
 *
 * El cliente recibe el `idPeriodo` de `GET /periodos` y lo devuelve tal cual: el
 * servidor distingue el modelo por la forma del id. Nunca por el código ni por
 * el nombre.
 */
export type RefPeriodo =
  | { modelo: 'plataforma'; id: string }
  | { modelo: 'legado'; id: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTERO = /^[1-9][0-9]{0,17}$/;

export function parsearPeriodo(valor: unknown): RefPeriodo | null {
  const v = valor == null ? '' : String(valor).trim();
  if (ENTERO.test(v)) return { modelo: 'plataforma', id: v };
  if (UUID.test(v)) return { modelo: 'legado', id: v };
  return null;
}

/**
 * Condición SQL "el grupo `alias` es de este periodo". Parámetro en `$indice`.
 * Un grupo es de plataforma si tiene `id_periodo_academico`; si no, sigue en el
 * periodo legado.
 */
export function condicionPeriodoGrupo(alias: string, ref: RefPeriodo, indice: number): string {
  return ref.modelo === 'plataforma'
    ? `${alias}.id_periodo_academico = $${indice}::bigint`
    : `(${alias}.id_periodo = $${indice}::uuid AND ${alias}.id_periodo_academico IS NULL)`;
}
