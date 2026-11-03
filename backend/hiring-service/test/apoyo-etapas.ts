import { DataSource } from 'typeorm';

/**
 * Deja la segunda sesión del Comité de Contratación (5.6.1) aprobada.
 *
 * Desde la 113 la apertura de una licitación exige que el pliego definitivo
 * haya pasado por la cadena —abogado revisor, directora— y por el comité. Las
 * pruebas que no son de ese trámite solo necesitan que esté hecho: recorrer la
 * cadena en cada una las ataría a cómo se configura la aprobación.
 *
 * Donde la modalidad no tiene 5.6.1 no hace nada: la actividad no existe o no
 * aplica, y la apertura no la pide.
 */
export async function aprobarSegundaSesion(dataSource: DataSource, procesoId: string) {
  const [actividad] = await dataSource.query(
    `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '5.6.1'`,
    [procesoId],
  );
  if (!actividad || actividad.estado === 'NO_APLICA') return;

  await dataSource.query(
    `UPDATE hiring.proceso_actividades SET estado = 'APROBADO'
      WHERE proceso_id = $1 AND numeral = '5.6.1'`,
    [procesoId],
  );
  await dataSource.query(
    `INSERT INTO hiring.sesiones_comite_contratacion (proceso_id, fecha, decision, sumision, registrado_por)
     VALUES ($1, CURRENT_DATE, 'APROBADO', 2, 'prueba')`,
    [procesoId],
  );
}

/**
 * Marca el proceso como de obra pública en la 3.1.
 *
 * Desde la 114 el sobre económico (7.1.1) solo se abre en la licitación de obra
 * pública, y eso lo dice la tipología contractual del estudio previo. Al
 * cambiarla en la 3.1, `reaplicarModalidad` reactiva la 7.1.1; aquí se hace lo
 * mismo sobre esa sola actividad.
 */
export async function deObraPublica(dataSource: DataSource, procesoId: string) {
  await dataSource.query(
    `UPDATE hiring.proceso_actividades
        SET datos = COALESCE(datos, '{}'::jsonb) || '{"tipologia_contractual": "Obra pública"}'::jsonb
      WHERE proceso_id = $1 AND numeral = '3.1'`,
    [procesoId],
  );
  await dataSource.query(
    `UPDATE hiring.proceso_actividades SET estado = 'BORRADOR'
      WHERE proceso_id = $1 AND numeral = '7.1.1' AND estado = 'NO_APLICA'
        AND NOT EXISTS (
          SELECT 1 FROM hiring.actividades_excluidas e
            JOIN hiring.procesos p ON p.modalidad = e.modalidad
           WHERE p.id = $1 AND e.numeral = '7.1.1')`,
    [procesoId],
  );
}
