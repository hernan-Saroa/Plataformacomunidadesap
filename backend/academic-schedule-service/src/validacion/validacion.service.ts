import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { cargarFranjasCruceables, encontrarCruces } from '../horarios/choque.js';

/**
 * Validación de cruces del HISTÓRICO (3.9).
 *
 * ⚠️ ESTOS CRUCES NO SON FALLAS DEL SISTEMA. Son hallazgos del Excel de
 * programación 2026-1/2026-V1 que hoy se revisan a mano. El sistema NO permite
 * crearlos: `crearSesion` rechaza el cruce de aula desde EFDS-1374, y por eso el
 * contador "Alertas de Cruce" del panel es 0 por diseño. Son dos contadores
 * distintos, con fuentes distintas, y no deben mezclarse.
 *
 * ⚠️ REGLA DE CRUCE, explícita porque el conteo depende de ella:
 *   mismo periodo + mismo día + solape de horas + solape de CICLO (fechas).
 * El ciclo importa: dos clases en el mismo salón, el mismo día y a la misma
 * hora, pero en semanas distintas, NO se cruzan. Ignorar las fechas infla el
 * conteo de 27 a 144 pares.
 *
 * ⚠️ LOS ESPACIOS VIRTUALES NO CRUZAN POR AULA. Un campus Moodle no tiene
 * ocupación física: dos clases simultáneas ahí no compiten por un salón. El
 * COUNTIFS del Excel las contaba entre sí y producía 40 falsos positivos. El
 * docente SÍ sigue cruzando aunque la clase sea virtual: nadie dicta dos a la
 * vez.
 */
export interface CruceHistorico {
  tipo: 'aula' | 'docente';
  periodo: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  /** Aula en conflicto (tipo 'aula') o docente en conflicto (tipo 'docente'). */
  recurso: string;
  asignaturaA: string;
  asignaturaB: string;
  programaA: string;
  programaB: string;
}

/** Cruce de la programación VIVA: sin grupo ni asignatura del otro lado (RN-07). */
export interface CruceVivo {
  tipo: 'grupo' | 'aula' | 'docente';
  dia: string;
  horaInicio: string;
  horaFin: string;
  /** Código del aula; para grupo y docente no se expone quién (RN-07/08). */
  recurso: string | null;
}

export interface ConteoCrucesVivos {
  total: number;
  grupo: number;
  aula: number;
  docente: number;
  cruces: CruceVivo[];
}

@Injectable()
export class ValidacionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Cruces REALES de la programación viva — EFDS-2307.
   *
   * La API no deja crear cruces, así que este conteo debería dar 0. No es un
   * número quemado: se CUENTA, y por eso funciona como canario de la regla. Si
   * algún día no da 0, alguna ruta dejó pasar un cruce y el panel lo muestra.
   *
   * ⚠️ MISMA REGLA QUE AL GUARDAR (`horarios/choque.ts`, la única): mismo día, horas
   * solapadas Y ciclos de clases solapados (el del grupo; si no tiene, el del periodo).
   * Es la misma del histórico de cruces. Un aula o un docente en dos periodos distintos,
   * con ciclos que no se tocan, NO es un cruce.
   *   · grupo   — dos sesiones del mismo grupo;
   *   · aula    — el mismo salón físico (lo virtual va sin aula y no cruza);
   *   · docente — el mismo docente (`franja.id_docente`, EFDS-2306), aunque sea virtual.
   *
   * @param idPeriodo si viene, cuenta los pares en que al menos una franja es de ese
   * periodo (la otra puede ser de cualquiera con el que choque en fechas).
   */
  async crucesVivos(idPeriodo?: string): Promise<ConteoCrucesVivos> {
    const franjas = await cargarFranjasCruceables(this.dataSource, 'TRUE');
    const pares = encontrarCruces(
      franjas,
      idPeriodo ? (a, b) => a.idPeriodo === idPeriodo || b.idPeriodo === idPeriodo : undefined,
    );
    const cruces: CruceVivo[] = pares
      .map((p) => ({ tipo: p.tipo, dia: p.dia, horaInicio: p.horaInicio, horaFin: p.horaFin, recurso: p.tipo === 'aula' ? p.recurso : null }))
      .sort((x, y) => (x.tipo < y.tipo ? -1 : x.tipo > y.tipo ? 1 : x.dia < y.dia ? -1 : x.dia > y.dia ? 1 : x.horaInicio < y.horaInicio ? -1 : x.horaInicio > y.horaInicio ? 1 : 0));
    const cuenta = (t: CruceVivo['tipo']) => cruces.filter((c) => c.tipo === t).length;
    return { total: cruces.length, grupo: cuenta('grupo'), aula: cuenta('aula'), docente: cuenta('docente'), cruces };
  }

  /**
   * Cruces detectados en la programación histórica cargada.
   *
   * @param periodo si viene, acota al histórico de ESE periodo (por su código,
   * p. ej. '2026-1'). Es lo que hace que Validación pertenezca al periodo
   * seleccionado: un periodo nuevo no tiene histórico → 0 cruces, y solo al
   * mirar 2026-1 / 2026-V1 aparecen los suyos. El dato no se borra: se filtra.
   */
  async crucesHistoricos(periodo?: string): Promise<CruceHistorico[]> {
    const filtroPeriodo = periodo ? 'AND periodo = $1' : '';
    return this.dataSource.query(
      `WITH base AS (
         SELECT id, periodo, dia, aula, cedula_docente, nombre_docente,
                asignatura, programa, hora_inicio, hora_fin,
                NULLIF(fecha_inicio,'')::date AS fi, NULLIF(fecha_fin,'')::date AS ff
           FROM "academic-schedule".programacion_historica
          WHERE dia <> ''
            AND hora_inicio ~ '^[0-9]{2}:[0-9]{2}$'
            AND hora_fin   ~ '^[0-9]{2}:[0-9]{2}$'
            ${filtroPeriodo}
       ),
       -- Un docente SÍ choca consigo mismo aunque las clases sean virtuales:
       -- nadie dicta dos a la vez. La exclusión es solo del espacio.
       par AS (
         SELECT a.aula, a.nombre_docente, a.cedula_docente AS ced_a, b.cedula_docente AS ced_b,
                a.periodo, a.dia, a.hora_inicio, a.hora_fin,
                a.asignatura AS asig_a, b.asignatura AS asig_b,
                a.programa   AS prog_a, b.programa   AS prog_b,
                -- ⚠️ El aula solo choca si es un espacio FÍSICO. Un campus
                -- virtual no tiene ocupación: dos clases simultáneas en Moodle
                -- no compiten por un salón. Contarlas fue lo que infló el
                -- conteo del Excel con 40 falsos positivos.
                (a.aula = b.aula AND a.aula <> '' AND a.aula NOT ILIKE '%moodle%' AND a.aula NOT ILIKE '%virtual%')    AS choca_aula,
                (a.cedula_docente = b.cedula_docente AND a.cedula_docente <> '') AS choca_doc
           FROM base a
           JOIN base b
             ON a.id < b.id
            AND a.periodo = b.periodo
            AND a.dia = b.dia
            AND a.hora_inicio < b.hora_fin
            AND b.hora_inicio < a.hora_fin
            AND (a.fi IS NULL OR b.fi IS NULL OR (a.fi <= b.ff AND b.fi <= a.ff))
       )
       SELECT 'aula'::text AS tipo, periodo, dia,
              hora_inicio AS "horaInicio", hora_fin AS "horaFin",
              aula AS recurso,
              asig_a AS "asignaturaA", asig_b AS "asignaturaB",
              prog_a AS "programaA",   prog_b AS "programaB"
         FROM par WHERE choca_aula
       UNION ALL
       SELECT 'docente'::text, periodo, dia,
              hora_inicio, hora_fin,
              nombre_docente,
              asig_a, asig_b, prog_a, prog_b
         FROM par WHERE choca_doc
        ORDER BY 1, 2, 3, 4`,
      periodo ? [periodo] : undefined,
    );
  }

  /** Resumen por tipo, para el contador de la sección. */
  async resumen(periodo?: string): Promise<{ aula: number; docente: number; total: number }> {
    const cruces = await this.crucesHistoricos(periodo);
    const aula = cruces.filter((c) => c.tipo === 'aula').length;
    const docente = cruces.filter((c) => c.tipo === 'docente').length;
    return { aula, docente, total: aula + docente };
  }
}
