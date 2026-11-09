import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DIAS_SEMANA, type DiaSemana } from '../horarios/franja-horaria.entity.js';
import { aMinutos, buscarSolapeIntraGrupo, esMultiploDeGranularidad, jornadaSugerida } from '../horarios/solapamiento.js';
import { buscarChoque, cargarFranjasCruceables, cicloDelGrupo, type EjecutorSql } from '../horarios/choque.js';
import { FACTOR_TOPE_HORAS, horasDelGrupo } from '../horarios/horas-grupo.js';
import { sqlPeriodoNoCerrado } from '../periodos/periodo-ref.js';
import { superaElTope, topeDeDocencia } from '../asignaciones/tope.js';
import { DocenciaService } from '../docencia/docencia.service.js';
import { ESTADOS_EN_CURSO } from '../concertacion/concertacion.service.js';

/**
 * Horario de los grupos VIRTUALES que define el docente — migración 063.
 *
 * Un grupo virtual (mediado por tecnologías) se puede crear y asignar sin horario.
 * El docente asignado lo define en «Mi programación» con las MISMAS reglas que el
 * backoffice: la regla única de choque (día, horas y ciclo) contra todo lo que ya
 * dicta, las horas del grupo frente a las requeridas por el catálogo (máximo ×1,3,
 * la regla de la publicación) y su tope de horas (RN-04, con el cálculo único).
 *
 * ⚠️ IDENTIDAD EN EL SERVIDOR: el docente es el del token. Solo define el horario de
 * los grupos virtuales asignados a él, y solo quita las franjas que él creó.
 * ⚠️ Mientras su programación está en concertación (enviada, revisada o por aceptar) o
 * ya aprobada, el horario no se cambia: hay que pedir que se la devuelvan.
 */

export interface FranjaDefinible {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

export interface GrupoVirtualDocente {
  idGrupo: string;
  numeroGrupo: number;
  codigoAsignatura: string;
  asignatura: string;
  programa: string;
  nivel: string | null;
  idPeriodo: string | null;
  periodoCodigo: string | null;
  cicloInicio: string | null;
  cicloFin: string | null;
  /** Horas del catálogo (horas_clase) que el grupo debe cubrir. */
  horasRequeridas: number | null;
  /** Horas programadas con su horario actual (semanas del ciclo × horas por semana). */
  horasProgramadas: number | null;
  /** Máximo de horas programables (requeridas × 1,3), como en la publicación. */
  horasMaximas: number | null;
  franjas: Array<{
    idFranja: string; diaSemana: string; horaInicio: string; horaFin: string;
    estado: string; definidaPor: 'programador' | 'docente';
  }>;
  /** Si puede agregar o quitar franjas ahora, y por qué no. */
  editable: boolean;
  motivoNoEditable: string | null;
}

@Injectable()
export class HorarioDocenteService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly docencia: DocenciaService,
  ) {}

  /** Grupos virtuales asignados al docente en periodos vigentes, con su horario y horas. */
  async grupos(idPerson: string): Promise<GrupoVirtualDocente[]> {
    const grupos: any[] = await this.dataSource.query(
      `SELECT g.id_grupo::text AS "idGrupo", g.numero_grupo AS "numeroGrupo",
              a.codigo AS "codigoAsignatura", a.nombre AS asignatura, a.horas_clase AS "horasRequeridas",
              pr.nombre AS programa, lower(pr.tipo) AS nivel,
              COALESCE(g.id_periodo_academico::text, g.id_periodo::text) AS "idPeriodo",
              COALESCE(pa.codigo, pp.codigo) AS "periodoCodigo",
              to_char(COALESCE(g.fecha_inicio, pa.fecha_inicio, pp.fecha_inicio), 'YYYY-MM-DD') AS "cicloInicio",
              to_char(COALESCE(g.fecha_fin, pa.fecha_fin, pp.fecha_fin), 'YYYY-MM-DD') AS "cicloFin"
         FROM "academic-schedule".asignacion_docente ad
         JOIN "academic-schedule".grupo g ON g.id_grupo = ad.id_grupo
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
         LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
         LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo
        WHERE ad.id_docente = $1 AND g.modalidad = 'virtual' AND ${sqlPeriodoNoCerrado()}
        ORDER BY a.nombre, g.numero_grupo`,
      [idPerson],
    );
    const resultado: GrupoVirtualDocente[] = [];
    for (const g of grupos) {
      const franjas = await this.franjasDelGrupo(this.dataSource, g.idGrupo);
      const requeridas = g.horasRequeridas != null ? Number(g.horasRequeridas) : null;
      const horas = horasDelGrupo(g.cicloInicio, g.cicloFin, franjas, requeridas);
      const bloqueo = await this.motivoNoEditable(this.dataSource, g.idGrupo, franjas.map((f) => f.idFranja));
      resultado.push({
        ...g,
        numeroGrupo: Number(g.numeroGrupo),
        horasRequeridas: requeridas,
        horasProgramadas: horas.programadas,
        horasMaximas: requeridas != null ? Math.round(requeridas * FACTOR_TOPE_HORAS * 100) / 100 : null,
        franjas,
        editable: !bloqueo,
        motivoNoEditable: bloqueo,
      });
    }
    return resultado;
  }

  /**
   * Agrega una franja al horario del grupo virtual. Transacción con lock por docente y
   * por grupo: dos altas simultáneas se serializan y la segunda ve lo que la primera
   * confirmó (choques, horas y tope).
   */
  async crearFranja(idPerson: string, idGrupo: string, dto: FranjaDefinible, token: string | null): Promise<{ idFranja: string }> {
    validarForma(dto);
    return this.dataSource.transaction(async (m) => {
      await m.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`tope-docente:${idPerson}`]);
      const grupo = await this.grupoDelDocente(m, idPerson, idGrupo);
      const existentes = await this.franjasDelGrupo(m, idGrupo);
      const bloqueo = await this.motivoNoEditable(m, idGrupo, existentes.map((f) => f.idFranja));
      if (bloqueo) throw new ConflictException(bloqueo);

      const intra = buscarSolapeIntraGrupo(dto, existentes);
      if (intra) {
        throw new ConflictException(
          `La sesión se cruza con otra del mismo grupo el ${dto.diaSemana.toLowerCase()} de ${intra.horaInicio} a ${intra.horaFin}.`);
      }

      // Regla única de choque contra TODO lo que el docente ya dicta (cualquier programa o nivel).
      const ciclo = await cicloDelGrupo(m, idGrupo);
      if (!ciclo.cicloInicio || !ciclo.cicloFin) {
        throw new ConflictException(
          'El grupo no tiene ciclo de clases (fechas) ni periodo con fechas: pida al programador que lo defina antes de programar el horario.');
      }
      const suyas = await cargarFranjasCruceables(
        m, `f.id_docente = $1 AND ${sqlPeriodoNoCerrado()}`, [idPerson]);
      const choque = buscarChoque({ ...dto, ...ciclo }, suyas);
      if (choque) {
        throw new ConflictException(
          `No puede programar esta sesión: se cruza con otra clase suya el ${dto.diaSemana.toLowerCase()} de ${choque.horaInicio} a ${choque.horaFin}.`);
      }

      // Horas del grupo frente a las del catálogo: la misma regla de la publicación (×1,3).
      const requeridas = grupo.horasRequeridas != null ? Number(grupo.horasRequeridas) : null;
      const horas = horasDelGrupo(ciclo.cicloInicio, ciclo.cicloFin, [...existentes, dto], requeridas);
      if (horas.excede) {
        throw new ConflictException(
          `Con esta sesión el grupo tendría ${horas.programadas} h programadas y la asignatura requiere ${requeridas} h `
          + `(máximo ${Math.round(requeridas! * FACTOR_TOPE_HORAS * 100) / 100} h).`);
      }

      const [nueva] = await m.query(
        `INSERT INTO "academic-schedule".franja_horaria
           (id_grupo, dia_semana, hora_inicio, hora_fin, tipo_sesion, jornada, sede_codigo, aula_codigo,
            estado, id_docente, definida_por, updated_at)
         VALUES ($1, $2, $3, $4, 'mediada_tecnologia', $5, NULL, NULL, 'TOMADA', $6, 'docente', NOW())
         RETURNING id_franja::text AS "idFranja"`,
        [idGrupo, dto.diaSemana, dto.horaInicio, dto.horaFin, jornadaSugerida(dto.diaSemana, dto.horaInicio), idPerson],
      );

      await this.exigirDentroDelTope(m, idPerson, idGrupo, grupo.codigoAsignatura, token);
      return nueva;
    });
  }

  /** Quita una franja que el docente definió, mientras su programación no esté en concertación. */
  async eliminarFranja(idPerson: string, idGrupo: string, idFranja: string): Promise<{ eliminada: true }> {
    return this.dataSource.transaction(async (m) => {
      await this.grupoDelDocente(m, idPerson, idGrupo);
      const filas = await m.query(
        `SELECT definida_por, id_docente::text AS id_docente, estado FROM "academic-schedule".franja_horaria
          WHERE id_franja = $1 AND id_grupo = $2 FOR UPDATE`, [idFranja, idGrupo]);
      if (!filas.length) throw new NotFoundException('La sesión no existe en este grupo.');
      if (filas[0].definida_por !== 'docente' || filas[0].id_docente !== idPerson) {
        throw new ForbiddenException('Solo puede quitar las sesiones que usted definió.');
      }
      const bloqueo = await this.motivoNoEditable(m, idGrupo, [idFranja]);
      if (bloqueo) throw new ConflictException(bloqueo);
      await m.query(`DELETE FROM "academic-schedule".franja_horaria WHERE id_franja = $1`, [idFranja]);
      return { eliminada: true as const };
    });
  }

  /** El grupo, si es virtual y está asignado a este docente; si no, 404/403. */
  private async grupoDelDocente(m: EjecutorSql, idPerson: string, idGrupo: string) {
    const filas = await m.query(
      `SELECT g.modalidad, ad.id_docente::text AS id_docente, a.codigo AS "codigoAsignatura", a.horas_clase AS "horasRequeridas"
         FROM "academic-schedule".grupo g
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         LEFT JOIN "academic-schedule".asignacion_docente ad ON ad.id_grupo = g.id_grupo
        WHERE g.id_grupo = $1
        FOR UPDATE OF g`, [idGrupo]);
    if (!filas.length) throw new NotFoundException('El grupo no existe.');
    const g = filas[0];
    if (g.id_docente !== idPerson) throw new ForbiddenException('Este grupo no está asignado a usted.');
    if (g.modalidad !== 'virtual') {
      throw new ConflictException('El horario de un grupo presencial lo define el programador, no el docente.');
    }
    return g as { codigoAsignatura: string; horasRequeridas: number | string | null };
  }

  private async franjasDelGrupo(m: EjecutorSql, idGrupo: string): Promise<GrupoVirtualDocente['franjas']> {
    return m.query(
      `SELECT id_franja::text AS "idFranja", dia_semana AS "diaSemana",
              to_char(hora_inicio, 'HH24:MI') AS "horaInicio", to_char(hora_fin, 'HH24:MI') AS "horaFin",
              estado, definida_por AS "definidaPor"
         FROM "academic-schedule".franja_horaria WHERE id_grupo = $1
        ORDER BY array_position(ARRAY['LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO','DOMINGO']::text[], dia_semana::text), hora_inicio`,
      [idGrupo]);
  }

  /** Por qué no se puede cambiar el horario ahora: concertación en curso o docencia aprobada. */
  private async motivoNoEditable(m: EjecutorSql, idGrupo: string, idsFranja: string[]): Promise<string | null> {
    if (idsFranja.length) {
      const enCurso = await m.query(
        `SELECT c.estado FROM "academic-schedule".concertacion_docencia c, jsonb_array_elements(c.franjas) e
          WHERE c.estado = ANY($2::text[]) AND e->>'idFranja' = ANY($1::text[]) LIMIT 1`,
        [idsFranja, [...ESTADOS_EN_CURSO, 'ACEPTADA']]);
      if (enCurso.length) {
        return `Su programación está en concertación (${enCurso[0].estado}): pida que se la devuelvan para cambiar el horario.`;
      }
    }
    const aprobada = await m.query(
      `SELECT 1 FROM "academic-schedule".franja_horaria WHERE id_grupo = $1 AND estado = 'APROBADA' LIMIT 1`, [idGrupo]);
    return aprobada.length ? 'El horario de este grupo ya está aprobado: no se cambia desde aquí.' : null;
  }

  /**
   * RN-04: con la sesión nueva (ya insertada en la transacción) el docente no puede pasar
   * su tope. Horas de este grupo = sesiones reales del ciclo × factor de vinculación (el
   * cálculo único); las de los demás grupos, las de siempre. Falla cerrado sin RUND.
   */
  private async exigirDentroDelTope(
    m: EjecutorSql, idPerson: string, idGrupo: string, codigoAsignatura: string, token: string | null,
  ): Promise<void> {
    const filas: Array<{ vinculacion: string | null; horasAsignables: string | number | null }> = await m.query(
      `SELECT d."tipoVinculacion" AS vinculacion, d."horasAsignables" AS "horasAsignables"
         FROM academic_work_plan."Docente" d WHERE d."personaId" = $1
        ORDER BY d."updatedAt" DESC NULLS LAST LIMIT 1`, [idPerson]);
    if (!filas.length) {
      throw new ForbiddenException('No se pudo verificar su tope de horas: su registro de docente no está en el RUND.');
    }
    const tope = topeDeDocencia(filas[0].vinculacion, filas[0].horasAsignables);
    if (tope <= 0) return;
    const calculo = await this.docencia.calculoAsignatura(codigoAsignatura, filas[0].vinculacion, token);
    const [s] = await m.query(
      `SELECT COALESCE(SUM(s.horas), 0)::float AS horas
         FROM "academic-schedule".franja_horaria f
         CROSS JOIN LATERAL "academic-schedule".sesiones_de_franja(f.id_franja) s
        WHERE f.id_grupo = $1 AND f.id_docente = $2`, [idGrupo, idPerson]);
    const delGrupo = Math.round(Number(s?.horas ?? 0) * Number(calculo.factorVinculacion ?? 1) * 10) / 10;
    const otros = await this.docencia.total(idPerson, filas[0].vinculacion, token, idGrupo);
    const total = Math.round((otros + delGrupo) * 10) / 10;
    if (superaElTope(total, tope)) {
      throw new ConflictException(`Con esta sesión tendría ${total} h de docencia y su tope es de ${tope} h.`);
    }
  }
}

function validarForma(dto: FranjaDefinible): void {
  if (!dto || !DIAS_SEMANA.includes(dto.diaSemana)) {
    throw new BadRequestException(`El día debe ser uno de: ${DIAS_SEMANA.join(', ')}.`);
  }
  const ini = aMinutos(String(dto.horaInicio ?? ''));
  const fin = aMinutos(String(dto.horaFin ?? ''));
  if (!Number.isFinite(ini) || !Number.isFinite(fin)) throw new BadRequestException('Las horas deben tener formato HH:MM.');
  if (fin <= ini) throw new BadRequestException('La hora de fin debe ser posterior a la de inicio.');
  if (!esMultiploDeGranularidad(dto.horaInicio) || !esMultiploDeGranularidad(dto.horaFin)) {
    throw new BadRequestException('Las horas deben ir en múltiplos de 5 minutos.');
  }
}
