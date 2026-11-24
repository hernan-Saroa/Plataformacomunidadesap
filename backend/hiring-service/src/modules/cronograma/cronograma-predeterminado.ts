import { BadRequestException } from '@nestjs/common';

import { ETAPAS_DEL_CRONOGRAMA } from './cronograma-etapas';

/**
 * Cronograma predeterminado por modalidad (140, sin plazos desde la 144,
 * EFDS-1152).
 *
 * Contratación dice qué etapas y qué actividades salen por defecto en el
 * cronograma de la 5.2 de un proceso de cada modalidad. Nada de fechas ni de
 * días: eso se fija en la 5.2 de cada proceso.
 */

export interface PredeterminadoAGuardar {
  /** Etapas macro (5 a 10) que salen. */
  etapas: number[];
  /** Actividades del flujo que salen, por numeral. */
  numerales: string[];
  /** Actividades propias que salen, con su etapa. */
  propias: { nombre: string; etapa: number }[];
}

/** Lo que no puede guardarse aunque cada campo sea válido por sí solo. */
export function validarPredeterminado(
  dato: PredeterminadoAGuardar,
  catalogo: ReadonlyMap<string, { etapa: number }>,
) {
  const etapas = new Set<number>();
  for (const e of dato.etapas) {
    if (!(ETAPAS_DEL_CRONOGRAMA as readonly number[]).includes(e)) {
      throw new BadRequestException(`La etapa ${e} no está en el cronograma: van de la 5 a la 10`);
    }
    if (etapas.has(e)) throw new BadRequestException(`La etapa ${e} aparece dos veces`);
    etapas.add(e);
  }

  const vistos = new Set<string>();
  for (const numeral of dato.numerales) {
    const actividad = catalogo.get(numeral);
    if (!actividad) throw new BadRequestException(`La ${numeral} no es de las etapas 5 a 10 de esta modalidad`);
    if (vistos.has(numeral)) throw new BadRequestException(`La ${numeral} aparece dos veces`);
    if (!etapas.has(Number(actividad.etapa))) {
      throw new BadRequestException(`La ${numeral} es de la etapa ${actividad.etapa}, que no sale en el cronograma`);
    }
    vistos.add(numeral);
  }

  for (const p of dato.propias) {
    const nombre = p.nombre?.trim();
    if (!nombre) throw new BadRequestException('Ponle nombre a la actividad propia');
    if (!etapas.has(Number(p.etapa))) {
      throw new BadRequestException(`«${nombre}» va en la etapa ${p.etapa}, que no sale en el cronograma`);
    }
    const llave = `${p.etapa}:${nombre.toLowerCase()}`;
    if (vistos.has(llave)) throw new BadRequestException(`«${nombre}» aparece dos veces en la etapa ${p.etapa}`);
    vistos.add(llave);
  }
}
