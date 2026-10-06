import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Aprobación de la jefatura territorial — NUEVA-3 / EFDS-1939.
 *
 * Espeja el flujo de Docencia del PTA (EFDS-1230/1534): la jefatura de cada
 * territorial revisa lo que sus docentes tomaron y lo APRUEBA o lo DEVUELVE con
 * un comentario. No entra la integración con el componente de Docencia del PTA
 * (fase posterior, decidido).
 *
 * ⚠️ SEGREGACIÓN POR TERRITORIAL. Cada jefatura ve y decide SOLO su territorial,
 * resuelta desde `jefatura_territorial` por el id_user del token. La franja
 * pertenece a un territorial a través del docente que la tomó
 * (Docente.territorialId), cuyo `codigo` (DT-xxx) corresponde al
 * `direccion_territorial.id` que la jefatura tiene asignado.
 *
 * ⚠️ ESTADO EN LA FRANJA (migración 030), no en una tabla aparte:
 *   aprobar  → TOMADA → APROBADA
 *   devolver → TOMADA → PUBLICADA, conservando id_docente y con comentario
 * «Devolución bloquea el resto»: no se aprueban las demás franjas de un docente
 * mientras tenga una devolución pendiente (una franja devuelta sin re-resolver).
 */

const S = 'academic-schedule';

export interface TerritorialJefatura {
  idDireccion: number;
  codigo: string;
  nombre: string;
}

export interface FranjaAprobacion {
  idFranja: string;
  diaSemana: string;
  horaInicio: string;
  horaFin: string;
  aulaCodigo: string | null;
  estado: string;
  asignatura: string | null;
  programa: string | null;
  documentoDocente: string;
  nombreDocente: string;
}

@Injectable()
export class JefaturaService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Territorial que administra esta jefatura, resuelto desde el token. */
  async territorialDe(idUser: string | null | undefined): Promise<TerritorialJefatura> {
    const id = String(idUser ?? '').trim();
    if (!id) throw new ForbiddenException('No se pudo identificar al usuario autenticado.');

    const filas = await this.dataSource.query(
      `SELECT dt.id AS "idDireccion", dt.codigo AS "codigo", dt.nombre AS "nombre"
         FROM "${S}".jefatura_territorial jt
         JOIN academic_work_plan.direccion_territorial dt ON dt.id = jt.id_direccion_territorial
        WHERE jt.id_user::text = $1`,
      [id],
    );
    if (!filas.length) {
      throw new ForbiddenException('El usuario no es jefatura de ninguna territorial.');
    }
    return filas[0];
  }

  /** Franjas TOMADA de docentes de la territorial de la jefatura, a la espera de decisión. */
  async pendientes(idUser: string): Promise<FranjaAprobacion[]> {
    const t = await this.territorialDe(idUser);
    return this.dataSource.query(
      `SELECT f.id_franja                       AS "idFranja",
              f.dia_semana                      AS "diaSemana",
              to_char(f.hora_inicio, 'HH24:MI') AS "horaInicio",
              to_char(f.hora_fin, 'HH24:MI')    AS "horaFin",
              f.aula_codigo                     AS "aulaCodigo",
              f.estado,
              a.nombre                          AS "asignatura",
              pr.nombre                         AS "programa",
              per.num_identificacion            AS "documentoDocente",
              per.nom_largo                     AS "nombreDocente"
         FROM "${S}".franja_horaria f
         JOIN auth.personas per                 ON per.id_person = f.id_docente
         JOIN academic_work_plan."Docente" d    ON d."personaId" = per.id_person
         LEFT JOIN "${S}".grupo g               ON g.id_grupo = f.id_grupo
         LEFT JOIN academic_work_plan.asignatura a ON a.id     = g.id_asignatura
         LEFT JOIN academic_work_plan.programa pr  ON pr.id    = a.id_programa
        WHERE f.estado = 'TOMADA'
          AND d."territorialId" = $1
        ORDER BY per.nom_largo, f.dia_semana, f.hora_inicio`,
      [t.codigo],
    );
  }

  /** Verifica que la franja exista, esté TOMADA y su docente sea de la territorial. */
  private async franjaDeMiTerritorial(idFranja: string, codigo: string): Promise<{ idDocente: string }> {
    const filas = await this.dataSource.query(
      `SELECT f.estado, f.id_docente AS "idDocente", d."territorialId" AS "territorial"
         FROM "${S}".franja_horaria f
         LEFT JOIN academic_work_plan."Docente" d ON d."personaId" = f.id_docente
        WHERE f.id_franja = $1`,
      [idFranja],
    );
    if (!filas.length) throw new NotFoundException('La franja no existe.');
    const f = filas[0];
    if (f.estado !== 'TOMADA') {
      throw new ConflictException('Solo se puede decidir sobre una franja tomada por un docente.');
    }
    if (String(f.territorial) !== String(codigo)) {
      throw new ForbiddenException('Esta franja pertenece a otra territorial.');
    }
    return { idDocente: f.idDocente };
  }

  /**
   * Aprueba una franja: TOMADA → APROBADA. Bloqueada si el docente tiene una
   * devolución pendiente (una franja devuelta sin re-resolver): hay que cerrar
   * eso antes de aprobar el resto de su programación.
   */
  async aprobar(idUser: string, idFranja: string): Promise<{ aprobada: true }> {
    const t = await this.territorialDe(idUser);
    const { idDocente } = await this.franjaDeMiTerritorial(idFranja, t.codigo);

    const pend = await this.dataSource.query(
      `SELECT 1 FROM "${S}".franja_horaria
        WHERE id_docente = $1 AND estado = 'DEVUELTA'
        LIMIT 1`,
      [idDocente],
    );
    if (pend.length) {
      throw new ConflictException(
        'El docente tiene una devolución pendiente: no se puede aprobar el resto hasta que la resuelva.',
      );
    }

    await this.dataSource.query(
      `UPDATE "${S}".franja_horaria
          SET estado = 'APROBADA', comentario_jefatura = NULL, updated_at = NOW()
        WHERE id_franja = $1`,
      [idFranja],
    );
    return { aprobada: true };
  }

  /**
   * Devuelve una franja con comentario obligatorio: TOMADA → DEVUELTA,
   * conservando el id_docente (queda «suya para corregir») y el motivo. DEVUELTA
   * es un estado propio: no se confunde con PUBLICADA (libre).
   */
  async devolver(idUser: string, idFranja: string, comentario: string): Promise<{ devuelta: true }> {
    const motivo = String(comentario ?? '').trim();
    if (!motivo) throw new BadRequestException('La devolución exige un comentario con el motivo.');

    const t = await this.territorialDe(idUser);
    await this.franjaDeMiTerritorial(idFranja, t.codigo);

    await this.dataSource.query(
      `UPDATE "${S}".franja_horaria
          SET estado = 'DEVUELTA', comentario_jefatura = $2, updated_at = NOW()
        WHERE id_franja = $1`,
      [idFranja, motivo],
    );
    return { devuelta: true };
  }
}
