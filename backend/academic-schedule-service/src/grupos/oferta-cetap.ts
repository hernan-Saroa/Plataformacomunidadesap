import { BadRequestException } from '@nestjs/common';

/**
 * Oferta CETAP del grupo — EFDS-2315 (migración 040).
 *
 * Dónde se dicta un grupo: una oferta de programa por CETAP y periodo
 * (`academic_work_plan.oferta_cetap_programa`), que crea la carga masiva. De su
 * CETAP sale la territorial que el PTA usa para decidir quién aprueba:
 * `direccion_territorial.codigo` ('DT-009') = `auth.seccionales.cod_seccional`,
 * que escribe la carga masiva de estructura de auth. Cruce por código exacto;
 * si el código no está, o está dos veces, no hay territorial (falla cerrado).
 *
 * No confundir con `tipo_oferta` del grupo (periodo regular, interperiodo…) ni
 * con el módulo `ofertas` (periodos de oferta, EFDS-1375).
 */
export interface OfertaCetap {
  idOfertaCetap: string;
  idPrograma: string;
  idPeriodoAcademico: string;
  cetap: { id: string; codigo: string; nombre: string };
  territorial: { codigo: string | null; nombre: string | null; idSeccional: string | null };
}

interface Consultable { query(sql: string, params?: any[]): Promise<any> }

const SELECT_OFERTA = `
  SELECT o.id::text AS "idOfertaCetap", o.id_programa::text AS "idPrograma",
         o.id_periodo_academico::text AS "idPeriodoAcademico",
         c.id::text AS "idCetap", c.codigo AS "codigoCetap", c.nombre AS "nombreCetap",
         dt.codigo AS "codigoTerritorial", dt.nombre AS "nombreTerritorial",
         (SELECT CASE WHEN COUNT(*) = 1 THEN MIN(sc.id_seccional)::text END
            FROM auth.seccionales sc WHERE sc.cod_seccional = dt.codigo) AS "idSeccional"
    FROM academic_work_plan.oferta_cetap_programa o
    JOIN academic_work_plan.cetap c ON c.id = o.id_cetap
    LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
   WHERE o.activa = TRUE AND o.deleted_at IS NULL`;

function aOferta(f: any): OfertaCetap {
  return {
    idOfertaCetap: f.idOfertaCetap,
    idPrograma: f.idPrograma,
    idPeriodoAcademico: f.idPeriodoAcademico,
    cetap: { id: f.idCetap, codigo: f.codigoCetap, nombre: f.nombreCetap },
    territorial: { codigo: f.codigoTerritorial ?? null, nombre: f.nombreTerritorial ?? null, idSeccional: f.idSeccional ?? null },
  };
}

/** Ofertas CETAP elegibles para un grupo de esta asignatura en este periodo de plataforma. */
export async function ofertasCetapDe(q: Consultable, idAsignatura: string, idPeriodoAcademico: string): Promise<OfertaCetap[]> {
  const filas = await q.query(
    `${SELECT_OFERTA}
       AND o.id_periodo_academico = $2::bigint
       AND o.id_programa = (SELECT a.id_programa FROM academic_work_plan.asignatura a WHERE a.id = $1::bigint)
     ORDER BY dt.orden_visualizacion NULLS LAST, c.nombre`,
    [idAsignatura, idPeriodoAcademico]);
  return filas.map(aOferta);
}

/** Ofertas por id (activas). */
export async function ofertasCetapPorId(q: Consultable, ids: readonly string[]): Promise<Map<string, OfertaCetap>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return new Map();
  const filas = await q.query(`${SELECT_OFERTA} AND o.id = ANY($1::bigint[])`, [unicos]);
  return new Map(filas.map((f: any) => [f.idOfertaCetap, aOferta(f)]));
}

/**
 * Valida que la oferta sirva a este grupo: activa, del programa de su
 * asignatura y de su periodo de plataforma. 400 con el motivo si no.
 */
export async function validarOfertaDelGrupo(
  q: Consultable, idOferta: unknown, grupo: { idAsignatura: string; idPeriodoAcademico: string | null },
): Promise<OfertaCetap> {
  const id = String(idOferta ?? '').trim();
  if (!/^\d+$/.test(id)) throw new BadRequestException('idOfertaCetap debe ser el id numérico de una oferta CETAP.');
  if (!grupo.idPeriodoAcademico) {
    throw new BadRequestException('Solo los grupos de un periodo de plataforma tienen oferta CETAP.');
  }
  const elegibles = await ofertasCetapDe(q, grupo.idAsignatura, grupo.idPeriodoAcademico);
  const oferta = elegibles.find((o) => o.idOfertaCetap === id);
  if (!oferta) {
    throw new BadRequestException(
      'La oferta CETAP no existe, no está activa, o no es del programa de la asignatura en este periodo.');
  }
  return oferta;
}

/**
 * Franjas PRESENCIALES del grupo cuya aula es de otro CETAP que la oferta.
 * Lista vacía = coinciden (o no hay aula asignada).
 */
export async function aulasQueNoCoinciden(q: Consultable, idGrupo: string, codigoCetap: string): Promise<string[]> {
  const filas = await q.query(
    `SELECT DISTINCT f.aula_codigo AS aula
       FROM "academic-schedule".franja_horaria f
       JOIN "academic-schedule".aula au ON au.codigo = f.aula_codigo
      WHERE f.id_grupo = $1 AND f.tipo_sesion = 'presencial'
        AND au.codigo_cetap IS DISTINCT FROM $2`,
    [idGrupo, codigoCetap]);
  return filas.map((f: any) => String(f.aula));
}

/** Al crear una franja presencial con aula: el aula debe ser del CETAP de la oferta del grupo. */
export async function exigirAulaDeLaOferta(
  q: Consultable, idGrupo: string, aulaCodigo: string | null | undefined, tipoSesion: string | undefined,
): Promise<void> {
  if (!aulaCodigo || (tipoSesion ?? 'presencial') !== 'presencial') return;
  const filas = await q.query(
    `SELECT c.codigo AS cetap, au.codigo_cetap AS "cetapAula"
       FROM "academic-schedule".grupo g
       JOIN academic_work_plan.oferta_cetap_programa o ON o.id = g.id_oferta_cetap
       JOIN academic_work_plan.cetap c ON c.id = o.id_cetap
       LEFT JOIN "academic-schedule".aula au ON au.codigo = $2
      WHERE g.id_grupo = $1`,
    [idGrupo, aulaCodigo]);
  if (!filas.length) return; // grupo sin oferta: se exige al concertar
  if (filas[0].cetapAula !== filas[0].cetap) {
    throw new BadRequestException(
      `El aula ${aulaCodigo} es del CETAP ${filas[0].cetapAula ?? 'sin CETAP'} y el grupo se dicta en ${filas[0].cetap}.`);
  }
}
