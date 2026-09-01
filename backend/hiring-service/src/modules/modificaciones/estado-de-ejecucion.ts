import { EntityManager } from 'typeorm';

import { EstadoContrato } from '../../entities/contrato.entity';
import {
  EstadoModificacion,
  ModificacionContrato,
  TipoModificacion,
} from '../../entities/modificacion-contrato.entity';

/**
 * En qué punto de su ejecución está el contrato según sus modificaciones
 * aprobadas: corriendo, en pausa o terminado antes de tiempo.
 *
 * Sirve para **volver atrás sin adivinar**. Anular el acta de liquidación
 * devuelve el contrato a donde estaba, y hasta EFDS-1178 «donde estaba» era
 * siempre EJECUCION porque no había otra cosa. Con la terminación anticipada
 * dejó de serlo: un contrato terminado que se liquida y al que después se le
 * anula el acta tiene que volver a TERMINADO, no a una ejecución que nadie
 * retomó.
 *
 * Se deriva de los hechos —los actos aprobados— y no de una columna que
 * recuerde el estado anterior, con el mismo criterio que `suspensionVigente`:
 * guardarlo dos veces daría dos sitios que pueden discrepar.
 */
export async function estadoDeEjecucion(
  em: EntityManager,
  contratoId: string,
): Promise<EstadoContrato> {
  const repo = em.getRepository(ModificacionContrato);

  const terminacion = await repo.findOne({
    where: {
      contratoId,
      tipo: 'TERMINACION_ANTICIPADA' as TipoModificacion,
      estado: 'APROBADA' as EstadoModificacion,
    },
  });
  if (terminacion) return 'TERMINADO';

  // La suspensión sin levantar: hay una reanudación aprobada por cada
  // suspensión que ya se levantó, así que la que no tiene la suya sigue viva.
  const suspensiones = await repo.find({
    where: {
      contratoId,
      tipo: 'SUSPENSION' as TipoModificacion,
      estado: 'APROBADA' as EstadoModificacion,
    },
    order: { createdAt: 'ASC' },
  });

  for (const suspension of suspensiones) {
    const levantada = await repo.findOne({
      where: {
        reanudaModificacionId: suspension.id,
        estado: 'APROBADA' as EstadoModificacion,
      },
    });
    if (!levantada) return 'SUSPENDIDO';
  }

  return 'EJECUCION';
}
