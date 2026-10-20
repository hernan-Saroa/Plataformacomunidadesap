/**
 * LA regla de choque. Una sola, para todos los caminos.
 *
 *   Dos franjas chocan solo si coinciden TODAS estas:
 *     1. el mismo día de la semana,
 *     2. horas que se solapan (tocarse en el extremo no es solapar), y
 *     3. ciclos de clases que se solapan en FECHAS.
 *
 * El ciclo de una franja es el de su GRUPO (`grupo.fecha_inicio`/`fecha_fin`); si el
 * grupo no tiene ciclo, el del PERIODO al que pertenece. Dos clases en el mismo salón,
 * el mismo día y a la misma hora, pero en periodos o semanas distintos, no se cruzan:
 * ignorar las fechas dejaba el aula «ocupada» para siempre al cambiar de periodo.
 *
 * Es la misma regla del histórico de cruces (`ValidacionService.crucesHistoricos`).
 * La usan: crear una franja, la disponibilidad de aulas, la validación de cruces
 * vivos, la publicación, la asignación de docentes y el portal del docente. No hay
 * otra implementación: quien la necesite importa `chocan` o `encontrarCruces`.
 *
 * Sin fechas conocidas (ni del grupo ni del periodo) no se puede descartar el choque:
 * se trata como solapado, que es el lado seguro.
 */
import { seSolapan, type FranjaComparable } from './solapamiento.js';
import type { RefPeriodo } from '../periodos/periodo-ref.js';

/** Fechas ISO `YYYY-MM-DD`. `null` = desconocida. */
export interface CicloFechas {
  cicloInicio: string | null;
  cicloFin: string | null;
}

export interface FranjaConCiclo extends FranjaComparable, CicloFechas {}

/** ¿Se solapan dos ciclos de clases? Los extremos que se tocan sí se solapan (mismo día). */
export function ciclosSeSolapan(a: CicloFechas, b: CicloFechas): boolean {
  if (!a.cicloInicio || !a.cicloFin || !b.cicloInicio || !b.cicloFin) return true;
  return a.cicloInicio <= b.cicloFin && b.cicloInicio <= a.cicloFin;
}

/** ¿Chocan dos franjas? Día + horas + ciclo. La definición única de «choque». */
export function chocan(a: FranjaConCiclo, b: FranjaConCiclo): boolean {
  return (
    a.diaSemana === b.diaSemana
    && seSolapan(a.horaInicio, a.horaFin, b.horaInicio, b.horaFin)
    && ciclosSeSolapan(a, b)
  );
}

/** Primera franja de `existentes` que choca con la propuesta, o null. */
export function buscarChoque<T extends FranjaConCiclo>(
  propuesta: FranjaConCiclo,
  existentes: T[],
  ignorar?: (f: T) => boolean,
): T | null {
  for (const f of existentes) {
    if (ignorar?.(f)) continue;
    if (chocan(propuesta, f)) return f;
  }
  return null;
}

// ─── Carga de franjas con su ciclo efectivo (SQL compartido) ────────────────────────

/** Ciclo efectivo: el del grupo; si no tiene, el del periodo (de plataforma o legado). */
export const SQL_CICLO_EFECTIVO = `
  to_char(COALESCE(g.fecha_inicio, pa.fecha_inicio, pp.fecha_inicio), 'YYYY-MM-DD') AS "cicloInicio",
  to_char(COALESCE(g.fecha_fin, pa.fecha_fin, pp.fecha_fin), 'YYYY-MM-DD')         AS "cicloFin"`;

/** Une la franja `f` con su grupo `g` y los periodos `pa` / `pp`. */
export const SQL_JOIN_CICLO = `
  LEFT JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
  LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
  LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo`;

export interface FranjaCruceable extends FranjaConCiclo {
  idFranja: string;
  idGrupo: string | null;
  aulaCodigo: string | null;
  idDocente: string | null;
  estado: string;
  /** Periodo efectivo del grupo (plataforma o legado), como texto. */
  idPeriodo: string | null;
}

export interface EjecutorSql {
  query(sql: string, params?: any[]): Promise<any[]>;
}

/**
 * Franjas con su ciclo efectivo. `where` usa los alias `f` (franja), `g` (grupo),
 * `pa` y `pp` (periodos). Lo único que cambia entre los caminos es el filtro; el
 * cálculo del ciclo es este.
 */
export async function cargarFranjasCruceables(
  ejecutor: EjecutorSql,
  where: string,
  params: any[] = [],
): Promise<FranjaCruceable[]> {
  const filas = await ejecutor.query(
    `SELECT f.id_franja                     AS "idFranja",
            f.id_grupo                       AS "idGrupo",
            f.aula_codigo                    AS "aulaCodigo",
            f.id_docente::text               AS "idDocente",
            f.dia_semana                     AS "diaSemana",
            left(f.hora_inicio::text, 5)     AS "horaInicio",
            left(f.hora_fin::text, 5)        AS "horaFin",
            f.estado                         AS "estado",
            COALESCE(g.id_periodo_academico::text, g.id_periodo::text) AS "idPeriodo",
            ${SQL_CICLO_EFECTIVO}
       FROM "academic-schedule".franja_horaria f
       ${SQL_JOIN_CICLO}
      WHERE ${where}`,
    params,
  );
  return filas.map((f: any) => ({
    idFranja: f.idFranja,
    idGrupo: f.idGrupo ?? null,
    aulaCodigo: f.aulaCodigo ?? null,
    idDocente: f.idDocente ?? null,
    diaSemana: f.diaSemana,
    horaInicio: f.horaInicio,
    horaFin: f.horaFin,
    estado: f.estado,
    idPeriodo: f.idPeriodo ?? null,
    cicloInicio: f.cicloInicio ?? null,
    cicloFin: f.cicloFin ?? null,
  }));
}

/** Ciclo efectivo de un grupo (el suyo, o el de su periodo). */
export async function cicloDelGrupo(ejecutor: EjecutorSql, idGrupo: string): Promise<CicloFechas> {
  const filas = await ejecutor.query(
    `SELECT ${SQL_CICLO_EFECTIVO}
       FROM "academic-schedule".grupo g
       LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
       LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo
      WHERE g.id_grupo = $1`,
    [idGrupo],
  );
  return { cicloInicio: filas[0]?.cicloInicio ?? null, cicloFin: filas[0]?.cicloFin ?? null };
}

/** Ciclo efectivo de un periodo (sus fechas), de plataforma o legado. */
export async function cicloDelPeriodo(ejecutor: EjecutorSql, ref: RefPeriodo): Promise<CicloFechas> {
  const filas = await ejecutor.query(
    ref.modelo === 'plataforma'
      ? `SELECT to_char(fecha_inicio, 'YYYY-MM-DD') AS "cicloInicio", to_char(fecha_fin, 'YYYY-MM-DD') AS "cicloFin"
           FROM academic_work_plan.periodo_academico WHERE id = $1::bigint`
      : `SELECT to_char(fecha_inicio, 'YYYY-MM-DD') AS "cicloInicio", to_char(fecha_fin, 'YYYY-MM-DD') AS "cicloFin"
           FROM "academic-schedule".periodo_programacion WHERE id_periodo = $1::uuid`,
    [ref.id],
  );
  return { cicloInicio: filas[0]?.cicloInicio ?? null, cicloFin: filas[0]?.cicloFin ?? null };
}

// ─── Cruces entre pares de franjas ──────────────────────────────────────────────────

export type TipoCruce = 'grupo' | 'aula' | 'docente';

export interface ParCruce {
  tipo: TipoCruce;
  a: FranjaCruceable;
  b: FranjaCruceable;
  dia: string;
  /** Tramo común de las dos franjas. */
  horaInicio: string;
  horaFin: string;
  /** Aula en conflicto (tipo 'aula'), docente (tipo 'docente') o null (tipo 'grupo'). */
  recurso: string | null;
}

/**
 * Todos los pares de franjas que chocan por grupo, aula o docente. Misma regla que
 * `chocan`: aquí solo se agrupa. Un par puede dar varios tipos (mismo aula y mismo
 * docente). Lo virtual (sin aula) no cruza por aula; el docente sí cruza aunque sea
 * virtual: nadie dicta dos clases a la vez.
 *
 * `filtro` deja acotar a los pares en que al menos una franja cumple algo (p. ej.
 * «es del periodo» o «es de las que se publican»).
 */
export function encontrarCruces(
  franjas: FranjaCruceable[],
  filtro?: (a: FranjaCruceable, b: FranjaCruceable) => boolean,
): ParCruce[] {
  const porDia = new Map<string, FranjaCruceable[]>();
  for (const f of franjas) {
    const lista = porDia.get(f.diaSemana);
    if (lista) lista.push(f); else porDia.set(f.diaSemana, [f]);
  }

  const cruces: ParCruce[] = [];
  for (const lista of porDia.values()) {
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const a = lista[i], b = lista[j];
        if (!chocan(a, b)) continue;
        if (filtro && !filtro(a, b)) continue;
        const horaInicio = a.horaInicio > b.horaInicio ? a.horaInicio : b.horaInicio;
        const horaFin = a.horaFin < b.horaFin ? a.horaFin : b.horaFin;
        const base = { a, b, dia: a.diaSemana, horaInicio, horaFin };
        if (a.idGrupo && a.idGrupo === b.idGrupo) cruces.push({ ...base, tipo: 'grupo', recurso: null });
        if (a.aulaCodigo && a.aulaCodigo === b.aulaCodigo) cruces.push({ ...base, tipo: 'aula', recurso: a.aulaCodigo });
        if (a.idDocente && a.idDocente === b.idDocente) cruces.push({ ...base, tipo: 'docente', recurso: a.idDocente });
      }
    }
  }
  return cruces;
}
