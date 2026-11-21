import { DataSource } from 'typeorm';

export const RUND_CONSULTA_SENSIBLE = 'CONSULTAR_DATOS_SENSIBLES';

/**
 * `RundAprobacionLog."createdAt"` es `timestamp sin zona` y la base (sesión America/Bogota) la guarda con la hora
 * de Bogotá. Si el proceso Node corre en UTC (Docker/servidor), el driver la lee como UTC y la pantalla muestra
 * 5 horas menos. Se convierte en la base a un instante real (`AT TIME ZONE current_setting('TIMEZONE')`, igual que
 * la Trazabilidad de registros) para que la hora sea correcta sin importar la zona del proceso.
 * Se ordena por la columna original para seguir usando idx_rund_aprobacion_log_docente_fecha.
 */
export async function leerAuditoriaRund(
  db: Pick<DataSource, 'query'>,
  docenteId: string,
  options: { consultasSensibles: boolean; limit: number },
): Promise<Array<Record<string, any>>> {
  const operator = options.consultasSensibles ? '=' : '<>';
  const rows = await db.query(
    `SELECT id, docente_id, bloque, accion, actor_id, canal_origen, campo_afectado, dato_previo, dato_nuevo,
            observacion, soporte_id, ip, metadata,
            "createdAt" AT TIME ZONE current_setting('TIMEZONE') AS created_at_real
       FROM academic_work_plan."RundAprobacionLog"
      WHERE docente_id = $1::uuid AND accion ${operator} $2
      ORDER BY "createdAt" DESC, id DESC
      LIMIT $3`,
    [docenteId, RUND_CONSULTA_SENSIBLE, options.limit],
  );
  return rows.map((row: Record<string, any>) => ({
    id: row.id,
    docenteId: row.docente_id,
    bloque: row.bloque,
    accion: row.accion,
    actorId: row.actor_id,
    canalOrigen: row.canal_origen,
    campoAfectado: row.campo_afectado,
    datoPrevio: row.dato_previo,
    datoNuevo: row.dato_nuevo,
    observacion: row.observacion,
    soporteId: row.soporte_id,
    ip: row.ip,
    metadata: row.metadata ?? {},
    createdAt: row.created_at_real,
  }));
}
