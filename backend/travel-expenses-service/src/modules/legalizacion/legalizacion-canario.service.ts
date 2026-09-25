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
                   AND ls.tipo_documento_soporte_id = d.tipo_documento_soporte_id)`,
    );

    const n = (v: unknown) => Number(v ?? 0);
    const violaciones = {
      sinLegalizacion: n(agregado.sin_legalizacion),
      pagadaConLegalizacion: n(agregado.pagada_con_legalizacion),
      legalizacionFueraDeFlujo: n(agregado.fuera_de_flujo),
      plazoInvertido: n(agregado.plazo_invertido),
      enviadaIncompleta: n(incompletas.n),
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
    };
  }
}
