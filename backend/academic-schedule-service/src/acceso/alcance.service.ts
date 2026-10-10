import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { NivelAcademico, nivelDeProgramaTipo } from '../catalogo/nivel-academico.js';
import { parsearPeriodo } from '../periodos/periodo-ref.js';

/** Periodo al que pertenece un recurso, con lo necesario para decidir si admite escrituras. */
export interface PeriodoDelRecurso {
  idPeriodo: string;
  codigo: string;
  cerrado: boolean;
}

/** Desde dónde se ancla una escritura: el recurso que la ruta toca. */
export type TipoAncla = 'periodo' | 'grupo' | 'franja' | 'asignatura';

/** Lo que se sabe del recurso tocado: su periodo (si tiene) y su nivel (si tiene). */
export interface Alcance {
  /** `undefined` cuando el recurso no existe: la ruta responde su propio 404. */
  existe: boolean;
  periodo: PeriodoDelRecurso | null;
  nivel: NivelAcademico | null;
}

/**
 * Resolución ÚNICA del periodo y del nivel de un recurso — EFDS-2301 y EFDS-2302.
 *
 * ⚠️ «EL PERIODO ESTÁ CERRADO» ES UN CONCEPTO, NO UNA TABLA. Hoy el estado vive en
 * `periodo_programacion.estado`; con el periodo único de plataforma (EFDS-2328)
 * va a vivir en otro lado. Por eso la pregunta se hace en UN solo método
 * (`periodoPorId`) y todo lo demás llega a él: el día que cambie el modelo, se
 * cambia aquí y la garantía sigue en pie para todas las rutas.
 *
 * La franja pertenece al periodo A TRAVÉS DE SU GRUPO (`grupo.id_periodo`):
 * `franja_horaria.id_periodo` está vacía en todas las filas, igual que asume
 * publicación. El nivel sale del programa real de la asignatura, nunca de lo que
 * declare el cliente (mismo criterio que el catálogo, RN-08).
 */
@Injectable()
export class AlcanceService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * La ÚNICA consulta que decide si un periodo está cerrado.
   *
   * Plataforma (EFDS-2328): cerrado si el periodo de la plataforma está
   * cerrado O si su programación está cerrada. Se programa en planeación,
   * concertación y en curso. Legado: el estado de `periodo_programacion`.
   */
  async periodoPorId(idPeriodo: string): Promise<PeriodoDelRecurso | null> {
    const ref = parsearPeriodo(idPeriodo);
    if (!ref) return null;
    const filas = ref.modelo === 'plataforma'
      ? await this.dataSource.query(
          `SELECT pa.id::text AS "idPeriodo", pa.codigo,
                  (pa.estado = 'cerrado' OR COALESCE(pp.estado, 'abierta') = 'cerrada') AS cerrado
             FROM academic_work_plan.periodo_academico pa
             LEFT JOIN "academic-schedule".programacion_periodo pp ON pp.id_periodo_academico = pa.id
            WHERE pa.id = $1::bigint`,
          [ref.id],
        )
      : await this.dataSource.query(
          `SELECT id_periodo::text AS "idPeriodo", codigo, (estado = 'cerrado') AS cerrado
             FROM "academic-schedule".periodo_programacion
            WHERE id_periodo = $1::uuid`,
          [ref.id],
        );
    if (!filas.length) return null;
    return { idPeriodo: filas[0].idPeriodo, codigo: filas[0].codigo, cerrado: filas[0].cerrado === true };
  }

  private async nivelDeAsignatura(idAsignatura: unknown): Promise<NivelAcademico | null> {
    const id = Number(idAsignatura);
    if (!Number.isInteger(id)) return null;
    const filas = await this.dataSource.query(
      `SELECT pr.tipo
         FROM academic_work_plan.asignatura a
         JOIN academic_work_plan.programa pr ON pr.id = a.id_programa
        WHERE a.id = $1`,
      [id],
    );
    return filas.length ? nivelDeProgramaTipo(filas[0].tipo) : null;
  }

  private async grupo(idGrupo: string): Promise<{ idPeriodo: string | null; idAsignatura: number } | null> {
    if (!esUuid(idGrupo)) return null;
    const filas = await this.dataSource.query(
      // Un grupo de plataforma cuelga de su periodo de plataforma; si no, del legado.
      `SELECT COALESCE(id_periodo_academico::text, id_periodo::text) AS "idPeriodo", id_asignatura AS "idAsignatura"
         FROM "academic-schedule".grupo WHERE id_grupo = $1`,
      [idGrupo],
    );
    return filas[0] ?? null;
  }

  /** Alcance del recurso anclado. `existe=false` deja que la ruta responda su 404. */
  async resolver(tipo: TipoAncla, id: unknown): Promise<Alcance> {
    const valor = id == null ? '' : String(id).trim();
    if (!valor) return { existe: false, periodo: null, nivel: null };

    switch (tipo) {
      case 'periodo': {
        const periodo = await this.periodoPorId(valor);
        return { existe: !!periodo, periodo, nivel: null };
      }
      case 'asignatura':
        return { existe: true, periodo: null, nivel: await this.nivelDeAsignatura(valor) };
      case 'grupo': {
        const g = await this.grupo(valor);
        if (!g) return { existe: false, periodo: null, nivel: null };
        return {
          existe: true,
          periodo: g.idPeriodo ? await this.periodoPorId(g.idPeriodo) : null,
          nivel: await this.nivelDeAsignatura(g.idAsignatura),
        };
      }
      case 'franja': {
        if (!esUuid(valor)) return { existe: false, periodo: null, nivel: null };
        const filas = await this.dataSource.query(
          `SELECT id_grupo::text AS "idGrupo" FROM "academic-schedule".franja_horaria WHERE id_franja = $1`,
          [valor],
        );
        if (!filas.length) return { existe: false, periodo: null, nivel: null };
        if (!filas[0].idGrupo) return { existe: true, periodo: null, nivel: null };
        const alcance = await this.resolver('grupo', filas[0].idGrupo);
        return { ...alcance, existe: true };
      }
    }
  }
}

function esUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}
