import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Aulas y su disponibilidad — EFDS-1374.
 *
 * ⚠️ RN-07 ES CONFIDENCIALIDAD, NO PRESENTACIÓN. La disponibilidad de un aula
 * dice qué franjas están ocupadas —día y hora— y nada más: ni la asignatura, ni
 * el programa, ni el docente. Otra decanatura puede tener ahí una clase de
 * posgrado que este programador no debe ver. La garantía va en el DTO del
 * backend, no en que la UI oculte campos: aquí no se seleccionan esos campos.
 *
 * ⚠️ Datos de aulas PROVISIONALES (C-4) hasta que llegue el catálogo oficial.
 */

export interface AulaDto {
  codigo: string;
  nombre: string;
  sedeCodigo: string | null;
  capacidad: number | null;
  provisional: boolean;
}

/** Franja ocupada de un aula: SOLO día y hora. Sin grupo, asignatura ni docente. */
export interface FranjaOcupadaAula {
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
}

@Injectable()
export class AulasService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listar(): Promise<AulaDto[]> {
    const filas = await this.dataSource.query(
      `SELECT codigo, nombre, sede_codigo, capacidad, provisional
         FROM "academic-schedule".aula ORDER BY codigo`,
    );
    return filas.map((a: any) => ({
      codigo: a.codigo,
      nombre: a.nombre,
      sedeCodigo: a.sede_codigo ?? null,
      capacidad: a.capacidad ?? null,
      provisional: a.provisional,
    }));
  }

  /**
   * Ocupación de un aula: SOLO día y hora. La consulta no trae id_grupo,
   * asignatura ni docente a propósito (RN-07). Es imposible filtrar en el
   * cliente lo que nunca salió del servidor.
   */
  async disponibilidad(aulaCodigo: string): Promise<{ aula: string; ocupada: FranjaOcupadaAula[] }> {
    const aula = await this.dataSource.query(
      `SELECT codigo FROM "academic-schedule".aula WHERE codigo = $1`,
      [aulaCodigo],
    );
    if (!aula?.length) throw new NotFoundException(`El aula ${aulaCodigo} no existe.`);

    const ocupada = await this.dataSource.query(
      `SELECT dia_semana AS "diaSemana", hora_inicio AS "horaInicio", hora_fin AS "horaFin"
         FROM "academic-schedule".franja_horaria
        WHERE aula_codigo = $1
        ORDER BY dia_semana, hora_inicio`,
      [aulaCodigo],
    );
    return {
      aula: aulaCodigo,
      ocupada: ocupada.map((f: any) => ({
        diaSemana: f.diaSemana,
        horaInicio: String(f.horaInicio).slice(0, 5),
        horaFin: String(f.horaFin).slice(0, 5),
      })),
    };
  }

  /**
   * Publica la oferta del grupo. Exige AULA en todas sus franjas — reposición de
   * la garantía que dejó de dar el esquema cuando 1371 volvió `aula_codigo`
   * nullable (el horario se arma antes de asignar salón). Sin franjas o con
   * alguna sin aula, no se publica.
   */
  async publicarGrupo(idGrupo: string): Promise<{ publicado: boolean; publicadoEn: string }> {
    const grupo = await this.dataSource.query(
      `SELECT id_grupo FROM "academic-schedule".grupo WHERE id_grupo = $1`,
      [idGrupo],
    );
    if (!grupo?.length) throw new NotFoundException('El grupo no existe.');

    const franjas = await this.dataSource.query(
      `SELECT id_franja, aula_codigo FROM "academic-schedule".franja_horaria WHERE id_grupo = $1`,
      [idGrupo],
    );
    if (!franjas.length) {
      throw new BadRequestException('No se puede publicar un grupo sin franjas de horario.');
    }
    const sinAula = franjas.filter((f: any) => !f.aula_codigo);
    if (sinAula.length > 0) {
      throw new BadRequestException(
        `No se puede publicar: ${sinAula.length} de ${franjas.length} sesión(es) no tienen aula asignada.`,
      );
    }

    const r = await this.dataSource.query(
      `UPDATE "academic-schedule".grupo
          SET publicado_en = NOW(), estado = 'PUBLICADO', updated_at = NOW()
        WHERE id_grupo = $1
      RETURNING publicado_en`,
      [idGrupo],
    );
    return { publicado: true, publicadoEn: r[0].publicado_en };
  }
}
