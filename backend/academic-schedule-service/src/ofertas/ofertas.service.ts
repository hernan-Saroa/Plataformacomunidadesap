import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AcumuladoService, type AcumuladoDocente } from '../asignaciones/acumulado.service.js';

/**
 * Ofertas académicas — EFDS-1375.
 *
 * La oferta es el periodo de programación con su TIPO. Son cinco: dos periodos
 * regulares, dos de créditos con estrategia virtual, un interperiodo.
 *
 * ⚠️ La acumulación de horas por semestre ENTRE ofertas no se construye aquí: el
 * acumulado de EFDS-1373 ya agrupa el consumo por periodo (oferta) y suma
 * transversalmente. Esta capa solo lista las ofertas y compone la vista de
 * consumo previo frente al tope, que es lo que importa al programar el
 * interperiodo (lo ya dictado en los regulares cuenta contra el mismo tope).
 *
 * ⚠️ C-5: las fechas de las ofertas son de referencia hasta que llegue el
 * calendario oficial. Cambiarlas es carga de datos.
 */

/** Tipos válidos: el mismo conjunto cerrado del CHECK de la migración 016. */
export const TIPOS_OFERTA = ['periodo_regular', 'creditos_virtual', 'interperiodo'] as const;
export type TipoOferta = (typeof TIPOS_OFERTA)[number];

export interface CrearPeriodoDto {
  codigo: string;
  nombre: string;
  tipo?: TipoOferta | null;
  fechaInicio: string;
  fechaFin: string;
}

export interface OfertaDto {
  idPeriodo: string;
  codigo: string;
  nombre: string;
  tipo: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  /** Derivado de `estado = 'activo'` (migración 018); ya no hay columna is_activo. */
  activo: boolean;
}

@Injectable()
export class OfertasService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly acumulado: AcumuladoService,
  ) {}

  async listar(): Promise<OfertaDto[]> {
    const filas = await this.dataSource.query(
      `SELECT id_periodo, codigo, nombre, tipo, fecha_inicio, fecha_fin, estado
         FROM "academic-schedule".periodo_programacion
        ORDER BY tipo, codigo`,
    );
    const iso = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : null);
    return filas.map((p: any) => ({
      idPeriodo: p.id_periodo,
      codigo: p.codigo,
      nombre: p.nombre,
      tipo: p.tipo ?? null,
      fechaInicio: iso(p.fecha_inicio),
      fechaFin: iso(p.fecha_fin),
      activo: p.estado === 'activo',
    }));
  }

  /**
   * Crea un periodo. Nace en 'planeacion' (NUEVA-5a): activar es un acto
   * explícito y aparte.
   *
   * ⚠️ CERRAR NO ENTRA AQUÍ. Depende del estado de aprobación que introduce
   * NUEVA-3, y por eso NUEVA-5 se partió en 5a y 5b.
   */
  async crear(dto: CrearPeriodoDto): Promise<OfertaDto> {
    const codigo = String(dto?.codigo ?? '').trim();
    const nombre = String(dto?.nombre ?? '').trim();

    if (!codigo) throw new BadRequestException('El código del periodo es obligatorio.');
    if (codigo.length > 20) throw new BadRequestException('El código no puede superar 20 caracteres.');
    if (!nombre) throw new BadRequestException('El nombre del periodo es obligatorio.');
    if (dto.tipo && !TIPOS_OFERTA.includes(dto.tipo)) {
      throw new BadRequestException(`El tipo debe ser uno de: ${TIPOS_OFERTA.join(', ')}.`);
    }
    if (!dto.fechaInicio || !dto.fechaFin) {
      throw new BadRequestException('El periodo requiere fecha de inicio y de fin.');
    }
    if (new Date(dto.fechaFin) < new Date(dto.fechaInicio)) {
      throw new BadRequestException('La fecha de fin no puede ser anterior a la de inicio.');
    }

    const previo = await this.dataSource.query(
      `SELECT 1 FROM "academic-schedule".periodo_programacion WHERE codigo = $1`, [codigo]);
    if (previo.length) throw new ConflictException(`Ya existe un periodo con el código ${codigo}.`);

    const filas = await this.dataSource.query(
      `INSERT INTO "academic-schedule".periodo_programacion
              (codigo, nombre, tipo, fecha_inicio, fecha_fin, estado)
       VALUES ($1, $2, $3, $4::date, $5::date, 'planeacion')
       RETURNING id_periodo, codigo, nombre, tipo, fecha_inicio, fecha_fin, estado`,
      [codigo, nombre, dto.tipo ?? null, dto.fechaInicio, dto.fechaFin],
    );
    return this.aDto(filas[0]);
  }

  /**
   * Activa un periodo. Sin condiciones y sin exclusividad: varios periodos
   * pueden estar activos a la vez —hoy los cinco lo están—, porque el
   * interperiodo convive con los regulares.
   *
   * Un periodo cerrado es inmutable, así que no se reabre desde aquí.
   */
  async activar(idPeriodo: string): Promise<OfertaDto> {
    const filas = await this.dataSource.query(
      `SELECT id_periodo, estado FROM "academic-schedule".periodo_programacion WHERE id_periodo = $1`,
      [idPeriodo],
    );
    if (!filas.length) throw new NotFoundException('El periodo no existe.');
    if (filas[0].estado === 'cerrado') {
      throw new BadRequestException('Un periodo cerrado es inmutable y no se puede reactivar.');
    }

    const act = await this.dataSource.query(
      `UPDATE "academic-schedule".periodo_programacion
          SET estado = 'activo', updated_at = NOW()
        WHERE id_periodo = $1
        RETURNING id_periodo, codigo, nombre, tipo, fecha_inicio, fecha_fin, estado`,
      [idPeriodo],
    );
    return this.aDto(act[0]);
  }

  private aDto(p: any): OfertaDto {
    const iso = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : null);
    return {
      idPeriodo: p.id_periodo,
      codigo: p.codigo,
      nombre: p.nombre,
      tipo: p.tipo ?? null,
      fechaInicio: iso(p.fecha_inicio),
      fechaFin: iso(p.fecha_fin),
      activo: p.estado === 'activo',
    };
  }

  /**
   * Consumo del docente desglosado por oferta frente a su tope. Es el acumulado
   * de EFDS-1373 tal cual: transversal y con la oferta como dimensión. Se expone
   * aquí para la vista de programación interperiodo, donde ver el consumo previo
   * de los regulares es lo que evita pasarse del tope.
   */
  consumoPorOferta(documento: string): Promise<AcumuladoDocente> {
    return this.acumulado.consumo(documento);
  }
}
