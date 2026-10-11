import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ContratoClient } from '../asignaciones/contrato-client.js';
import { repartoPorDias, type FranjaReparto, type ReglaReparto } from './reparto.js';

/** Docencia de un docente en un grupo, derivada de las franjas. */
export interface DocenciaGrupo {
  idGrupo: string;
  codigoAsignatura: string;
  asignatura: string;
  /** Periodo efectivo del grupo: plataforma si ya lo tiene, si no el legado. */
  idPeriodo: string | null;
  periodo: string | null;
  tipoOferta: string | null;
  /** Horas del grupo según el cálculo único del contrato (horasImpacto). */
  horasGrupo: number;
  /** Fracción que le toca al docente según la regla de reparto. */
  fraccion: number;
  /** horasGrupo × fraccion. */
  horas: number;
}

/**
 * Docencia del profesor — EFDS-2306.
 *
 * ⚠️ REGISTRO ÚNICO: LA FRANJA. Lo que cuenta como docencia de un profesor es
 * `franja_horaria.id_docente`, venga del backoffice (la asignación propaga el
 * docente a las franjas del grupo, migración 012) o del portal (el docente toma
 * la franja). Antes el acumulado sumaba `asignacion_docente.horas_asignadas` y
 * no veía lo tomado en el portal: por eso quedaba en 0 h.
 *
 * ⚠️ CÁLCULO ÚNICO. Las horas de un grupo son las del contrato PROG↔PTA
 * (`horasImpacto` de la asignatura para la vinculación del docente). Aquí no se
 * calculan horas: solo se reparten con la regla aislada en `reparto.ts`.
 */
@Injectable()
export class DocenciaService {
  /** Regla de reparto vigente. Reemplazable sin tocar el resto (pendiente del negocio). */
  private readonly reparto: ReglaReparto = repartoPorDias;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly contrato: ContratoClient,
  ) {}

  /**
   * Docencia del docente por grupo. `excluirGrupo` deja fuera un grupo (para
   * evaluar en seco una asignación sobre él sin contarlo dos veces).
   */
  async porGrupo(
    idDocente: string,
    vinculacion: string | null,
    token: string | null,
    excluirGrupo?: string,
  ): Promise<DocenciaGrupo[]> {
    const grupos: any[] = await this.dataSource.query(
      `SELECT DISTINCT g.id_grupo::text                                   AS "idGrupo",
              a.codigo                                                    AS "codigoAsignatura",
              a.nombre                                                    AS asignatura,
              COALESCE(g.id_periodo_academico::text, g.id_periodo::text)  AS "idPeriodo",
              COALESCE(pa.codigo, pp.codigo)                              AS periodo,
              g.tipo_oferta                                               AS "tipoOferta"
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g          ON g.id_grupo = f.id_grupo
         JOIN academic_work_plan.asignatura a      ON a.id = g.id_asignatura
         LEFT JOIN academic_work_plan.periodo_academico pa ON pa.id = g.id_periodo_academico
         LEFT JOIN "academic-schedule".periodo_programacion pp ON pp.id_periodo = g.id_periodo
        WHERE f.id_docente = $1
          AND ($2::uuid IS NULL OR g.id_grupo <> $2::uuid)`,
      [idDocente, excluirGrupo ?? null],
    );
    if (!grupos.length) return [];

    const franjas: Array<FranjaReparto & { idGrupo: string }> = await this.dataSource.query(
      `SELECT id_grupo::text AS "idGrupo", dia_semana AS "diaSemana", id_docente::text AS "idDocente",
              to_char(hora_inicio, 'HH24:MI') AS "horaInicio", to_char(hora_fin, 'HH24:MI') AS "horaFin"
         FROM "academic-schedule".franja_horaria
        WHERE id_grupo = ANY($1::uuid[])`,
      [grupos.map((g) => g.idGrupo)],
    );

    // Un cálculo por asignatura: varias franjas o grupos de la misma asignatura
    // no vuelven a llamar al contrato.
    const calculos = new Map<string, number>();
    const resultado: DocenciaGrupo[] = [];
    for (const g of grupos) {
      if (!calculos.has(g.codigoAsignatura)) {
        const calc = await this.contrato.calcularImpacto(g.codigoAsignatura, vinculacion, token);
        calculos.set(g.codigoAsignatura, Number(calc.horasImpacto ?? 0));
      }
      const horasGrupo = calculos.get(g.codigoAsignatura)!;
      const fraccion = this.reparto(franjas.filter((f) => f.idGrupo === g.idGrupo), idDocente);
      resultado.push({ ...g, horasGrupo, fraccion, horas: redondear(horasGrupo * fraccion) });
    }
    return resultado;
  }

  /** Total de horas de docencia del docente (suma de `porGrupo`). */
  async total(idDocente: string, vinculacion: string | null, token: string | null, excluirGrupo?: string): Promise<number> {
    const grupos = await this.porGrupo(idDocente, vinculacion, token, excluirGrupo);
    return redondear(grupos.reduce((s, g) => s + g.horas, 0));
  }
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}
