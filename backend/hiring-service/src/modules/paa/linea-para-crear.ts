import { ConflictException, NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';

import { PaaLinea, PaaRegion, PaaVersion, PaaVigencia } from '../../entities/paa.entity';
import { origenDesdeLinea } from './estructura-paa';

/** Todo lo que un proceso nuevo necesita saber de la línea de la que nace. */
export interface OrigenPaa {
  linea: PaaLinea;
  version: PaaVersion;
  vigencia: PaaVigencia;
  region: PaaRegion;
  /** Lo que el PAA le pone al proceso, por campo (ver `CAMPOS_CONTROLADOS`). */
  origen: Record<string, string | number | null>;
}

/**
 * La línea con la que se va a crear un proceso, si se puede usar.
 *
 * Se puede si es de la versión activa de la vigencia vigente, si su región
 * sigue activa y si no tiene ya un proceso vivo. Bloquea la fila de la línea
 * hasta el final de la transacción: dos personas que eligen la misma línea a la
 * vez no crean dos procesos, la segunda espera y encuentra el de la primera.
 * El índice único de `procesos` lo impediría igual, pero con un error que no
 * dice qué proceso ocupó la línea.
 *
 * Es una función y no un servicio para que el estudio previo pueda usarla sin
 * importar el módulo del PAA, que a su vez necesita al estudio previo para
 * devolver procesos.
 */
export async function lineaParaCrear(em: EntityManager, lineaId: string): Promise<OrigenPaa> {
  const linea = await em
    .createQueryBuilder(PaaLinea, 'l')
    .setLock('pessimistic_write')
    .where('l.id = :lineaId', { lineaId })
    .getOne();
  if (!linea) throw new NotFoundException('La línea del PAA no existe');

  const version = await em.findOneOrFail(PaaVersion, { where: { id: linea.versionId } });
  const [vigencia, region] = await Promise.all([
    em.findOneOrFail(PaaVigencia, { where: { id: version.vigenciaId } }),
    em.findOneOrFail(PaaRegion, { where: { id: linea.regionId } }),
  ]);

  if (version.estado !== 'ACTIVA') {
    throw new ConflictException(
      `La línea ${linea.codigo} es de la versión ${version.numero}, que ya no es la activa. Vuelva a buscarla: puede haber cambiado.`,
    );
  }
  if (!vigencia.vigente) {
    throw new ConflictException(`La vigencia ${vigencia.anio} no es la vigente: los procesos nuevos salen del PAA del año en curso.`);
  }
  if (!region.activa) {
    throw new ConflictException(`La región ${region.nombre} está desactivada.`);
  }

  const [ocupada] = await em.query(
    `SELECT radicado FROM hiring.procesos
      WHERE paa_region_id = $1 AND paa_anio = $2 AND paa_codigo = $3
        AND estado IN ('EN_CURSO', 'ADJUDICADO')
      LIMIT 1`,
    [region.id, vigencia.anio, linea.codigo],
  );
  if (ocupada) {
    throw new ConflictException(
      `La línea ${linea.codigo} ya originó el proceso ${ocupada.radicado}. Una línea admite un solo proceso mientras ese siga en curso o adjudicado.`,
    );
  }

  return { linea, version, vigencia, region, origen: origenDesdeLinea(linea.codigo, linea.valores) };
}

/** Si el error es el del índice que reserva la línea a un solo proceso vivo. */
export function esLineaOcupada(error: unknown): boolean {
  const e = error as { code?: string; constraint?: string; driverError?: { constraint?: string } };
  return e?.code === '23505' && (e.constraint ?? e.driverError?.constraint) === 'uq_paa_linea_un_proceso_vivo';
}
