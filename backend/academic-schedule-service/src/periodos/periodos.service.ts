import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { PERMISO_PROGRAMACION_ALL } from '../auth/programacion-permissions.js';

export type EstadoPlataforma = 'planeacion' | 'concertacion' | 'en_curso' | 'cerrado';

export interface PeriodoPlataforma {
  idPeriodo: string;
  modelo: 'plataforma';
  codigo: string;
  anio: number;
  semestre: number;
  fechaInicio: string;
  fechaFin: string;
  estadoPlataforma: EstadoPlataforma;
  programacion: { estado: 'abierta' | 'cerrada'; cerradaEn: string | null };
  programable: boolean;
  esActivo: boolean;
}

export interface PeriodoLegado {
  idPeriodo: string;
  modelo: 'legado';
  codigo: string;
  nombre: string;
  tipo: string;
  estado: string;
  motivo: string;
}

export interface RespuestaPeriodos {
  periodos: PeriodoPlataforma[];
  legado: PeriodoLegado[];
  permisos: { crear: boolean; activar: boolean; cerrarProgramacion: boolean; importar: boolean };
}

/**
 * Periodos — EFDS-2328 (periodo único de plataforma). Contrato en
 * INTEGRACION-claude.md, sección 1.
 *
 * LEE `academic_work_plan.periodo_academico` (dueño: el PTA) y le suma el
 * estado propio de la programación. No crea ni activa periodos: eso lo hacen
 * los servicios del PTA, a los que la pantalla llama directamente.
 *
 * Los periodos legado son los de `periodo_programacion` que NO quedaron con
 * destino en la tabla de equivalencias (2026-INT, pruebas): se listan aparte
 * para no mezclarlos con los de la plataforma.
 */
@Injectable()
export class PeriodosService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listar(permisos: ReadonlySet<string>): Promise<RespuestaPeriodos> {
    const plataforma = await this.dataSource.query(
      `SELECT pa.id::text                         AS "idPeriodo",
              pa.codigo,
              pa.anio,
              pa.semestre,
              to_char(pa.fecha_inicio, 'YYYY-MM-DD') AS "fechaInicio",
              to_char(pa.fecha_fin, 'YYYY-MM-DD')    AS "fechaFin",
              pa.estado                              AS "estadoPlataforma",
              COALESCE(pp.estado, 'abierta')         AS "estadoProgramacion",
              pp.cerrada_en                          AS "cerradaEn"
         FROM academic_work_plan.periodo_academico pa
         LEFT JOIN "academic-schedule".programacion_periodo pp ON pp.id_periodo_academico = pa.id
        ORDER BY pa.fecha_inicio DESC`,
    );
    const legado = await this.dataSource.query(
      `SELECT pp.id_periodo::text AS "idPeriodo", pp.codigo, pp.nombre, pp.tipo, pp.estado,
              COALESCE(e.motivo, 'Periodo sin equivalencia en la plataforma (prueba o anterior al modelo único).') AS motivo
         FROM "academic-schedule".periodo_programacion pp
         LEFT JOIN "academic-schedule".equivalencia_periodo e ON e.codigo_programacion = pp.codigo
        WHERE e.codigo_periodo_academico IS NULL
           OR NOT EXISTS (SELECT 1 FROM academic_work_plan.periodo_academico pa
                           WHERE pa.codigo = e.codigo_periodo_academico)
        ORDER BY pp.fecha_inicio DESC NULLS LAST, pp.codigo`,
    );

    const admin = permisos.has(PERMISO_PROGRAMACION_ALL);
    return {
      periodos: plataforma.map((p: any): PeriodoPlataforma => {
        const estadoProgramacion = p.estadoProgramacion === 'cerrada' ? 'cerrada' : 'abierta';
        return {
          idPeriodo: p.idPeriodo,
          modelo: 'plataforma',
          codigo: p.codigo,
          anio: Number(p.anio),
          semestre: Number(p.semestre),
          fechaInicio: p.fechaInicio,
          fechaFin: p.fechaFin,
          estadoPlataforma: p.estadoPlataforma,
          programacion: {
            estado: estadoProgramacion,
            cerradaEn: p.cerradaEn ? new Date(p.cerradaEn).toISOString() : null,
          },
          programable: p.estadoPlataforma !== 'cerrado' && estadoProgramacion === 'abierta',
          esActivo: p.estadoPlataforma === 'en_curso',
        };
      }),
      legado: legado.map((p: any): PeriodoLegado => ({
        idPeriodo: p.idPeriodo,
        modelo: 'legado',
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: p.tipo,
        estado: p.estado,
        motivo: p.motivo,
      })),
      // Crear, activar, cerrar e importar son del administrador del módulo.
      permisos: { crear: admin, activar: admin, cerrarProgramacion: admin, importar: admin },
    };
  }
}
