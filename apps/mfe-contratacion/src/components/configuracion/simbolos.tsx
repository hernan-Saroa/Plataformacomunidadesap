import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

import { EstadoMatriz } from '../../types';

/**
 * Los símbolos de la matriz.
 *
 * Uno por estado y cada uno con su forma propia, no solo su color: la rejilla
 * tiene 693 celdas y distinguirlas por tono la deja ilegible para quien no
 * percibe el rojo o el verde. El color acompaña, la forma decide.
 *
 * Viven aquí y no en `estados.tsx` porque son de la matriz, que habla de
 * celdas —qué dice el Excel de esta actividad en esta modalidad— mientras que
 * los otros hablan de una actividad ya elegida.
 */

/**
 * Los estados se dicen en términos de lo único que decide esta pantalla: si la
 * modalidad recorre la actividad. Antes distinguían además si había formulario
 * o reglas configuradas, y eso mandaba a buscar un configurador de reglas que
 * ya no existe: lo que valida cada actividad se escribe en el código de su
 * etapa.
 */
export const NOMBRE_MATRIZ: Record<EstadoMatriz, string> = {
  APLICA: 'Se exige',
  CON_EXCEPCION: 'Se exige',
  CON_SALVEDAD: 'Se exige, con salvedad',
  SIN_REGLAS: 'Se exige',
  SIN_FORMULARIO: 'Se exige',
  NO_APLICA: 'No se exige',
};

export const AYUDA_MATRIZ: Record<EstadoMatriz, string> = {
  APLICA: 'La modalidad recorre esta actividad.',
  CON_EXCEPCION: 'La modalidad recorre esta actividad.',
  CON_SALVEDAD:
    'La matriz original marcó esta celda con una condición o con un texto propio de la modalidad, y está sin aclarar.',
  SIN_REGLAS: 'La modalidad recorre esta actividad.',
  SIN_FORMULARIO: 'La modalidad recorre esta actividad.',
  NO_APLICA: 'La modalidad se salta esta actividad.',
};

/**
 * Tres marcas y no seis: se exige, se exige con salvedad, y no se exige.
 *
 * Los estados que distinguían si había formulario o reglas configuradas se
 * pintan como `APLICA`, porque eso ya no se decide en esta pantalla.
 */
const PINTA: Record<EstadoMatriz, { Icono: typeof Check; clase: string }> = {
  APLICA: { Icono: Check, clase: 'text-emerald-600' },
  CON_EXCEPCION: { Icono: Check, clase: 'text-emerald-600' },
  SIN_REGLAS: { Icono: Check, clase: 'text-emerald-600' },
  SIN_FORMULARIO: { Icono: Check, clase: 'text-emerald-600' },
  CON_SALVEDAD: { Icono: AlertTriangle, clase: 'text-amber-600' },
  // Una X y no un guion: el guion se lee como «aquí todavía no hay nada»,
  // cuando lo que dice la celda es que la modalidad excluye esa actividad a
  // propósito. Es la contraria del visto, y su forma tiene que decirlo.
  NO_APLICA: { Icono: X, clase: 'text-gray-400' },
};

export function SimboloMatriz({
  estado,
  className,
}: {
  estado: EstadoMatriz;
  className?: string;
}) {
  const { Icono, clase } = PINTA[estado];
  return (
    <span className={clase}>
      <Icono className={`${className ?? 'w-4 h-4'} mx-auto`} aria-hidden />
      <span className="sr-only">{NOMBRE_MATRIZ[estado]}</span>
    </span>
  );
}

/**
 * Los tres símbolos que se distinguen, de lo resuelto a lo que falta.
 *
 * Los otros estados del catálogo se dibujan igual que `APLICA`, así que
 * enumerarlos repetiría la misma marca con tres nombres distintos.
 */
const ORDEN: EstadoMatriz[] = ['APLICA', 'CON_SALVEDAD', 'NO_APLICA'];

/** Leyenda en una línea, para el pie de la matriz. */
export function LeyendaMatriz() {
  return (
    <ul className="m-0 p-0 list-none flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {ORDEN.map((estado) => (
        <li key={estado} className="flex items-center gap-1.5" title={AYUDA_MATRIZ[estado]}>
          <SimboloMatriz estado={estado} className="w-3.5 h-3.5" />
          <span className="text-[11px] text-gray-600">{NOMBRE_MATRIZ[estado]}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Abreviatura de tres letras para el encabezado de columna.
 *
 * Con once modalidades el nombre completo no cabe ni girado: "Selección
 * Abreviada por Bolsa Mercantil" son 38 caracteres por columna. La sigla se
 * lee de corrido y el nombre entero queda en el `title`.
 */
export function sigla(codigo: string): string {
  const mapa: Record<string, string> = {
    LICITACION_PUBLICA: 'LP',
    ABREVIADA_MENOR_CUANTIA: 'SMC',
    ABREVIADA_SUBASTA_INVERSA: 'SSI',
    ENAJENACION_SUBASTA: 'ENA',
    ABREVIADA_TVEC: 'TVE',
    ABREVIADA_BOLSA_MERCANTIL: 'BM',
    CONCURSO_MERITOS_ABIERTO: 'CMA',
    CONCURSO_MERITOS_PRECAL: 'CMP',
    MINIMA_CUANTIA: 'MC',
    REGIMEN_ESPECIAL_092: 'RE',
    CONTRATACION_DIRECTA: 'CD',
  };
  return mapa[codigo] ?? codigo.slice(0, 3);
}

/** Los nombres de las diez etapas, como los escribe la matriz. */
export const NOMBRE_ETAPA: Record<number, string> = {
  1: 'Identificación y planeación',
  2: 'Plan Anual de Adquisiciones',
  3: 'Estudios previos',
  4: 'CDP',
  5: 'Elaboración y publicación del proceso',
  6: 'Recepción y evaluación de ofertas',
  7: 'Adjudicación',
  8: 'Perfeccionamiento y legalización',
  9: 'Ejecución y supervisión',
  10: 'Seguimiento, control y liquidación',
};
