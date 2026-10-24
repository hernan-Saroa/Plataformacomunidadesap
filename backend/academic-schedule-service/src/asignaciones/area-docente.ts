import type { DataSource, EntityManager } from 'typeorm';

/**
 * Área de formación: docente ↔ asignatura — EFDS-2341 (HU EFDS-2371).
 *
 * ⚠️ NADIE SE ASIGNA FUERA DE SU ÁREA (decisión 6). El área de la asignatura sale
 * de la función SQL única `academic_work_plan.area_de_asignatura` (migración 671);
 * las del docente, de `academic_work_plan.docente_nucleo` (migración 669), que el
 * PTA llena desde el RUND (origen `rund`) y desde el puente (origen `puente`).
 *
 * ⚠️ INTERRUPTOR DEL PUENTE: PROG_NUCLEO_PUENTE.
 *   · sin definir o distinto de 'false' → el puente cuenta, pero SOLO para quien no
 *     tiene núcleo del RUND: el puente cubre a los catedráticos mientras el RUND no
 *     traiga su núcleo; no amplía el área de un docente que ya la tiene en el RUND.
 *   · 'false' → solo cuenta el RUND.
 */
export function puenteDeNucleoHabilitado(): boolean {
  return String(process.env.PROG_NUCLEO_PUENTE ?? '').trim().toLowerCase() !== 'false';
}

type Consultor = Pick<DataSource | EntityManager, 'query'>;

export interface AreaFormacion {
  idArea: number;
  codigo: string;
  nombre: string;
}

export interface NucleoDocente extends AreaFormacion {
  origen: 'rund' | 'puente';
  texto: string | null;
}

/** Área de la asignatura del grupo; null si no tiene (nadie es apto). */
export async function areaDelGrupo(q: Consultor, idGrupo: string): Promise<(AreaFormacion & { nucleoAsignatura: string | null }) | null> {
  const filas = await q.query(
    `SELECT af.id AS id_area, af.codigo, af.nombre, nt.nombre AS nucleo
       FROM "academic-schedule".grupo g
       JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
       LEFT JOIN academic_work_plan.nucleo_tematico nt ON nt.id = a.id_nucleo_tematico
       LEFT JOIN academic_work_plan.area_formacion af ON af.id = academic_work_plan.area_de_asignatura(a.id)
      WHERE g.id_grupo = $1`,
    [idGrupo],
  );
  const f = filas?.[0];
  if (!f?.id_area) return null;
  return { idArea: Number(f.id_area), codigo: f.codigo, nombre: f.nombre, nucleoAsignatura: f.nucleo ?? null };
}

/** Condición SQL de los núcleos que cuentan, sobre `dn` (docente_nucleo), según el interruptor. */
function sqlNucleoVigente(): string {
  return puenteDeNucleoHabilitado()
    ? `(dn.origen = 'rund' OR (dn.origen = 'puente' AND NOT EXISTS (
          SELECT 1 FROM academic_work_plan.docente_nucleo r WHERE r.id_persona = dn.id_persona AND r.origen = 'rund')))`
    : `dn.origen = 'rund'`;
}

/** Núcleos vigentes de varios docentes, por id de persona. */
export async function nucleosDeDocentes(q: Consultor, idsDocente: string[]): Promise<Map<string, NucleoDocente[]>> {
  const mapa = new Map<string, NucleoDocente[]>();
  if (!idsDocente.length) return mapa;
  const filas = await q.query(
    `SELECT dn.id_persona::text AS id_persona, af.id AS id_area, af.codigo, af.nombre, dn.origen, dn.texto_origen
       FROM academic_work_plan.docente_nucleo dn
       JOIN academic_work_plan.area_formacion af ON af.id = dn.id_area
      WHERE dn.id_persona = ANY($1::uuid[]) AND ${sqlNucleoVigente()}
      ORDER BY af.codigo, dn.origen`,
    [idsDocente],
  );
  for (const f of filas) {
    const lista = mapa.get(f.id_persona) ?? [];
    lista.push({ idArea: Number(f.id_area), codigo: f.codigo, nombre: f.nombre, origen: f.origen, texto: f.texto_origen ?? null });
    mapa.set(f.id_persona, lista);
  }
  return mapa;
}

/** Personas con núcleo vigente en el área. */
export async function docentesDelArea(q: Consultor, idArea: number): Promise<string[]> {
  const filas = await q.query(
    `SELECT DISTINCT dn.id_persona::text AS id_persona
       FROM academic_work_plan.docente_nucleo dn
      WHERE dn.id_area = $1 AND ${sqlNucleoVigente()}`,
    [idArea],
  );
  return filas.map((f: any) => f.id_persona);
}

/** Motivo de bloqueo por área, o null si el docente es del área de la asignatura. */
export function motivoDeArea(area: AreaFormacion | null, nucleos: NucleoDocente[]): { regla: string; mensaje: string } | null {
  if (!area) {
    return { regla: 'AREA', mensaje: 'La asignatura no tiene área de formación: no se puede asignar docente hasta que la tenga.' };
  }
  if (!nucleos.length) {
    return { regla: 'AREA', mensaje: 'El docente no tiene núcleo temático registrado: no se le puede asignar docencia.' };
  }
  if (!nucleos.some((n) => n.idArea === area.idArea)) {
    return {
      regla: 'AREA',
      mensaje: `El docente no es del área «${area.nombre}» (sus áreas: ${[...new Set(nucleos.map((n) => n.nombre))].join(', ')}).`,
    };
  }
  return null;
}
