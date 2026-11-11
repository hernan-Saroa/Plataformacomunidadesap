import { BadRequestException } from '@nestjs/common';

import { aFecha, aYMD, sumarDiasHabiles } from '../publicacion/dias-habiles';
import { CANALES_CRONOGRAMA, DESTINOS_CRONOGRAMA } from './cronograma-actividades';
import { ETAPAS_DEL_CRONOGRAMA } from './cronograma-etapas';

/**
 * Cronograma predeterminado por modalidad (140, EFDS-1152).
 *
 * Contratación dice, para cada actividad, en qué día empieza y en qué día
 * termina contado desde el día cero, y si son días hábiles o calendario. En la
 * 5.2 se elige el día cero y salen las fechas: una propuesta que el abogado
 * ajusta antes de guardar, no un cronograma que se imponga solo.
 */

export const TIPOS_DE_DIAS = ['HABILES', 'CALENDARIO'] as const;
export type TipoDeDias = (typeof TIPOS_DE_DIAS)[number];

/** Una fila del predeterminado: una actividad del flujo o una propia. */
export interface FilaPredeterminada {
  numeral?: string | null;
  nombre?: string | null;
  etapa?: number | null;
  /** Nulo si solo importa cuándo termina. */
  diaInicio?: number | null;
  diaFin: number;
  tipoDias?: string | null;
  diasAntes?: number | null;
  avisarA?: string[] | null;
  canal?: string | null;
  correos?: string[] | null;
  nota?: string | null;
}

const enRango = (n: unknown, min: number, max: number) =>
  Number.isInteger(n) && (n as number) >= min && (n as number) <= max;

/** Lo que no puede guardarse aunque cada campo sea válido por sí solo. */
export function validarPredeterminado(filas: FilaPredeterminada[], numeralesValidos: Set<string>) {
  const vistos = new Set<string>();
  for (const f of filas) {
    let quien: string;
    if (f.numeral) {
      quien = f.numeral;
      if (f.nombre) throw new BadRequestException(`La ${f.numeral} ya tiene su nombre en el flujo: no se le pone otro`);
      if (!numeralesValidos.has(f.numeral)) {
        throw new BadRequestException(`La ${f.numeral} no es de las etapas 5 a 10 de esta modalidad`);
      }
      if (vistos.has(f.numeral)) throw new BadRequestException(`La ${f.numeral} aparece dos veces`);
      vistos.add(f.numeral);
    } else {
      const nombre = f.nombre?.trim();
      if (!nombre) throw new BadRequestException('Ponle nombre a la actividad propia');
      quien = `«${nombre}»`;
      if (!(ETAPAS_DEL_CRONOGRAMA as readonly number[]).includes(Number(f.etapa))) {
        throw new BadRequestException(`${quien}: di en qué etapa va (5 a 10)`);
      }
      const llave = `${f.etapa}:${nombre.toLowerCase()}`;
      if (vistos.has(llave)) throw new BadRequestException(`${quien} aparece dos veces en la etapa ${f.etapa}`);
      vistos.add(llave);
    }

    if (!enRango(f.diaFin, 0, 730)) throw new BadRequestException(`${quien}: el día de fin va de 0 a 730`);
    if (f.diaInicio !== null && f.diaInicio !== undefined) {
      if (!enRango(f.diaInicio, 0, 730)) throw new BadRequestException(`${quien}: el día de inicio va de 0 a 730`);
      if (f.diaInicio > f.diaFin) throw new BadRequestException(`${quien}: el día de inicio no puede ser posterior al de fin`);
    }
    if (f.tipoDias && !(TIPOS_DE_DIAS as readonly string[]).includes(f.tipoDias)) {
      throw new BadRequestException(`${quien}: indica si los días son hábiles o calendario`);
    }
    if (f.diasAntes !== null && f.diasAntes !== undefined && !enRango(f.diasAntes, 0, 90)) {
      throw new BadRequestException(`${quien}: los días de aviso van de 0 a 90`);
    }
    for (const d of f.avisarA ?? []) {
      if (!(DESTINOS_CRONOGRAMA as readonly string[]).includes(d)) {
        throw new BadRequestException(`${quien}: «${d}» no es un destinatario que se pueda elegir`);
      }
    }
    if (f.canal && !(CANALES_CRONOGRAMA as readonly string[]).includes(f.canal)) {
      throw new BadRequestException(`${quien}: elige el canal del aviso: campanita, correo o ambos`);
    }
    for (const c of f.correos ?? []) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim())) {
        throw new BadRequestException(`${quien}: el correo ${c} no es válido`);
      }
    }
    if (!(f.avisarA?.length || f.correos?.length)) {
      throw new BadRequestException(`${quien}: elige a quién se le avisa del vencimiento`);
    }
  }
}

/**
 * La fecha del día `dias` contado desde el día cero.
 *
 * En hábiles, el día cero no cuenta y se salta lo que no es hábil (la misma
 * regla de `sumarDiasHabiles` que usa el resto del módulo): el día 1 es el
 * primer día hábil después del cero. El día 0 es el propio día cero.
 */
export function fechaDelDia(
  diaCero: string,
  dias: number,
  tipo: TipoDeDias,
  festivos: ReadonlySet<string>,
): string {
  if (dias <= 0) return diaCero;
  if (tipo === 'HABILES') return sumarDiasHabiles(diaCero, dias, festivos);
  const fecha = aFecha(diaCero);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return aYMD(fecha);
}

/** Las fechas de cada fila a partir del día cero elegido. */
export function fechasDelPredeterminado<T extends FilaPredeterminada>(
  filas: T[],
  diaCero: string,
  festivos: ReadonlySet<string>,
): (T & { fechaInicio: string | null; fechaFin: string })[] {
  return filas.map((f) => {
    const tipo = (f.tipoDias ?? 'HABILES') as TipoDeDias;
    return {
      ...f,
      fechaInicio:
        f.diaInicio === null || f.diaInicio === undefined ? null : fechaDelDia(diaCero, f.diaInicio, tipo, festivos),
      fechaFin: fechaDelDia(diaCero, f.diaFin, tipo, festivos),
    };
  });
}
