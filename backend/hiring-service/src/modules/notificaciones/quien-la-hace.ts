import type { PapelAviso } from './eventos';

/**
 * A quién le toca cada actividad mientras nadie diga otra cosa (EFDS-1183).
 *
 * Es lo sugerido del aviso «le toca a alguien hacerla». Se escribe con papeles
 * del proceso siempre que el proceso ya sepa quién es —el abogado, el
 * supervisor, el comité—, porque así llega a la persona de *ese* proceso y
 * sigue siendo cierto cuando la reasignan. Solo donde todavía no hay nadie
 * asignado se usa un rol o un permiso, que es a quien le corresponde tomarla.
 * Nunca una persona con nombre: dejaría de ser cierto en cuanto cambiara de
 * cargo.
 *
 * Sale de la Hoja 2 del formato de roles de Contratación (junio de 2026):
 *
 * - El **área que radica** estructura el estudio previo y el análisis del sector.
 * - La **Dirección** recibe el proceso de la bandeja y lo reparte.
 * - Los **abogados** «adelantan los procesos»: pliegos, publicaciones, actos,
 *   minutas, liquidación.
 * - La **Dirección Financiera** expide el CDP y el RP, y cierra financieramente.
 * - El **ordenador del gasto** designa el comité evaluador y el supervisor, y
 *   reasigna la supervisión.
 * - El **comité evaluador** evalúa las ofertas y responde lo que se observe de
 *   su evaluación.
 * - Los **supervisores** firman el inicio, vigilan la ejecución, tramitan pagos
 *   y piden las modificaciones.
 * - El **archivo de gestión** custodia el expediente.
 *
 * Todo esto es un punto de partida: la Dirección lo cambia en la ficha de cada
 * actividad.
 */
export interface Destino {
  papeles: PapelAviso[];
  roles: string[];
}

const papel = (...papeles: PapelAviso[]): Destino => ({ papeles, roles: [] });
const rol = (...roles: string[]): Destino => ({ papeles: [], roles });

/** Las que no siguen la regla de su etapa. */
const POR_ACTIVIDAD: Record<string, Destino> = {
  '3.1': papel('RADICADOR'),
  '3.2': papel('RADICADOR'),
  // Aún no es de nadie: le toca a quien puede tomarlo de la bandeja.
  '3.3': papel('BANDEJA_CONTRATACION'),
  // Le toca al abogado que le asignan en la 3.3.
  '3.4': papel('ABOGADO'),

  '6.2': rol('ORDENADOR_GASTO'),
  '6.3': papel('COMITE_EVALUADOR'),
  '6.6': papel('COMITE_EVALUADOR'),
  '6.7': papel('COMITE_EVALUADOR'),
  '6.8': papel('COMITE_EVALUADOR'),
  '7.3': papel('COMITE_EVALUADOR'),

  '8.2': rol('ORDENADOR_GASTO'),
  '8.3': papel('EQUIPO_FINANCIERO'),
  '8.7': papel('SUPERVISOR'),

  '9.3': rol('ORDENADOR_GASTO'),

  '10.1': papel('SUPERVISOR'),
  '10.3': papel('EQUIPO_FINANCIERO'),
  '10.4': rol('ARCHIVO_GESTION_DC'),
};

/** Lo de cada etapa, para las que no tienen excepción. */
const POR_ETAPA: Record<string, Destino> = {
  '3': papel('ABOGADO'),
  '4': papel('EQUIPO_FINANCIERO'),
  '5': papel('ABOGADO'),
  '6': papel('ABOGADO'),
  '7': papel('ABOGADO'),
  '8': papel('ABOGADO'),
  '9': papel('SUPERVISOR'),
  '10': papel('ABOGADO'),
};

/** Quién hace la actividad, o `null` si no hay a quién sugerir (etapas 1 y 2). */
export function quienLaHace(numeral: string): Destino | null {
  return POR_ACTIVIDAD[numeral] ?? POR_ETAPA[numeral.split('.')[0]] ?? null;
}
