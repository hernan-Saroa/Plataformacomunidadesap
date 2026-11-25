import { EntityManager } from 'typeorm';

import { etapa10Abierta, PasoDeLaEtapa9 } from './reglas';

/**
 * Lo que dice la base sobre la frontera entre la etapa 9 y la 10 (151).
 *
 * Aparte del servicio porque también lo leen la secuencia del riel —para el
 * «te toca»— y el detalle del proceso, y ninguno de los dos necesita el resto
 * del trámite.
 */

/** Las actividades de la etapa 9 del proceso, con si aplican, y si hay una modificación a medias. */
export async function situacionDeLaEtapa9(
  em: EntityManager,
  procesoId: string,
  contratoId: string | null,
): Promise<{ pasos: PasoDeLaEtapa9[]; modificacionEnCurso: boolean }> {
  const pasos: PasoDeLaEtapa9[] = (
    await em.query(
      `SELECT a.numeral, a.nombre, pa.estado,
              NOT EXISTS (
                SELECT 1 FROM hiring.actividades_excluidas x
                 WHERE x.numeral = a.numeral AND x.modalidad = p.modalidad
              ) AND COALESCE(pa.estado, '') <> 'NO_APLICA' AS aplica
         FROM hiring.procesos p
         JOIN hiring.actividades a ON a.activa AND a.etapa = 9
         LEFT JOIN hiring.proceso_actividades pa ON pa.proceso_id = p.id AND pa.numeral = a.numeral
        WHERE p.id = $1
        ORDER BY a.orden`,
      [procesoId],
    )
  ).map((f: any) => ({ numeral: f.numeral, nombre: f.nombre, estado: f.estado ?? null, aplica: f.aplica === true }));

  if (!contratoId) return { pasos, modificacionEnCurso: false };

  // Una modificación sigue en curso si su trámite no llegó a un final, o si
  // quedó una de las de antes (la 9.5 del proceso) sin perfeccionar.
  const [{ hay }] = await em.query(
    `SELECT (
        EXISTS (SELECT 1 FROM hiring.tramites_modificacion
                 WHERE contrato_id = $1 AND estado NOT IN ('RECIBIDA', 'PERFECCIONADA', 'PUBLICADA', 'DESISTIDA', 'NEGADA'))
        OR EXISTS (SELECT 1 FROM hiring.modificaciones_contrato WHERE contrato_id = $1 AND estado = 'EN_TRAMITE')
     ) AS hay`,
    [contratoId],
  );
  return { pasos, modificacionEnCurso: hay === true };
}

/** Si la etapa 10 del proceso está abierta: ver `etapa10Abierta`. */
export async function etapa10AbiertaEn(em: EntityManager, procesoId: string): Promise<boolean> {
  const [fila] = await em.query(
    `SELECT
        EXISTS (SELECT 1 FROM hiring.tramites_liquidacion
                 WHERE proceso_id = $1 AND estado <> 'DESISTIDA') AS tramite_vivo,
        -- Empezada es trabajada: las filas en borrador las crea la plataforma
        -- sola, y no dicen que alguien haya llegado ahí.
        (EXISTS (SELECT 1 FROM hiring.proceso_actividades
                  WHERE proceso_id = $1 AND numeral LIKE '10.%' AND estado NOT IN ('BORRADOR', 'NO_APLICA'))
         OR EXISTS (SELECT 1 FROM hiring.contratos c
                     WHERE c.proceso_id = $1
                       AND (EXISTS (SELECT 1 FROM hiring.informes_finales i WHERE i.contrato_id = c.id)
                            OR EXISTS (SELECT 1 FROM hiring.actas_liquidacion a WHERE a.contrato_id = c.id)
                            OR EXISTS (SELECT 1 FROM hiring.cierres_financieros f WHERE f.contrato_id = c.id)))) AS empezada,
        (SELECT c.estado FROM hiring.contratos c
          WHERE c.proceso_id = $1 AND c.estado <> 'RECHAZADO'
          ORDER BY c.created_at DESC LIMIT 1) AS estado_contrato`,
    [procesoId],
  );
  return etapa10Abierta({
    tramiteVivo: fila?.tramite_vivo === true,
    etapa10Empezada: fila?.empezada === true,
    estadoContrato: fila?.estado_contrato ?? null,
  });
}
