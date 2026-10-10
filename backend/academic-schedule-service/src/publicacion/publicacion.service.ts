import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { seSolapan } from '../horarios/solapamiento.js';
import { FACTOR_TOPE_HORAS } from '../horarios/horarios.service.js';
import { condicionNivelSql, NIVELES_ACADEMICOS, type NivelAcademico } from '../catalogo/nivel-academico.js';
import { condicionPeriodoGrupo, parsearPeriodo, type RefPeriodo } from '../periodos/periodo-ref.js';

/**
 * Publicación de la programación — NUEVA-1 / EFDS-1937.
 *
 * ⚠️ NOMBRE. Esto es la PUBLICACIÓN de la programación, no la «oferta»: la
 * oferta es el periodo (EFDS-1375). Publicar es pasar las franjas de un periodo
 * de PROGRAMADO a PUBLICADA para que el docente las vea y pueda tomarlas.
 *
 * La franja pertenece al periodo a través de su grupo (grupo.id_periodo); la
 * franja no guarda el periodo por su cuenta. Una sola fuente de verdad del
 * estado: `franja.estado` (migración 029), no una tabla aparte.
 *
 * ⚠️ Validar «sin cruces» REUSA la regla existente: la primitiva `seSolapan` de
 * horarios, la misma que usa `crearSesion`. No se reimplementa el solapamiento.
 *
 * ⚠️ Lo virtual no cruza por aula porque no tiene aula: una sesión mediada por
 * tecnología va sin `aula_codigo`. El docente SÍ cruza consigo mismo aunque sea
 * virtual —nadie dicta dos clases a la vez—, y eso se valida por `id_docente`.
 */

interface FranjaCruce {
  idFranja: string;
  aulaCodigo: string | null;
  idDocente: string | null;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

export interface CrucePublicacion {
  tipo: 'aula' | 'docente';
  recurso: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
}

export interface EstadoPublicacion {
  idPeriodo: string;
  programado: number;
  publicada: number;
  tomada: number;
  aprobada: number;
  /** Devueltas por la jefatura, a la espera de que el docente las re-tome. */
  devuelta: number;
  total: number;
  /** Franjas que impiden cerrar: ni APROBADA ni excepción (EFDS-1941). */
  pendientesCierre: number;
}

@Injectable()
export class PublicacionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Periodo de plataforma o legado (EFDS-2328). Un id que no es de ninguno no existe. */
  private ref(idPeriodo: string): RefPeriodo {
    const ref = parsearPeriodo(idPeriodo);
    if (!ref) throw new NotFoundException('El periodo no existe.');
    return ref;
  }

  private async exigirPeriodo(idPeriodo: string): Promise<void> {
    const ref = this.ref(idPeriodo);
    const p = ref.modelo === 'plataforma'
      ? await this.dataSource.query(`SELECT 1 FROM academic_work_plan.periodo_academico WHERE id = $1::bigint`, [ref.id])
      : await this.dataSource.query(`SELECT 1 FROM "academic-schedule".periodo_programacion WHERE id_periodo = $1::uuid`, [ref.id]);
    if (!p.length) throw new NotFoundException('El periodo no existe.');
  }

  /**
   * Subconsulta de los grupos del periodo cuyos programas son de `niveles`
   * (RN-08, EFDS-2302/2303). Ocupa $1 (periodo) y, si filtra, $2 (tipos de
   * posgrado). LEFT JOIN: con los dos niveles no se pierde ningún grupo.
   */
  private gruposEnAlcance(idPeriodo: string, niveles: readonly NivelAcademico[]): { sql: string; params: unknown[] } {
    const ref = this.ref(idPeriodo);
    const nivel = condicionNivelSql('pr.tipo', niveles, 2);
    return {
      sql: `SELECT gn.id_grupo
              FROM "academic-schedule".grupo gn
              LEFT JOIN academic_work_plan.asignatura an ON an.id = gn.id_asignatura
              LEFT JOIN academic_work_plan.programa pr   ON pr.id = an.id_programa
             WHERE ${condicionPeriodoGrupo('gn', ref, 1)} AND ${nivel.sql}`,
      params: [ref.id, ...nivel.params],
    };
  }

  /** Franjas del periodo en esos niveles (vía grupo.id_periodo), opcionalmente acotadas por estado. */
  private async franjasDelPeriodo(
    idPeriodo: string,
    estado?: string,
    niveles: readonly NivelAcademico[] = NIVELES_ACADEMICOS,
  ): Promise<FranjaCruce[]> {
    const grupos = this.gruposEnAlcance(idPeriodo, niveles);
    const params = [...grupos.params];
    if (estado) params.push(estado);
    const filas = await this.dataSource.query(
      `SELECT f.id_franja      AS "idFranja",
              f.aula_codigo     AS "aulaCodigo",
              f.id_docente      AS "idDocente",
              f.dia_semana      AS "diaSemana",
              f.hora_inicio     AS "horaInicio",
              f.hora_fin        AS "horaFin"
         FROM "academic-schedule".franja_horaria f
        WHERE f.id_grupo IN (${grupos.sql}) ${estado ? `AND f.estado = $${params.length}` : ''}`,
      params,
    );
    return filas.map((f: any) => ({
      idFranja: f.idFranja,
      aulaCodigo: f.aulaCodigo ?? null,
      idDocente: f.idDocente ?? null,
      diaSemana: f.diaSemana,
      horaInicio: String(f.horaInicio).slice(0, 5),
      horaFin: String(f.horaFin).slice(0, 5),
    }));
  }

  /**
   * Cruces que impiden publicar las franjas PROGRAMADO de `niveles`: dos que
   * compartan aula (o docente), el mismo día y se solapen en hora.
   *
   * ⚠️ El aula y el docente son de TODOS los niveles (RN-07): una franja de
   * pregrado por publicar también choca con una de posgrado del mismo periodo.
   * Por eso se compara contra todas las franjas del periodo, y solo se exige que
   * al menos una de las dos sea de las que se publican. El cruce informa aula,
   * día y hora, nunca la asignatura del otro nivel.
   */
  async validarCruces(
    idPeriodo: string,
    niveles: readonly NivelAcademico[] = NIVELES_ACADEMICOS,
  ): Promise<CrucePublicacion[]> {
    const porPublicar = new Set(
      (await this.franjasDelPeriodo(idPeriodo, 'PROGRAMADO', niveles)).map((f) => f.idFranja));
    const franjas = await this.franjasDelPeriodo(idPeriodo);
    const cruces: CrucePublicacion[] = [];

    for (let i = 0; i < franjas.length; i++) {
      for (let j = i + 1; j < franjas.length; j++) {
        const a = franjas[i], b = franjas[j];
        if (!porPublicar.has(a.idFranja) && !porPublicar.has(b.idFranja)) continue;
        if (a.diaSemana !== b.diaSemana) continue;
        if (!seSolapan(a.horaInicio, a.horaFin, b.horaInicio, b.horaFin)) continue;

        // Aula: solo si ambas tienen el MISMO salón físico. Lo virtual va sin aula.
        if (a.aulaCodigo && b.aulaCodigo && a.aulaCodigo === b.aulaCodigo) {
          cruces.push({ tipo: 'aula', recurso: a.aulaCodigo, dia: a.diaSemana, horaInicio: a.horaInicio, horaFin: a.horaFin });
        }
        // Docente: cruza aunque sea virtual (nadie dicta dos a la vez).
        if (a.idDocente && b.idDocente && a.idDocente === b.idDocente) {
          cruces.push({ tipo: 'docente', recurso: a.idDocente, dia: a.diaSemana, horaInicio: a.horaInicio, horaFin: a.horaFin });
        }
      }
    }
    return cruces;
  }

  /**
   * Conteos por estado de las franjas del periodo en `niveles`. Sin niveles
   * explícitos cuenta todo el periodo: es lo que necesita `cerrar`.
   */
  async estado(
    idPeriodo: string,
    niveles: readonly NivelAcademico[] = NIVELES_ACADEMICOS,
  ): Promise<EstadoPublicacion> {
    await this.exigirPeriodo(idPeriodo);
    const grupos = this.gruposEnAlcance(idPeriodo, niveles);
    const filas = await this.dataSource.query(
      `SELECT f.estado AS estado, COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria f
        WHERE f.id_grupo IN (${grupos.sql})
        GROUP BY f.estado`, grupos.params);
    const por: Record<string, number> = Object.fromEntries(filas.map((r: any) => [r.estado, r.n]));
    const programado = por['PROGRAMADO'] ?? 0;
    const publicada = por['PUBLICADA'] ?? 0;
    const tomada = por['TOMADA'] ?? 0;
    const aprobada = por['APROBADA'] ?? 0;
    const devuelta = por['DEVUELTA'] ?? 0;

    // Lo que impide cerrar: ni APROBADA ni marcada como excepción.
    const pend = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria f
        WHERE f.id_grupo IN (${grupos.sql}) AND f.estado <> 'APROBADA' AND f.excepcion = false`, grupos.params);

    return {
      idPeriodo, programado, publicada, tomada, aprobada, devuelta,
      total: programado + publicada + tomada + aprobada + devuelta,
      pendientesCierre: pend[0].n,
    };
  }

  /**
   * Publica la programación de `niveles` en el periodo: valida que no haya
   * cruces y pasa sus franjas PROGRAMADO a PUBLICADA (EFDS-2303: la publica el
   * programador, cada uno la de su nivel). Sin franjas programadas, no hay nada
   * que publicar. Con cruces, no se publica y se dice cuáles.
   */
  async publicar(
    idPeriodo: string,
    niveles: readonly NivelAcademico[] = NIVELES_ACADEMICOS,
  ): Promise<EstadoPublicacion> {
    await this.exigirPeriodo(idPeriodo);

    const programadas = await this.franjasDelPeriodo(idPeriodo, 'PROGRAMADO', niveles);
    if (programadas.length === 0) {
      throw new BadRequestException('No hay franjas programadas por publicar en este periodo.');
    }

    const cruces = await this.validarCruces(idPeriodo, niveles);
    if (cruces.length > 0) {
      const detalle = cruces.slice(0, 5).map((c) =>
        `${c.tipo === 'aula' ? `aula ${c.recurso}` : 'un docente'} el ${c.dia.toLowerCase()} `
        + `de ${c.horaInicio} a ${c.horaFin}`).join('; ');
      throw new BadRequestException(
        `No se puede publicar: hay ${cruces.length} cruce(s) sin resolver (${detalle}).`,
      );
    }

    // §1.3 — Las horas programadas de cada grupo no deben superar en más de 30%
    // las requeridas por el catálogo (asignatura.horas_clase, nunca recalculadas,
    // Circular 003). Se avisa durante el armado; aquí, al publicar, se bloquea.
    // Los grupos sin ciclo definido no se pueden validar y no bloquean.
    const grupos = this.gruposEnAlcance(idPeriodo, niveles);
    const excesos = await this.dataSource.query(
      `WITH g AS (
         SELECT gr.id_grupo, a.nombre AS asignatura, a.horas_clase AS requeridas,
                GREATEST(1, ROUND((gr.fecha_fin - gr.fecha_inicio + 1) / 7.0)) AS semanas,
                SUM(EXTRACT(EPOCH FROM (f.hora_fin - f.hora_inicio)) / 3600.0) AS horas_semana
           FROM "academic-schedule".grupo gr
           JOIN "academic-schedule".franja_horaria f ON f.id_grupo = gr.id_grupo
           JOIN academic_work_plan.asignatura a ON a.id = gr.id_asignatura
          WHERE gr.id_grupo IN (${grupos.sql}) AND gr.fecha_inicio IS NOT NULL AND gr.fecha_fin IS NOT NULL
            AND a.horas_clase IS NOT NULL AND a.horas_clase > 0
          GROUP BY gr.id_grupo, a.nombre, a.horas_clase, gr.fecha_inicio, gr.fecha_fin
       )
       SELECT asignatura, requeridas::int AS requeridas,
              ROUND(horas_semana * semanas)::int AS programadas
         FROM g WHERE horas_semana * semanas > requeridas * ${FACTOR_TOPE_HORAS}
        ORDER BY programadas DESC`,
      grupos.params,
    );
    if (excesos.length > 0) {
      const d = excesos.slice(0, 3).map((e: any) =>
        `${e.asignatura} (${e.programadas}h programadas vs ${e.requeridas}h del plan)`).join('; ');
      throw new BadRequestException(
        `No se puede publicar: ${excesos.length} grupo(s) exceden las horas del plan de estudios (${d}).`,
      );
    }

    await this.dataSource.query(
      `UPDATE "academic-schedule".franja_horaria f
          SET estado = 'PUBLICADA', updated_at = NOW()
        WHERE f.id_grupo IN (${grupos.sql})
          AND f.estado = 'PROGRAMADO'`, grupos.params);

    return this.estado(idPeriodo, niveles);
  }

  /**
   * Retira la publicación de `niveles`: PUBLICADA → PROGRAMADO. GUARDA: solo si
   * NADIE tomó franjas de esos niveles. Si alguna está TOMADA, retirar rompería
   * el compromiso con ese docente, así que se rechaza.
   */
  async retirar(
    idPeriodo: string,
    niveles: readonly NivelAcademico[] = NIVELES_ACADEMICOS,
  ): Promise<EstadoPublicacion> {
    await this.exigirPeriodo(idPeriodo);
    const grupos = this.gruposEnAlcance(idPeriodo, niveles);

    const tomadas = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria f
        WHERE f.id_grupo IN (${grupos.sql}) AND f.estado = 'TOMADA'`, grupos.params);
    if (tomadas[0].n > 0) {
      throw new ConflictException(
        `No se puede retirar la publicación: ${tomadas[0].n} franja(s) ya fueron tomadas por docentes.`,
      );
    }

    await this.dataSource.query(
      `UPDATE "academic-schedule".franja_horaria f
          SET estado = 'PROGRAMADO', updated_at = NOW()
        WHERE f.id_grupo IN (${grupos.sql})
          AND f.estado = 'PUBLICADA'`, grupos.params);

    return this.estado(idPeriodo, niveles);
  }

  /**
   * Franjas que impiden cerrar el periodo (ni APROBADA ni en excepción), con su
   * contexto, para poder marcarlas como excepción desde la vista de cierre.
   * Acotadas a `niveles`: el nombre de la asignatura es del nivel (RN-08).
   */
  async pendientesCierre(
    idPeriodo: string,
    niveles: readonly NivelAcademico[] = NIVELES_ACADEMICOS,
  ): Promise<Array<{
    idFranja: string; diaSemana: string; horaInicio: string; horaFin: string;
    estado: string; asignatura: string | null; programa: string | null;
  }>> {
    await this.exigirPeriodo(idPeriodo);
    const grupos = this.gruposEnAlcance(idPeriodo, niveles);
    return this.dataSource.query(
      `SELECT f.id_franja                       AS "idFranja",
              f.dia_semana                      AS "diaSemana",
              to_char(f.hora_inicio, 'HH24:MI') AS "horaInicio",
              to_char(f.hora_fin, 'HH24:MI')    AS "horaFin",
              f.estado,
              a.nombre                          AS "asignatura",
              pr.nombre                         AS "programa"
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g          ON g.id_grupo = f.id_grupo
         LEFT JOIN academic_work_plan.asignatura a ON a.id       = g.id_asignatura
         LEFT JOIN academic_work_plan.programa pr  ON pr.id      = a.id_programa
        WHERE f.id_grupo IN (${grupos.sql}) AND f.estado <> 'APROBADA' AND f.excepcion = false
        ORDER BY f.dia_semana, f.hora_inicio`,
      grupos.params,
    );
  }

  /**
   * Marca (o desmarca) una franja como EXCEPCIÓN: no pasará por aprobación pero
   * no debe impedir el cierre (EFDS-1941). Conserva su estado real.
   */
  async marcarExcepcion(idPeriodo: string, idFranja: string, excepcion: boolean): Promise<EstadoPublicacion> {
    await this.exigirPeriodo(idPeriodo);
    const ref = this.ref(idPeriodo);
    const r = await this.dataSource.query(
      `UPDATE "academic-schedule".franja_horaria f
          SET excepcion = $3, updated_at = NOW()
         FROM "academic-schedule".grupo g
        WHERE g.id_grupo = f.id_grupo
          AND f.id_franja = $2
          AND ${condicionPeriodoGrupo('g', ref, 1)}
      RETURNING f.id_franja`,
      [ref.id, idFranja, excepcion],
    );
    if (!r.length) throw new NotFoundException('La franja no pertenece a este periodo.');
    return this.estado(idPeriodo);
  }

  /**
   * Cierra la PROGRAMACIÓN del periodo: exige que TODA su franja esté APROBADA o
   * marcada como excepción. Lo cerrado es inmutable; aquí se impide re-cerrar.
   *
   * ⚠️ EFDS-2328: en un periodo de plataforma esto cierra SOLO la programación
   * (`programacion_periodo`), NUNCA el periodo de la plataforma: cerrar ese
   * periodo termina PTA y es acto del PTA, no de este módulo. En un periodo
   * legado cierra el `periodo_programacion`, como antes.
   *
   * ⚠️ NUEVA-5b: depende de la aprobación de NUEVA-3 (EFDS-1939).
   */
  async cerrar(idPeriodo: string, cerradoPor?: string | null): Promise<EstadoPublicacion> {
    const ref = this.ref(idPeriodo);
    const p = ref.modelo === 'plataforma'
      ? await this.dataSource.query(
          `SELECT CASE WHEN COALESCE(pp.estado, 'abierta') = 'cerrada' THEN 'cerrado' ELSE 'abierto' END AS estado
             FROM academic_work_plan.periodo_academico pa
             LEFT JOIN "academic-schedule".programacion_periodo pp ON pp.id_periodo_academico = pa.id
            WHERE pa.id = $1::bigint`, [ref.id])
      : await this.dataSource.query(
          `SELECT estado FROM "academic-schedule".periodo_programacion WHERE id_periodo = $1::uuid`, [ref.id]);
    if (!p.length) throw new NotFoundException('El periodo no existe.');
    if (p[0].estado === 'cerrado') {
      throw new ConflictException('La programación de este periodo ya está cerrada y es inmutable.');
    }

    const est = await this.estado(idPeriodo);
    if (est.pendientesCierre > 0) {
      throw new ConflictException(
        `No se puede cerrar: ${est.pendientesCierre} franja(s) no están aprobadas ni marcadas como excepción.`,
      );
    }

    if (ref.modelo === 'plataforma') {
      await this.dataSource.query(
        `INSERT INTO "academic-schedule".programacion_periodo (id_periodo_academico, estado, cerrada_en, cerrada_por)
         VALUES ($1::bigint, 'cerrada', NOW(), $2::uuid)
         ON CONFLICT (id_periodo_academico) DO UPDATE
            SET estado = 'cerrada', cerrada_en = NOW(), cerrada_por = EXCLUDED.cerrada_por, updated_at = NOW()`,
        [ref.id, esUuid(cerradoPor) ? cerradoPor : null]);
    } else {
      await this.dataSource.query(
        `UPDATE "academic-schedule".periodo_programacion
            SET estado = 'cerrado', updated_at = NOW()
          WHERE id_periodo = $1::uuid`, [ref.id]);
    }
    return this.estado(idPeriodo);
  }
}

function esUuid(valor: unknown): valor is string {
  return typeof valor === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}
