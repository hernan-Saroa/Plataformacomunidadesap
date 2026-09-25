import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EstadoSolicitud } from '../../entities/estado-solicitud.enum';
import { ESTADOS_DISPARADOR } from './entities/config-legalizacion.entity';

const ORDEN_FLUJO = [...ESTADOS_DISPARADOR, EstadoSolicitud.PENDIENTE_LEGALIZACION];

export interface ResultadoCanario {
  ok: boolean;
  poblacion: {
    solicitudes: number;
    alcanzaronDisparador: number;
    legalizaciones: number;
    legalizacionesPorEstadoSolicitud: Record<string, number>;
  };
  violaciones: {
    /** Alcanzaron su disparador según config y no tienen legalización. */
    sinLegalizacion: number;
    /** Siguen en PAGADA con legalización abierta: debieron pasar a PENDIENTE_LEGALIZACION. */
    pagadaConLegalizacion: number;
    /** Legalización en una solicitud que no alcanzó su disparador (ni está LEGALIZADO). */
    legalizacionFueraDeFlujo: number;
    /** fecha_limite no posterior a fecha_base_plazo. */
    plazoInvertido: number;
    /** Enviadas con algún soporte obligatorio del checklist faltante. */
    enviadaIncompleta: number;
    /** EFDS-1310: solicitud LEGALIZADO sin legalización cerrada. */
    legalizadoSinCierre: number;
    /** EFDS-1310: legalización cerrada con la solicitud en otro estado. */
    cierreFueraDeLegalizado: number;
    /** EFDS-1310: reintegro distinto de pagado - legalizado. */
    reintegroInconsistente: number;
    /** EFDS-1310: revisión aprobada con algún soporte rechazado o sin revisar. */
    aprobadaConPendientes: number;
  };
  /**
   * Hasta 50 solicitudes por violación, para saber cuáles son. El total sigue en
   * `violaciones`; esto no lo reemplaza.
   */
  muestras: {
    sinLegalizacion: string[];
    pagadaConLegalizacion: string[];
    legalizadoSinCierre: string[];
    cierreFueraDeLegalizado: string[];
  };
}

/**
 * EFDS-1309 — Canario agregado sobre toda la población de solicitudes.
 *
 * Afirma el total y la composición, no un ejemplo: cada legalización debe estar
 * en una solicitud que alcanzó su disparador, y cada solicitud que lo alcanzó
 * debe tener exactamente una. Así un sobrante no compensa un faltante.
 */
@Injectable()
export class LegalizacionCanarioService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async verificar(): Promise<ResultadoCanario> {
    const [agregado] = await this.dataSource.query(
      `WITH s AS (
         SELECT sc.id, sc.estado_solicitud,
                (c.modalidad_pago IS NOT NULL
                 AND array_position($1::text[], sc.estado_solicitud::text)
                     >= array_position($1::text[], c.estado_disparador::text)) AS alcanzo,
                l.id AS legalizacion_id, l.fecha_limite, l.fecha_base_plazo, l.fecha_envio
           FROM travel_expenses.solicitudes_comision sc
           LEFT JOIN travel_expenses.config_legalizacion c
             ON c.modalidad_pago = sc.modalidad_pago AND c.activo
           LEFT JOIN travel_expenses.legalizaciones_comision l ON l.solicitud_id = sc.id
       )
       SELECT count(*)                                                        AS solicitudes,
              count(*) FILTER (WHERE alcanzo)                                 AS alcanzaron,
              count(legalizacion_id)                                          AS legalizaciones,
              count(*) FILTER (WHERE alcanzo AND legalizacion_id IS NULL)     AS sin_legalizacion,
              count(*) FILTER (WHERE legalizacion_id IS NOT NULL
                                 AND estado_solicitud = $2)                   AS pagada_con_legalizacion,
              count(*) FILTER (WHERE legalizacion_id IS NOT NULL
                                 AND NOT COALESCE(alcanzo, false)
                                 AND estado_solicitud <> $3)                  AS fuera_de_flujo,
              count(*) FILTER (WHERE legalizacion_id IS NOT NULL
                                 AND fecha_limite <= fecha_base_plazo)        AS plazo_invertido
         FROM s`,
      [ORDEN_FLUJO, EstadoSolicitud.PAGADA, EstadoSolicitud.LEGALIZADO],
    );

    const composicion: Array<{ estado_solicitud: string; n: string }> = await this.dataSource.query(
      `SELECT s.estado_solicitud, count(*) AS n
         FROM travel_expenses.legalizaciones_comision l
         JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
        GROUP BY s.estado_solicitud ORDER BY 1`,
    );

    // Una legalización enviada debe tener al menos un soporte por cada tipo
    // obligatorio vigente de su checklist (salvo pasabordos sin tramo aéreo).
    const [incompletas] = await this.dataSource.query(
      `SELECT count(*) AS n
         FROM travel_expenses.legalizaciones_comision l
         JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
         JOIN travel_expenses.comisionados co ON co.id = s.comisionado_id
         JOIN travel_expenses.config_tipo_comisionado ct ON ct.tipo_comisionado = co.tipo_comisionado
         JOIN travel_expenses.config_legalizacion_documentos d
           ON d.config_tipo_comisionado_id = ct.id AND d.activo AND d.tipo_requisito = 'OBLIGATORIO'
        WHERE l.fecha_envio IS NOT NULL
          AND (d.condicion IS NULL
               OR (d.condicion = 'TRANSPORTE_AEREO'
                   AND (s.requiere_tiquetes OR EXISTS (
                         SELECT 1 FROM jsonb_array_elements(COALESCE(s.itinerario, '[]'::jsonb)) t
                          WHERE t->>'tipoTransporte' = 'AEREO'))))
          AND NOT EXISTS (
                SELECT 1 FROM travel_expenses.legalizacion_soportes ls
                 WHERE ls.legalizacion_id = l.id
                   AND ls.tipo_documento_soporte_id = d.tipo_documento_soporte_id
                   AND ls.revision IS DISTINCT FROM 'RECHAZADO')`,
    );

    const [cierre] = await this.dataSource.query(
      `SELECT
         (SELECT count(*) FROM travel_expenses.solicitudes_comision s
            LEFT JOIN travel_expenses.legalizaciones_comision l ON l.solicitud_id = s.id
           WHERE s.estado_solicitud = $1 AND l.cerrada_en IS NULL)                   AS legalizado_sin_cierre,
         (SELECT count(*) FROM travel_expenses.legalizaciones_comision l
            JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
           WHERE l.cerrada_en IS NOT NULL AND s.estado_solicitud <> $1)              AS cierre_fuera,
         (SELECT count(*) FROM travel_expenses.legalizaciones_comision l
           WHERE l.cerrada_en IS NOT NULL
             AND l.valor_reintegro <> l.valor_pagado - l.valor_legalizado)           AS reintegro_inconsistente,
         (SELECT count(DISTINCT l.id) FROM travel_expenses.legalizaciones_comision l
            JOIN travel_expenses.legalizacion_soportes ls ON ls.legalizacion_id = l.id
           WHERE l.revision_aprobada_en IS NOT NULL
             AND (ls.revision IS NULL OR ls.revision = 'RECHAZADO'))                 AS aprobada_con_pendientes`,
      [EstadoSolicitud.LEGALIZADO],
    );

    const [muestras] = await this.dataSource.query(
      `WITH s AS (
         SELECT sc.id, sc.estado_solicitud,
                (c.modalidad_pago IS NOT NULL
                 AND array_position($1::text[], sc.estado_solicitud::text)
                     >= array_position($1::text[], c.estado_disparador::text)) AS alcanzo,
                l.id AS legalizacion_id, l.cerrada_en
           FROM travel_expenses.solicitudes_comision sc
           LEFT JOIN travel_expenses.config_legalizacion c
             ON c.modalidad_pago = sc.modalidad_pago AND c.activo
           LEFT JOIN travel_expenses.legalizaciones_comision l ON l.solicitud_id = sc.id
       )
       SELECT
         COALESCE((array_agg(id::text) FILTER (WHERE alcanzo AND legalizacion_id IS NULL))[1:50], '{}') AS sin_legalizacion,
         COALESCE((array_agg(id::text) FILTER (WHERE legalizacion_id IS NOT NULL AND estado_solicitud = $2))[1:50], '{}') AS pagada_con_legalizacion,
         COALESCE((array_agg(id::text) FILTER (WHERE estado_solicitud = $3 AND cerrada_en IS NULL))[1:50], '{}') AS legalizado_sin_cierre,
         COALESCE((array_agg(id::text) FILTER (WHERE cerrada_en IS NOT NULL AND estado_solicitud <> $3))[1:50], '{}') AS cierre_fuera
         FROM s`,
      [ORDEN_FLUJO, EstadoSolicitud.PAGADA, EstadoSolicitud.LEGALIZADO],
    );

    const n = (v: unknown) => Number(v ?? 0);
    const violaciones = {
      sinLegalizacion: n(agregado.sin_legalizacion),
      pagadaConLegalizacion: n(agregado.pagada_con_legalizacion),
      legalizacionFueraDeFlujo: n(agregado.fuera_de_flujo),
      plazoInvertido: n(agregado.plazo_invertido),
      enviadaIncompleta: n(incompletas.n),
      legalizadoSinCierre: n(cierre.legalizado_sin_cierre),
      cierreFueraDeLegalizado: n(cierre.cierre_fuera),
      reintegroInconsistente: n(cierre.reintegro_inconsistente),
      aprobadaConPendientes: n(cierre.aprobada_con_pendientes),
    };

    const legalizacionesPorEstadoSolicitud = Object.fromEntries(
      composicion.map((c) => [c.estado_solicitud, n(c.n)]),
    );
    const sumaComposicion = Object.values(legalizacionesPorEstadoSolicitud).reduce((a, b) => a + b, 0);

    return {
      // La composición debe sumar el total: si no, hay legalizaciones huérfanas.
      ok:
        Object.values(violaciones).every((v) => v === 0) &&
        sumaComposicion === n(agregado.legalizaciones),
      poblacion: {
        solicitudes: n(agregado.solicitudes),
        alcanzaronDisparador: n(agregado.alcanzaron),
        legalizaciones: n(agregado.legalizaciones),
        legalizacionesPorEstadoSolicitud,
      },
      violaciones,
      muestras: {
        sinLegalizacion: muestras.sin_legalizacion,
        pagadaConLegalizacion: muestras.pagada_con_legalizacion,
        legalizadoSinCierre: muestras.legalizado_sin_cierre,
        cierreFueraDeLegalizado: muestras.cierre_fuera,
      },
    };
  }
}
