import { EntityManager } from 'typeorm';

import {
  NUMERAL_ESTUDIO_PREVIO,
  ProcesoActividad,
} from '../../entities/proceso-actividad.entity';

/**
 * Apertura del sobre económico en audiencia de adjudicación.
 *
 * La matriz la numera 7.1.1, colgada de la audiencia (migración 114).
 */
export const NUMERAL_SOBRE_ECONOMICO = '7.1.1';

/** El valor de `tipologia_contractual` de la 3.1 que es obra pública. */
export const TIPOLOGIA_OBRA_PUBLICA = 'Obra pública';

/** La tipología contractual que el área eligió en la 3.1, o nulo si no la ha elegido. */
export async function tipologiaDelProceso(
  em: EntityManager,
  procesoId: string,
): Promise<string | null> {
  const estudio = await em.getRepository(ProcesoActividad).findOne({
    where: { procesoId, numeral: NUMERAL_ESTUDIO_PREVIO },
  });
  const valor = (estudio?.datos as Record<string, unknown> | undefined)?.tipologia_contractual;
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

/**
 * Las actividades que este proceso no recorre por lo que es, aunque su
 * modalidad sí las recorra. Numeral → motivo.
 *
 * `actividades_excluidas` solo sabe de modalidades, y la matriz tiene una fila
 * que pide más: la 7.1.1 «aplica solo para la licitación de obra pública». La
 * licitación la pone la tabla; que el objeto sea obra lo dice la tipología de
 * la 3.1. Sin tipología elegida tampoco aplica: abrir un sobre en audiencia es
 * la excepción, y el proceso que no dice ser de obra no la adelanta.
 */
export async function excluidasPorElProceso(
  em: EntityManager,
  procesoId: string,
): Promise<Map<string, string>> {
  const excluidas = new Map<string, string>();

  const tipologia = await tipologiaDelProceso(em, procesoId);
  if (tipologia !== TIPOLOGIA_OBRA_PUBLICA) {
    excluidas.set(
      NUMERAL_SOBRE_ECONOMICO,
      tipologia
        ? `el sobre económico solo se abre en audiencia en la licitación de obra pública, y la tipología del estudio previo es «${tipologia}»`
        : 'el sobre económico solo se abre en audiencia en la licitación de obra pública, y el estudio previo no tiene tipología contractual',
    );
  }

  return excluidas;
}
