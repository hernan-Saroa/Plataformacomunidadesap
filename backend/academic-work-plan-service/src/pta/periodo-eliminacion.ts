/**
 * Eliminar un periodo de la plataforma (bug QA, 18 nov 2026: «no deja eliminar periodos»).
 *
 * Antes solo el superusuario podía, y cualquier oferta de catálogo lo impedía: un periodo
 * de prueba con su catálogo cargado no se podía quitar nunca. Ahora:
 *   · lo elimina quien CREA periodos (`programacion-academica.periodos.gestionar` o `.all`);
 *   · NUNCA el periodo en curso (primero se desactiva o se activa otro);
 *   · NUNCA si tiene PTA de docentes: son planes de trabajo reales, con firmas;
 *   · si no los tiene, se va TODO lo que es del periodo, en UNA transacción: su catálogo
 *     (oferta CETAP × programa, activación de CETAP), su programación (grupos, sesiones,
 *     asignaciones), sus concertaciones, recesos y el estado de su programación. Los
 *     programas que apuntaban a él quedan sin periodo (la llave es ON DELETE SET NULL).
 * Antes de confirmar, la pantalla muestra este impacto (mismo cálculo).
 *
 * Toca tablas del esquema de Programación Académica: misma base y misma transacción, para
 * que no quede un periodo a medio borrar entre dos servicios.
 */
export interface ImpactoEliminacion {
  id: string;
  codigo: string;
  estado: string;
  ptas: number;
  ofertas: number;
  cetaps: number;
  grupos: number;
  sesiones: number;
  concertaciones: number;
  programas: number;
  eliminable: boolean;
  motivo: string | null;
}

interface Consultable { query(sql: string, params?: unknown[]): Promise<any> }

const existe = async (q: Consultable, tabla: string) =>
  !!(await q.query(`SELECT to_regclass($1) IS NOT NULL AS ok`, [tabla]))[0]?.ok;

export async function impactoEliminacion(q: Consultable, p: { id: string; codigo: string; estado: string }): Promise<ImpactoEliminacion> {
  const pa = await existe(q, '"academic-schedule".grupo');
  const [r] = await q.query(
    `SELECT
       (SELECT COUNT(*)::int FROM academic_work_plan."PlanTrabajoAcademico" WHERE periodo = $2) AS ptas,
       (SELECT COUNT(*)::int FROM academic_work_plan.oferta_cetap_programa WHERE id_periodo_academico = $1::bigint) AS ofertas,
       (SELECT COUNT(*)::int FROM academic_work_plan.periodo_cetap WHERE id_periodo_academico = $1::bigint) AS cetaps,
       (SELECT COUNT(*)::int FROM academic_work_plan.programa WHERE id_periodo_academico = $1::bigint) AS programas
       ${pa ? `,
       (SELECT COUNT(*)::int FROM "academic-schedule".grupo WHERE id_periodo_academico = $1::bigint) AS grupos,
       (SELECT COUNT(*)::int FROM "academic-schedule".franja_horaria f JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
         WHERE g.id_periodo_academico = $1::bigint) AS sesiones,
       (SELECT COUNT(*)::int FROM "academic-schedule".concertacion_docencia WHERE periodo_ref = $1::text) AS concertaciones` : ''}`,
    [p.id, p.codigo]);
  const n = (k: string) => Number(r?.[k] ?? 0);
  const ptas = n('ptas');
  const motivo = p.estado === 'en_curso'
    ? `El periodo ${p.codigo} está en curso: desactívelo o active otro antes de eliminarlo.`
    : ptas > 0
      ? `El periodo ${p.codigo} tiene ${ptas} PTA de docentes: no se elimina un periodo con planes de trabajo.`
      : null;
  return {
    id: p.id, codigo: p.codigo, estado: p.estado,
    ptas, ofertas: n('ofertas'), cetaps: n('cetaps'), grupos: n('grupos'), sesiones: n('sesiones'),
    concertaciones: n('concertaciones'), programas: n('programas'),
    eliminable: !motivo, motivo,
  };
}

/** Borra todo lo del periodo y el periodo. Llamar DENTRO de una transacción, tras comprobar el impacto. */
export async function eliminarTodoDelPeriodo(q: Consultable, id: string): Promise<void> {
  if (await existe(q, '"academic-schedule".grupo')) {
    const conc = `SELECT id_concertacion FROM "academic-schedule".concertacion_docencia WHERE periodo_ref = $1::text`;
    if (await existe(q, 'academic_work_plan.docencia_concertada')) {
      await q.query(`DELETE FROM academic_work_plan.docencia_concertada WHERE id_concertacion::text IN (SELECT id_concertacion::text FROM (${conc}) c)`, [id]);
    }
    // revisión, firma, historial y novedad caen en cascada.
    await q.query(`DELETE FROM "academic-schedule".concertacion_docencia WHERE periodo_ref = $1::text`, [id]);
    const grupos = `SELECT id_grupo FROM "academic-schedule".grupo WHERE id_periodo_academico = $1::bigint`;
    await q.query(`DELETE FROM "academic-schedule".asignacion_docente WHERE id_grupo IN (${grupos})`, [id]);
    await q.query(`DELETE FROM "academic-schedule".franja_horaria WHERE id_grupo IN (${grupos})`, [id]);
    await q.query(`DELETE FROM "academic-schedule".grupo WHERE id_periodo_academico = $1::bigint`, [id]);
    await q.query(`DELETE FROM "academic-schedule".programacion_periodo WHERE id_periodo_academico = $1::bigint`, [id]);
    // periodo_receso cae en cascada con el periodo.
  }
  await q.query(`DELETE FROM academic_work_plan.oferta_cetap_programa WHERE id_periodo_academico = $1::bigint`, [id]);
  await q.query(`DELETE FROM academic_work_plan.periodo_cetap WHERE id_periodo_academico = $1::bigint`, [id]);
  await q.query(`DELETE FROM academic_work_plan.periodo_academico WHERE id = $1::bigint`, [id]);
}
