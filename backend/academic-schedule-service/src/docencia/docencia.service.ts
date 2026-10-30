import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ContratoClient, type CalculoHoras } from '../asignaciones/contrato-client.js';
import { repartoPorDias, type FranjaReparto, type ReglaReparto } from './reparto.js';
import { sqlPeriodoNoCerrado } from '../periodos/periodo-ref.js';

/** Docencia de un docente en un grupo, derivada de las franjas. */
export interface DocenciaGrupo {
  idGrupo: string;
  codigoAsignatura: string;
  asignatura: string;
  /** Periodo efectivo del grupo: plataforma si ya lo tiene, si no el legado. */
  idPeriodo: string | null;
  periodo: string | null;
  tipoOferta: string | null;
  /** Horas del grupo (todas sus franjas) con el cálculo único. */
  horasGrupo: number;
  /** Fracción del grupo que le toca al docente. */
  fraccion: number;
  /** Horas del docente en el grupo: lo que va al acumulado, al tope y al PTA. */
  horas: number;
  /** Horas del plan (catálogo × factor), como referencia (EFDS-2347). */
  horasPlan: number;
  /** De dónde salen las horas: las sesiones reales del ciclo o, si no se puede, el plan. */
  base: 'sesiones' | 'plan';
  /** Sesiones del docente en el grupo que no se dictan (no cuentan). */
  descontadas: { festivos: number; recesos: number };
  /** Avisos del cálculo (sin ciclo, sin festivos cargados, horas fijas). */
  avisos: string[];
}

/** Franja con sus sesiones reales (`"academic-schedule".sesiones_de_franja`, migración 062). */
export interface FranjaConSesiones extends FranjaReparto {
  idFranja: string;
  idGrupo: string;
  codigoAsignatura: string;
  /** Horas de clase reales de la franja en el ciclo; null sin ciclo. */
  horasReales: number | null;
  festivos: number;
  recesos: number;
  aniosSinFestivos: number[];
}

export interface HorasEnGrupo {
  horas: number;
  horasGrupo: number;
  fraccion: number;
  horasPlan: number;
  base: 'sesiones' | 'plan';
  descontadas: { festivos: number; recesos: number };
  avisos: string[];
}

/**
 * Docencia del profesor — EFDS-2306, con las sesiones reales de EFDS-2347.
 *
 * ⚠️ REGISTRO ÚNICO: LA FRANJA. Lo que cuenta como docencia de un profesor es
 * `franja_horaria.id_docente`, venga del backoffice o del portal.
 *
 * ⚠️ CÁLCULO ÚNICO (EFDS-2347). Las horas de un docente en un grupo son las de las
 * SESIONES REALES de sus franjas en el ciclo (festivos y recesos no cuentan; los
 * fines de semana sí; regla en SQL `sesiones_de_franja`) × el factor de vinculación
 * del contrato PROG↔PTA. Las horas del plan (catálogo × factor) quedan como
 * referencia. Se usa el plan solo si no hay cómo contar sesiones (grupo sin ciclo)
 * o la asignatura tiene horas fijas (excepción del catálogo), y se avisa.
 * Esto es lo que va al acumulado, al tope, a la concertación y al PTA.
 */
@Injectable()
export class DocenciaService {
  /** Regla de reparto para cuando se usan las horas del plan. */
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
    incluirFranja?: string,
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
        WHERE (f.id_docente = $1 OR f.id_franja = $3::uuid)
          AND ($2::uuid IS NULL OR g.id_grupo <> $2::uuid)
          -- Lo de un periodo CERRADO ya no es carga vigente: no cuenta contra el tope del nuevo.
          AND ${sqlPeriodoNoCerrado()}`,
      [idDocente, excluirGrupo ?? null, incluirFranja ?? null],
    );
    if (!grupos.length) return [];

    const franjas = await this.franjasConSesiones(grupos.map((g) => g.idGrupo));
    // Un cálculo del contrato por asignatura: varias franjas o grupos no lo repiten.
    const calculos = new Map<string, CalculoHoras>();
    const resultado: DocenciaGrupo[] = [];
    for (const g of grupos) {
      if (!calculos.has(g.codigoAsignatura)) {
        calculos.set(g.codigoAsignatura, await this.contrato.calcularImpacto(g.codigoAsignatura, vinculacion, token));
      }
      // Con `incluirFranja`, la franja se cuenta como si el docente ya la tuviera.
      const delGrupo = franjas.filter((f) => f.idGrupo === g.idGrupo)
        .map((f) => (incluirFranja && f.idFranja === incluirFranja ? { ...f, idDocente } : f));
      resultado.push({ ...g, ...this.horasEnGrupo(delGrupo, idDocente, calculos.get(g.codigoAsignatura)!) });
    }
    return resultado;
  }

  /** Franjas de los grupos con sus sesiones reales, en UNA consulta. */
  async franjasConSesiones(idsGrupo: string[]): Promise<FranjaConSesiones[]> {
    if (!idsGrupo.length) return [];
    const filas: any[] = await this.dataSource.query(
      `SELECT f.id_franja::text AS "idFranja", f.id_grupo::text AS "idGrupo", a.codigo AS "codigoAsignatura",
              f.dia_semana AS "diaSemana", f.id_docente::text AS "idDocente",
              to_char(f.hora_inicio, 'HH24:MI') AS "horaInicio", to_char(f.hora_fin, 'HH24:MI') AS "horaFin",
              s.horas::float AS "horasReales", COALESCE(s.festivos, 0) AS festivos, COALESCE(s.recesos, 0) AS recesos,
              s.anios_sin_festivos AS "aniosSinFestivos"
         FROM "academic-schedule".franja_horaria f
         JOIN "academic-schedule".grupo g ON g.id_grupo = f.id_grupo
         JOIN academic_work_plan.asignatura a ON a.id = g.id_asignatura
         LEFT JOIN LATERAL "academic-schedule".sesiones_de_franja(f.id_franja) s ON TRUE
        WHERE f.id_grupo = ANY($1::uuid[])
        ORDER BY f.id_franja`,
      [idsGrupo],
    );
    return filas.map((f) => ({ ...f, aniosSinFestivos: f.aniosSinFestivos ?? [] }));
  }

  /**
   * Horas del docente en UN grupo con el cálculo único. `franjasDelGrupo` son TODAS
   * las franjas del grupo, con su docente (o el simulado, para evaluar en seco).
   */
  horasEnGrupo(franjasDelGrupo: readonly FranjaConSesiones[], idDocente: string, calculo: CalculoHoras): HorasEnGrupo {
    const horasPlan = Number(calculo.horasImpacto ?? 0);
    const factor = Number(calculo.factorVinculacion ?? 1);
    const sinCiclo = franjasDelGrupo.some((f) => f.horasReales == null);
    const suyas = franjasDelGrupo.filter((f) => f.idDocente === idDocente);
    if (calculo.tipoExcepcion || sinCiclo || !franjasDelGrupo.length) {
      const fraccion = this.reparto(franjasDelGrupo, idDocente);
      const avisos = calculo.tipoExcepcion
        ? ['La asignatura tiene horas fijas en el catálogo: se usan las horas del plan.']
        : sinCiclo ? ['El grupo no tiene ciclo (fechas): se usan las horas del plan.'] : [];
      return { horas: redondear(horasPlan * fraccion), horasGrupo: horasPlan, fraccion, horasPlan,
        base: 'plan', descontadas: { festivos: 0, recesos: 0 }, avisos };
    }
    const reales = (fs: readonly FranjaConSesiones[]) => fs.reduce((s, f) => s + Number(f.horasReales ?? 0), 0);
    const horasGrupo = redondear(reales(franjasDelGrupo) * factor);
    const horas = redondear(reales(suyas) * factor);
    const sinFestivos = [...new Set(franjasDelGrupo.flatMap((f) => f.aniosSinFestivos))].sort();
    return {
      horas, horasGrupo, horasPlan,
      fraccion: horasGrupo > 0 ? Math.round((horas / horasGrupo) * 1000) / 1000 : 0,
      base: 'sesiones',
      descontadas: {
        festivos: suyas.reduce((s, f) => s + Number(f.festivos ?? 0), 0),
        recesos: suyas.reduce((s, f) => s + Number(f.recesos ?? 0), 0),
      },
      avisos: sinFestivos.length
        ? [`No hay festivos cargados para ${sinFestivos.join(', ')}: las horas pueden estar sobreestimadas.`]
        : [],
    };
  }

  /**
   * Fracción de un grupo que le toca al docente con la regla de reparto vigente.
   * La usan las vistas (EFDS-2344/2343) para no repetir la regla.
   */
  fraccion(franjasDelGrupo: readonly FranjaReparto[], idDocente: string): number {
    return this.reparto(franjasDelGrupo, idDocente);
  }

  /** Cálculo del contrato para la asignatura y la vinculación (factor, plan, excepción). */
  calculoAsignatura(codigoAsignatura: string, vinculacion: string | null, token: string | null): Promise<CalculoHoras> {
    return this.contrato.calcularImpacto(codigoAsignatura, vinculacion, token);
  }

  /** Horas del PLAN de la asignatura para la vinculación (referencia), por el contrato. */
  async horasAsignatura(codigoAsignatura: string, vinculacion: string | null, token: string | null): Promise<number> {
    const calc = await this.contrato.calcularImpacto(codigoAsignatura, vinculacion, token);
    return Number(calc.horasImpacto ?? 0);
  }

  /** Total de horas de docencia del docente (suma de `porGrupo`). */
  async total(
    idDocente: string, vinculacion: string | null, token: string | null, excluirGrupo?: string, incluirFranja?: string,
  ): Promise<number> {
    const grupos = await this.porGrupo(idDocente, vinculacion, token, excluirGrupo, incluirFranja);
    return redondear(grupos.reduce((s, g) => s + g.horas, 0));
  }
}

function redondear(n: number): number {
  return Math.round(n * 10) / 10;
}
