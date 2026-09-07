import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { HorasPtaCalculator } from '../../pta/horas-pta.calculator';
import type { CalculoHorasDto } from './dto/calculo-horas.dto';
import { factorVinculacion } from './factor-vinculacion';

/**
 * Cálculo de horas de una asignatura — contrato PROG↔PTA v1 (EFDS-1373, cierra
 * EFDS-1651).
 *
 * ⚠️ EL CÁLCULO NO SE REIMPLEMENTA. Se importa `HorasPtaCalculator`, la misma
 * clase que usa el PTA en producción: exponerla por el contrato es lo que hace
 * que Programación Académica y el PTA calculen idéntico. El único agregado es el
 * factor de vinculación (RN-03), que es lógica nueva y no toca el calculador.
 *
 * Los datos (créditos, horas de clase, factor por crédito, excepciones) se LEEN
 * del catálogo; solo el cálculo pasa por el calculador.
 */
@Injectable()
export class CalculoHorasService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Calcula el impacto en el PTA de una asignatura para una vinculación dada.
   *
   * @param codigo       código SNIES de la asignatura (RN-01).
   * @param vinculacion  tipo de vinculación del docente; decide el factor RN-03.
   */
  async calcular(codigo: string, vinculacion?: string | null): Promise<CalculoHorasDto> {
    const limpio = String(codigo ?? '').trim();
    if (!limpio) {
      throw new BadRequestException('Debe indicar el código de la asignatura.');
    }

    const filas = await this.dataSource.query(
      `SELECT a.codigo,
              a.nombre,
              a.creditos,
              a.horas_clase,
              a.horas_pta,
              a.tipo_excepcion,
              a.horas_fijas_pta,
              p.tipo                    AS tipo_programa,
              p.horas_base_por_credito  AS horas_base_por_credito,
              p.horas_pregrado_central  AS horas_pregrado_central
         FROM academic_work_plan.asignatura a
         JOIN academic_work_plan.programa  p ON p.id = a.id_programa
        WHERE a.codigo = $1
        LIMIT 1`,
      [limpio],
    );
    if (!filas?.length) {
      throw new NotFoundException(`No existe una asignatura con código ${limpio} en el catálogo.`);
    }
    const f = filas[0];

    // Cálculo base con el calculador del PTA — NO se reimplementa.
    const horasPtaCarrera = HorasPtaCalculator.calcularHorasPTA(
      {
        creditos: Number(f.creditos ?? 0),
        tipoExcepcion: f.tipo_excepcion ?? null,
        horasFijasPta: f.horas_fijas_pta ?? null,
      },
      {
        horasBasePorCredito: Number(f.horas_base_por_credito ?? 16),
        horasPregradoCentral: f.horas_pregrado_central ?? null,
      },
    );

    // La base sobre la que aplica el factor es la hora de clase del catálogo
    // (paridad verificada: horas_pta = horas_clase × 3).
    const horasClase = Number(f.horas_clase ?? Math.round(horasPtaCarrera / 3));

    const esPregrado = String(f.tipo_programa ?? '').toLowerCase() === 'pregrado';
    const { factor, categoria } = factorVinculacion(vinculacion, esPregrado);

    return {
      codigo: f.codigo,
      nombre: f.nombre,
      creditos: f.creditos ?? null,
      horasClase,
      horasPtaCarrera,
      factorVinculacion: factor,
      categoriaVinculacion: categoria,
      horasImpacto: horasClase * factor,
      esExcepcionHorasFijas: f.tipo_excepcion != null,
      tipoExcepcion: f.tipo_excepcion ?? null,
    };
  }
}
