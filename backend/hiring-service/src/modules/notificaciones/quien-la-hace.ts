import type { PapelAviso } from './eventos';

/**
 * A quién le toca cada actividad mientras nadie diga otra cosa (EFDS-1183).
 *
 * Es lo sugerido del aviso «le toca a alguien hacerla». Se escribe con papeles
 * del proceso siempre que el proceso ya sepa quién es —el abogado, el
 * supervisor, el comité—, porque así llega a la persona de *ese* proceso y
 * sigue siendo cierto cuando la reasignan. Solo donde todavía no hay nadie
 * asignado se avisa por permiso: a quien puede hacerla, que es el mismo permiso
 * que protege su pantalla. Nunca un rol ni una persona con nombre: los roles y
 * sus permisos se configuran, y el aviso dejaría de ser cierto en cuanto
 * cambiaran.
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
}

const papel = (...papeles: PapelAviso[]): Destino => ({ papeles });

/** Las que no siguen la regla de su etapa. */
const POR_ACTIVIDAD: Record<string, Destino> = {
  '3.1': papel('RADICADOR'),
  // Aún no es de nadie: le toca a quien puede tomarlo de la bandeja.
  '3.3': papel('BANDEJA_CONTRATACION'),
  // La 3.4 es la aprobación de la 3.1: le toca a quien la aprueba.
  '3.4': papel('QUIEN_APRUEBA'),

  // Aún no hay comité: le toca a quien puede designarlo.
  '6.2': papel('DESIGNA_COMITE_Y_SUPERVISOR'),
  '6.3': papel('COMITE_EVALUADOR'),
  '6.6': papel('COMITE_EVALUADOR'),
  '6.7': papel('COMITE_EVALUADOR'),
  '6.8': papel('COMITE_EVALUADOR'),
  '7.2': papel('COMITE_EVALUADOR'),

  '8.2': papel('DESIGNA_COMITE_Y_SUPERVISOR'),
  '8.3': papel('EQUIPO_FINANCIERO'),
  '8.7': papel('SUPERVISOR'),

  '9.3': papel('REASIGNA_SUPERVISION'),

  '10.1': papel('SUPERVISOR'),
  '10.3': papel('EQUIPO_FINANCIERO'),
  '10.4': papel('ARCHIVA_EXPEDIENTE'),
};

/** Lo de cada etapa, para las que no tienen excepción. */
const POR_ETAPA: Record<string, Destino> = {
  // A quien hace la actividad: el puesto o las personas que dice su regla, o
  // quien tenga el permiso de editarla (109). Antes era el abogado de todo.
  '3': papel('QUIEN_LA_HACE'),
  '4': papel('EQUIPO_FINANCIERO'),
  '5': papel('QUIEN_LA_HACE'),
  '6': papel('QUIEN_LA_HACE'),
  '7': papel('QUIEN_LA_HACE'),
  '8': papel('QUIEN_LA_HACE'),
  '9': papel('SUPERVISOR'),
  '10': papel('QUIEN_LA_HACE'),
};

/** Quién hace la actividad, o `null` si no hay a quién sugerir (etapas 1 y 2). */
export function quienLaHace(numeral: string): Destino | null {
  return POR_ACTIVIDAD[numeral] ?? POR_ETAPA[numeral.split('.')[0]] ?? null;
}
