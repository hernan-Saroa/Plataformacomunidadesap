import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

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

@Injectable()
export class ValidacionService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Cruces detectados en la programación histórica cargada. */
  async crucesHistoricos(): Promise<CruceHistorico[]> {
    return this.dataSource.query(
      `WITH base AS (
         SELECT id, periodo, dia, aula, cedula_docente, nombre_docente,
                asignatura, programa, hora_inicio, hora_fin,
                NULLIF(fecha_inicio,'')::date AS fi, NULLIF(fecha_fin,'')::date AS ff
           FROM "academic-schedule".programacion_historica
          WHERE dia <> ''
            AND hora_inicio ~ '^[0-9]{2}:[0-9]{2}$'
            AND hora_fin   ~ '^[0-9]{2}:[0-9]{2}$'
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
    );
  }

  /** Resumen por tipo, para el contador de la sección. */
  async resumen(): Promise<{ aula: number; docente: number; total: number }> {
    const cruces = await this.crucesHistoricos();
    const aula = cruces.filter((c) => c.tipo === 'aula').length;
    const docente = cruces.filter((c) => c.tipo === 'docente').length;
    return { aula, docente, total: aula + docente };
  }
}
