import type { EstadoActividad, ProcesoResumen } from '../../types';

/**
 * Estados que no dicen que la etapa arrancó: la actividad sigue como nació o
 * la modalidad la excluye. Cualquier otro —enviada, aprobada, devuelta o
 * negada— es trabajo hecho en esa etapa.
 */
const SIN_TRABAJO: EstadoActividad[] = ['BORRADOR', 'NO_APLICA'];

/**
 * En qué etapa va el proceso, para los listados.
 *
 * `proceso.etapa` no alcanza: en el backend solo la mueven el CDP (a la 4) y la
 * apertura (a la 5), y la 5 se usa además como marca de «ya se abrió», así que
 * de ahí no pasa aunque el proceso vaya en la ejecución o en la liquidación. Lo
 * que sí avanza son las actividades, y el listado ya las trae: la etapa en
 * curso es la más alta en la que hay trabajo, sin bajar nunca de la registrada.
 */
export function etapaEnCurso(proceso: Pick<ProcesoResumen, 'etapa' | 'actividades'>): number {
  let etapa = proceso.etapa;
  for (const actividad of proceso.actividades ?? []) {
    if (SIN_TRABAJO.includes(actividad.estado)) continue;
    const numero = Number.parseInt(actividad.numeral, 10);
    if (Number.isFinite(numero) && numero > etapa) etapa = numero;
  }
  return etapa;
}
