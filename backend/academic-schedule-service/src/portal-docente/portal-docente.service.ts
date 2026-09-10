import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AcumuladoService, type AcumuladoDocente } from '../asignaciones/acumulado.service.js';

/**
 * Portal del docente — EFDS-1938.
 *
 * El docente ve las franjas PUBLICADAS que puede tomar, toma las que le sirven y
 * suelta las que no —siempre que no estén aprobadas—, y ve su acumulado contra el
 * tope del RUND en tiempo real.
 *
 * ⚠️ IDENTIDAD EN EL SERVIDOR. Quién es el docente NO lo dice el cliente: se
 * resuelve desde `x-user-id` (el `id_user` del token) contra auth."user". Un
 * docente no puede tomar franjas «como» otro; el id_docente que se graba es el
 * del token, nunca un parámetro del request.
 *
 * ⚠️ CONCURRENCIA (criterio de aceptación, no detalle). Tomar una franja corre en
 * una TRANSACCIÓN con `SELECT … FOR UPDATE` sobre la fila: dos docentes que
 * pulsan a la vez se serializan en la base, no en el cliente. Exactamente uno
 * gana; el otro recibe conflicto.
 *
 * ⚠️ RN-09: el RUND es de solo lectura. El acumulado se consulta, no se escribe.
 * No se toca el calculador del PTA: se reusa el AcumuladoService (EFDS-1373).
 */

export interface DocenteIdentidad {
  idPerson: string;
  documento: string;
  nombre: string;
}

export interface FranjaPortal {
  idFranja: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  tipoSesion: string;
  aulaCodigo: string | null;
  estado: string;
  numeroGrupo: number | null;
  asignatura: string | null;
  programa: string | null;
}

@Injectable()
export class PortalDocenteService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly acumuladoSvc: AcumuladoService,
  ) {}

  /** Resuelve al docente autenticado (id_person + documento) desde su id_user. */
  async resolverDocente(idUser: string | null | undefined): Promise<DocenteIdentidad> {
    const id = String(idUser ?? '').trim();
    if (!id) throw new ForbiddenException('No se pudo identificar al usuario autenticado.');

    const filas = await this.dataSource.query(
      `SELECT u.id_person AS "idPerson",
              p.num_identificacion AS "documento",
              p.nom_largo AS "nombre"
         FROM auth."user" u
         JOIN auth.personas p ON p.id_person = u.id_person
        WHERE u.id_user::text = $1`,
      [id],
    );
    if (!filas.length) {
      throw new ForbiddenException('El usuario autenticado no corresponde a un docente del RUND.');
    }
    return filas[0];
  }

  private readonly SELECT_CONTEXTO = `
    SELECT f.id_franja                        AS "idFranja",
           f.dia_semana                       AS "diaSemana",
           to_char(f.hora_inicio, 'HH24:MI')  AS "horaInicio",
           to_char(f.hora_fin, 'HH24:MI')     AS "horaFin",
           f.tipo_sesion                      AS "tipoSesion",
           f.aula_codigo                      AS "aulaCodigo",
           f.estado,
           g.numero_grupo                     AS "numeroGrupo",
           a.nombre                           AS "asignatura",
           pr.nombre                          AS "programa"
      FROM "academic-schedule".franja_horaria f
      LEFT JOIN "academic-schedule".grupo g     ON g.id_grupo = f.id_grupo
      LEFT JOIN academic_work_plan.asignatura a ON a.id       = g.id_asignatura
      LEFT JOIN academic_work_plan.programa pr  ON pr.id      = a.id_programa`;

  /**
   * Franjas PUBLICADAS que el docente puede tomar, EXCLUYENDO las que cruzan con
   * lo que ya tiene (TOMADA o APROBADA): mismo día y hora solapada. Al tomar una,
   * las que cruzan con ella desaparecen de este listado en la siguiente carga —
   * porque pasan a cruzar con una franja que el docente ya posee.
   */
  async disponibles(idPerson: string): Promise<FranjaPortal[]> {
    return this.dataSource.query(
      `${this.SELECT_CONTEXTO}
        WHERE f.estado = 'PUBLICADA'
          AND NOT EXISTS (
            SELECT 1 FROM "academic-schedule".franja_horaria m
             WHERE m.id_docente = $1
               AND m.estado IN ('TOMADA', 'APROBADA')
               AND m.dia_semana = f.dia_semana
               AND m.hora_inicio < f.hora_fin
               AND f.hora_inicio < m.hora_fin
          )
        ORDER BY f.dia_semana ASC, f.hora_inicio ASC`,
      [idPerson],
    );
  }

  /** Franjas que el docente ya tomó (o le aprobaron). */
  async misFranjas(idPerson: string): Promise<FranjaPortal[]> {
    return this.dataSource.query(
      `${this.SELECT_CONTEXTO}
        WHERE f.id_docente = $1 AND f.estado IN ('TOMADA', 'APROBADA')
        ORDER BY f.dia_semana ASC, f.hora_inicio ASC`,
      [idPerson],
    );
  }

  /**
   * Toma una franja. Transacción + lock de fila: el segundo request sobre la
   * misma franja espera al primero y, al ver que ya no está PUBLICADA, recibe
   * conflicto. También se rechaza si la franja cruza con algo que el docente ya
   * posee (revalidado bajo el lock, no en el cliente).
   */
  async tomar(idPerson: string, idFranja: string): Promise<{ tomada: true }> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const filas = await qr.query(
        `SELECT id_franja, estado, dia_semana,
                hora_inicio, hora_fin
           FROM "academic-schedule".franja_horaria
          WHERE id_franja = $1
          FOR UPDATE`,
        [idFranja],
      );
      if (!filas.length) throw new NotFoundException('La franja no existe.');
      const f = filas[0];
      if (f.estado !== 'PUBLICADA') {
        throw new ConflictException('La franja ya no está disponible: alguien la tomó o se retiró de publicación.');
      }

      const cruce = await qr.query(
        `SELECT 1 FROM "academic-schedule".franja_horaria m
          WHERE m.id_docente = $1
            AND m.estado IN ('TOMADA', 'APROBADA')
            AND m.dia_semana = $2
            AND m.hora_inicio < $4 AND $3 < m.hora_fin
          LIMIT 1`,
        [idPerson, f.dia_semana, f.hora_inicio, f.hora_fin],
      );
      if (cruce.length) {
        throw new ConflictException('No puede tomar esta franja: se cruza con otra que usted ya tiene.');
      }

      await qr.query(
        `UPDATE "academic-schedule".franja_horaria
            SET estado = 'TOMADA', id_docente = $1, updated_at = NOW()
          WHERE id_franja = $2`,
        [idPerson, idFranja],
      );
      await qr.commitTransaction();
      return { tomada: true };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * Suelta una franja tomada: TOMADA → PUBLICADA, liberando el id_docente. Solo
   * la puede soltar quien la tomó, y solo si NO está aprobada: una vez la
   * jefatura la aprobó, deshacerla es decisión de la jefatura, no del docente.
   */
  async soltar(idPerson: string, idFranja: string): Promise<{ soltada: true }> {
    const filas = await this.dataSource.query(
      `SELECT estado, id_docente FROM "academic-schedule".franja_horaria WHERE id_franja = $1`,
      [idFranja],
    );
    if (!filas.length) throw new NotFoundException('La franja no existe.');
    const f = filas[0];
    if (f.estado === 'APROBADA') {
      throw new ConflictException('No puede soltar una franja ya aprobada por la jefatura.');
    }
    if (f.estado !== 'TOMADA' || String(f.id_docente) !== String(idPerson)) {
      throw new ConflictException('Solo puede soltar una franja que usted haya tomado.');
    }

    await this.dataSource.query(
      `UPDATE "academic-schedule".franja_horaria
          SET estado = 'PUBLICADA', id_docente = NULL, updated_at = NOW()
        WHERE id_franja = $1`,
      [idFranja],
    );
    return { soltada: true };
  }

  /** Acumulado del docente contra su tope (RN-04). Reusa EFDS-1373; no escribe RUND. */
  acumulado(documento: string): Promise<AcumuladoDocente> {
    return this.acumuladoSvc.consumo(documento);
  }
}
