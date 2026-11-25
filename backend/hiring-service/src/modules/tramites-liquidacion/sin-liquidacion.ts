import { EntityManager } from 'typeorm';

/**
 * Si el contrato se cerró sin liquidarse, por el trámite de cierre (151).
 *
 * Es lo que pasa con los PSPAG: por ley no se liquidan, se cierran en SECOP II.
 * Lo que en los demás va sobre el acta de liquidación —el cierre financiero
 * (10.3) y el archivo del expediente (10.4)— en esos va sobre este cierre.
 */
export async function cerradoSinLiquidar(em: EntityManager, contratoId: string): Promise<boolean> {
  const [fila] = await em.query(
    `SELECT 1 FROM hiring.tramites_liquidacion
      WHERE contrato_id = $1 AND clase = 'CIERRE' AND estado = 'CERRADA'
      LIMIT 1`,
    [contratoId],
  );
  return !!fila;
}
