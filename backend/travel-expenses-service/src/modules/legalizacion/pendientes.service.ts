import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { EstadoSolicitud } from '../../entities/estado-solicitud.enum';

/** Definición única C-1. Una configuración ausente nunca permite certificar. */
export const SQL_PENDIENTES = `
  SELECT s.id, s.consecutivo_unico AS codigo, s.estado_solicitud AS estado,
         l.fecha_limite AS "fechaLimite"
    FROM travel_expenses.solicitudes_comision s
    LEFT JOIN travel_expenses.config_legalizacion c ON c.modalidad_pago = s.modalidad_pago
    LEFT JOIN travel_expenses.legalizaciones_comision l ON l.solicitud_id = s.id
   WHERE s.comisionado_id = $1 AND s.estado_solicitud = ANY($2::text[])
     AND COALESCE(c.activo, TRUE)
   ORDER BY s.consecutivo_unico`;

@Injectable()
export class PendientesService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  tieneLegalizacionesPendientes(idComisionado: string): Promise<{
    pendiente: boolean;
    comisiones: { id: string; codigo: string; estado: string; fechaLimite: Date | null }[];
  }> {
    return this.consultar(this.db.manager, idComisionado);
  }

  /** Misma consulta dentro de la transacción de emisión; no duplica C-1. */
  async consultar(manager: EntityManager, idComisionado: string) {
    const comisiones: { id: string; codigo: string; estado: string; fechaLimite: Date | null }[] =
      await manager.query(SQL_PENDIENTES, [idComisionado,
        [EstadoSolicitud.PAGADA, EstadoSolicitud.PENDIENTE_LEGALIZACION]]);
    return { pendiente: comisiones.length > 0, comisiones };
  }
}
