import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { parsearPeriodo, type RefPeriodo } from './periodo-ref.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Festivos y recesos — EFDS-2347 (migración 062).
 *
 * Los recesos son los mismos para todos los grupos de un periodo (decisión 13):
 * se registran por periodo, dentro de sus fechas. Las sesiones que caen en un
 * receso o en un festivo no se dictan y sus horas no cuentan (decisión 12); la
 * regla vive en SQL (`sesiones_de_franja`), aquí solo se administran los datos.
 */
@Injectable()
export class CalendarioAcademicoService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Festivos del año, y si el año los tiene cargados (si no, las horas se avisan). */
  async festivos(anio: number) {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) throw new BadRequestException('Indique un año válido.');
    const filas = await this.dataSource.query(
      `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, nombre FROM "academic-schedule".festivo
        WHERE EXTRACT(YEAR FROM fecha) = $1 ORDER BY fecha`, [anio]);
    return { anio, cargados: filas.length > 0, festivos: filas };
  }

  private ref(idPeriodo: string): RefPeriodo {
    const ref = parsearPeriodo(idPeriodo);
    if (!ref) throw new BadRequestException('Periodo inválido.');
    return ref;
  }

  private async fechasDelPeriodo(ref: RefPeriodo): Promise<{ inicio: string; fin: string }> {
    const filas = await this.dataSource.query(
      ref.modelo === 'plataforma'
        ? `SELECT to_char(fecha_inicio, 'YYYY-MM-DD') AS inicio, to_char(fecha_fin, 'YYYY-MM-DD') AS fin
             FROM academic_work_plan.periodo_academico WHERE id = $1::bigint`
        : `SELECT to_char(fecha_inicio, 'YYYY-MM-DD') AS inicio, to_char(fecha_fin, 'YYYY-MM-DD') AS fin
             FROM "academic-schedule".periodo_programacion WHERE id_periodo = $1::uuid`,
      [ref.id]);
    if (!filas.length) throw new NotFoundException('El periodo no existe.');
    return filas[0];
  }

  async recesos(idPeriodo: string) {
    const ref = this.ref(idPeriodo);
    return this.dataSource.query(
      `SELECT id_receso::text AS "idReceso", to_char(fecha_inicio, 'YYYY-MM-DD') AS "fechaInicio",
              to_char(fecha_fin, 'YYYY-MM-DD') AS "fechaFin", motivo, creado_por AS "creadoPor"
         FROM "academic-schedule".periodo_receso
        WHERE ${ref.modelo === 'plataforma' ? 'id_periodo_academico = $1::bigint' : 'id_periodo = $1::uuid'}
        ORDER BY fecha_inicio`, [ref.id]);
  }

  async crearReceso(idPeriodo: string, dto: { fechaInicio?: string; fechaFin?: string; motivo?: string }, actor: string | null) {
    const ref = this.ref(idPeriodo);
    const inicio = String(dto?.fechaInicio ?? '').trim();
    const fin = String(dto?.fechaFin ?? '').trim();
    const motivo = String(dto?.motivo ?? '').trim();
    if (!FECHA.test(inicio) || !FECHA.test(fin)) throw new BadRequestException('Las fechas deben tener la forma AAAA-MM-DD.');
    if (fin < inicio) throw new BadRequestException('La fecha final no puede ser anterior a la inicial.');
    if (!motivo) throw new BadRequestException('Indique el motivo del receso.');
    const periodo = await this.fechasDelPeriodo(ref);
    if (periodo.inicio && periodo.fin && (inicio < periodo.inicio || fin > periodo.fin)) {
      throw new BadRequestException(`El receso debe estar dentro del periodo (${periodo.inicio} a ${periodo.fin}).`);
    }
    const filas = await this.dataSource.query(
      `INSERT INTO "academic-schedule".periodo_receso (id_periodo_academico, id_periodo, fecha_inicio, fecha_fin, motivo, creado_por)
       VALUES ($1::bigint, $2::uuid, $3::date, $4::date, $5, $6) RETURNING id_receso::text AS "idReceso"`,
      [ref.modelo === 'plataforma' ? ref.id : null, ref.modelo === 'legado' ? ref.id : null, inicio, fin, motivo, actor]);
    return { idReceso: filas[0].idReceso, recesos: await this.recesos(idPeriodo) };
  }

  async quitarReceso(idPeriodo: string, idReceso: string) {
    const ref = this.ref(idPeriodo);
    const r = await this.dataSource.query(
      `DELETE FROM "academic-schedule".periodo_receso
        WHERE id_receso = $1::uuid AND ${ref.modelo === 'plataforma' ? 'id_periodo_academico = $2::bigint' : 'id_periodo = $2::uuid'}
        RETURNING id_receso`, [idReceso, ref.id]);
    if (!r.length) throw new NotFoundException('El receso no existe en este periodo.');
    return { recesos: await this.recesos(idPeriodo) };
  }
}
