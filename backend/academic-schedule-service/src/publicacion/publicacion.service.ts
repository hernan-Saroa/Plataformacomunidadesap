import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { seSolapan } from '../horarios/solapamiento.js';

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

  private async exigirPeriodo(idPeriodo: string): Promise<void> {
    const p = await this.dataSource.query(
      `SELECT 1 FROM "academic-schedule".periodo_programacion WHERE id_periodo = $1`, [idPeriodo]);
    if (!p.length) throw new NotFoundException('El periodo no existe.');
  }

  /** Franjas del periodo (vía grupo.id_periodo), opcionalmente acotadas por estado. */
  private async franjasDelPeriodo(idPeriodo: string, estado?: string): Promise<FranjaCruce[]> {
    const filas = await this.dataSource.query(
      `SELECT f.id_franja      AS "idFranja",
              f.aula_codigo     AS "aulaCodigo",
              f.id_docente      AS "idDocente",
              f.dia_semana      AS "diaSemana",
              f.hora_inicio     AS "horaInicio",
              f.hora_fin        AS "horaFin"
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
        WHERE g.id_periodo = $1 ${estado ? 'AND f.estado = $2' : ''}`,
      estado ? [idPeriodo, estado] : [idPeriodo],
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
   * Cruces entre las franjas PROGRAMADO del periodo: dos que compartan aula (o
   * docente), el mismo día y se solapen en hora. Es lo que impide publicar.
   */
  async validarCruces(idPeriodo: string): Promise<CrucePublicacion[]> {
    const franjas = await this.franjasDelPeriodo(idPeriodo, 'PROGRAMADO');
    const cruces: CrucePublicacion[] = [];

    for (let i = 0; i < franjas.length; i++) {
      for (let j = i + 1; j < franjas.length; j++) {
        const a = franjas[i], b = franjas[j];
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

  async estado(idPeriodo: string): Promise<EstadoPublicacion> {
    await this.exigirPeriodo(idPeriodo);
    const filas = await this.dataSource.query(
      `SELECT f.estado AS estado, COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
        WHERE g.id_periodo = $1
        GROUP BY f.estado`, [idPeriodo]);
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
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
        WHERE g.id_periodo = $1 AND f.estado <> 'APROBADA' AND f.excepcion = false`, [idPeriodo]);

    return {
      idPeriodo, programado, publicada, tomada, aprobada, devuelta,
      total: programado + publicada + tomada + aprobada + devuelta,
      pendientesCierre: pend[0].n,
    };
  }

  /**
   * Publica la programación del periodo: valida que no haya cruces y pasa las
   * franjas PROGRAMADO a PUBLICADA. Sin franjas programadas, no hay nada que
   * publicar. Con cruces, no se publica y se dice cuáles.
   */
  async publicar(idPeriodo: string): Promise<EstadoPublicacion> {
    await this.exigirPeriodo(idPeriodo);

    const programadas = await this.franjasDelPeriodo(idPeriodo, 'PROGRAMADO');
    if (programadas.length === 0) {
      throw new BadRequestException('No hay franjas programadas por publicar en este periodo.');
    }

    const cruces = await this.validarCruces(idPeriodo);
    if (cruces.length > 0) {
      const detalle = cruces.slice(0, 5).map((c) =>
        `${c.tipo === 'aula' ? `aula ${c.recurso}` : 'un docente'} el ${c.dia.toLowerCase()} `
        + `de ${c.horaInicio} a ${c.horaFin}`).join('; ');
      throw new BadRequestException(
        `No se puede publicar: hay ${cruces.length} cruce(s) sin resolver (${detalle}).`,
      );
    }

    await this.dataSource.query(
      `UPDATE "academic-schedule".franja_horaria f
          SET estado = 'PUBLICADA', updated_at = NOW()
         FROM "academic-schedule".grupo g
        WHERE g.id_grupo = f.id_grupo
          AND g.id_periodo = $1
          AND f.estado = 'PROGRAMADO'`, [idPeriodo]);

    return this.estado(idPeriodo);
  }

  /**
   * Retira la publicación: PUBLICADA → PROGRAMADO. GUARDA: solo si NADIE tomó
   * franjas. Si alguna está TOMADA, retirar rompería el compromiso con ese
   * docente, así que se rechaza.
   */
  async retirar(idPeriodo: string): Promise<EstadoPublicacion> {
    await this.exigirPeriodo(idPeriodo);

    const tomadas = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
        WHERE g.id_periodo = $1 AND f.estado = 'TOMADA'`, [idPeriodo]);
    if (tomadas[0].n > 0) {
      throw new ConflictException(
        `No se puede retirar la publicación: ${tomadas[0].n} franja(s) ya fueron tomadas por docentes.`,
      );
    }

    await this.dataSource.query(
      `UPDATE "academic-schedule".franja_horaria f
          SET estado = 'PROGRAMADO', updated_at = NOW()
         FROM "academic-schedule".grupo g
        WHERE g.id_grupo = f.id_grupo
          AND g.id_periodo = $1
          AND f.estado = 'PUBLICADA'`, [idPeriodo]);

    return this.estado(idPeriodo);
  }

  /**
   * Franjas que impiden cerrar el periodo (ni APROBADA ni en excepción), con su
   * contexto, para poder marcarlas como excepción desde la vista de cierre.
   */
  async pendientesCierre(idPeriodo: string): Promise<Array<{
    idFranja: string; diaSemana: string; horaInicio: string; horaFin: string;
    estado: string; asignatura: string | null; programa: string | null;
  }>> {
    await this.exigirPeriodo(idPeriodo);
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
        WHERE g.id_periodo = $1 AND f.estado <> 'APROBADA' AND f.excepcion = false
        ORDER BY f.dia_semana, f.hora_inicio`,
      [idPeriodo],
    );
  }

  /**
   * Marca (o desmarca) una franja como EXCEPCIÓN: no pasará por aprobación pero
   * no debe impedir el cierre (EFDS-1941). Conserva su estado real.
   */
  async marcarExcepcion(idPeriodo: string, idFranja: string, excepcion: boolean): Promise<EstadoPublicacion> {
    await this.exigirPeriodo(idPeriodo);
    const r = await this.dataSource.query(
      `UPDATE "academic-schedule".franja_horaria f
          SET excepcion = $3, updated_at = NOW()
         FROM "academic-schedule".grupo g
        WHERE g.id_grupo = f.id_grupo
          AND f.id_franja = $2
          AND g.id_periodo = $1
      RETURNING f.id_franja`,
      [idPeriodo, idFranja, excepcion],
    );
    if (!r.length) throw new NotFoundException('La franja no pertenece a este periodo.');
    return this.estado(idPeriodo);
  }

  /**
   * Cierra el periodo: exige que TODA su franja esté APROBADA o marcada como
   * excepción. Un periodo cerrado es inmutable (ofertas.activar ya rechaza
   * reactivarlo); aquí se impide re-cerrar.
   *
   * ⚠️ NUEVA-5b: depende de la aprobación de NUEVA-3 (EFDS-1939). Por eso cerrar
   * no vivía en ofertas.crear/activar: hasta ahora no tenía de qué depender.
   */
  async cerrar(idPeriodo: string): Promise<EstadoPublicacion> {
    const p = await this.dataSource.query(
      `SELECT estado FROM "academic-schedule".periodo_programacion WHERE id_periodo = $1`, [idPeriodo]);
    if (!p.length) throw new NotFoundException('El periodo no existe.');
    if (p[0].estado === 'cerrado') {
      throw new ConflictException('El periodo ya está cerrado y es inmutable.');
    }

    const est = await this.estado(idPeriodo);
    if (est.pendientesCierre > 0) {
      throw new ConflictException(
        `No se puede cerrar: ${est.pendientesCierre} franja(s) no están aprobadas ni marcadas como excepción.`,
      );
    }

    await this.dataSource.query(
      `UPDATE "academic-schedule".periodo_programacion
          SET estado = 'cerrado', updated_at = NOW()
        WHERE id_periodo = $1`, [idPeriodo]);
    return this.estado(idPeriodo);
  }
}
