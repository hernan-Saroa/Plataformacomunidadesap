import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Territorial del docente y del usuario que decide — EFDS-2315 / EFDS-2304.
 *
 * El ÚNICO lugar que cruza los dos catálogos, y lo hace por la tabla explícita
 * `equivalencia_territorial` (migración 038): código del RUND ('DT-009') ↔
 * seccional de auth (10 'HUI'). Nunca por nombre. Lo que no está en la tabla no
 * se resuelve, y quien decide con alcance territorial falla cerrado.
 */
@Injectable()
export class TerritorialService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Seccional (auth) del docente, por su territorial del RUND. null = no mapeada. */
  async seccionalDeDocente(idPersonDocente: string): Promise<string | null> {
    const filas = await this.dataSource.query(
      `SELECT e.id_seccional::text AS id
         FROM academic_work_plan."Docente" d
         JOIN "academic-schedule".equivalencia_territorial e ON e.codigo_territorial = d."territorialId"
        WHERE d."personaId" = $1
        ORDER BY d."updatedAt" DESC NULLS LAST
        LIMIT 1`,
      [idPersonDocente]);
    return filas[0]?.id ?? null;
  }

  /**
   * Seccionales (auth) del usuario: la de su persona y la de su sede. Mismo
   * criterio que el PTA (`resolvePersonalScopeForUser`). Vacío = sin territorial.
   */
  async seccionalesDeUsuario(idUser: string): Promise<string[]> {
    const filas: Array<{ id: string | null }> = await this.dataSource.query(
      `SELECT p.id_seccional::text AS id
         FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
        WHERE u.id_user::text = $1
       UNION
       SELECT s.id_seccional::text
         FROM auth."user" u JOIN auth.personas p ON p.id_person = u.id_person
         JOIN auth.sedes s ON s.id_sede = p.id_sede
        WHERE u.id_user::text = $1`,
      [idUser]);
    return [...new Set(filas.map((f) => f.id).filter((x): x is string => !!x))];
  }

  /**
   * Territoriales del RUND (ids de direccion_territorial) de una jefatura.
   *
   * EFDS-2304: la territorial de la jefatura ahora se asigna desde la pantalla
   * GENÉRICA de usuarios (la seccional de la persona) y se traduce con la tabla.
   * Las asignaciones de la tabla propia `jefatura_territorial` se conservan por
   * compatibilidad mientras la concertación siga apagada.
   */
  async territorialesDeJefatura(idUser: string): Promise<number[]> {
    const filas: Array<{ id: string }> = await this.dataSource.query(
      `SELECT jt.id_direccion_territorial::text AS id
         FROM "academic-schedule".jefatura_territorial jt
        WHERE jt.id_user::text = $1
       UNION
       SELECT dt.id::text
         FROM auth."user" u
         JOIN auth.personas p ON p.id_person = u.id_person
         JOIN "academic-schedule".equivalencia_territorial e ON e.id_seccional = p.id_seccional
         JOIN academic_work_plan.direccion_territorial dt ON dt.codigo = e.codigo_territorial
        WHERE u.id_user::text = $1`,
      [idUser]);
    return [...new Set(filas.map((f) => Number(f.id)))];
  }
}
