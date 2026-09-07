import { Injectable } from '@nestjs/common';
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
   * Consumo del docente desglosado por oferta frente a su tope. Es el acumulado
   * de EFDS-1373 tal cual: transversal y con la oferta como dimensión. Se expone
   * aquí para la vista de programación interperiodo, donde ver el consumo previo
   * de los regulares es lo que evita pasarse del tope.
   */
  consumoPorOferta(documento: string): Promise<AcumuladoDocente> {
    return this.acumulado.consumo(documento);
  }
}
