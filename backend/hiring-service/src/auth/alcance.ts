/**
 * Permisos por etapa, punto y acción (migración 083).
 *
 * La autorización del módulo tiene dos capas:
 *
 *   QUÉ   · el permiso de acción en `auth.permission` —`contratacion.ver`,
 *           `.editar`, `.aprobar`, `.decidir`—, que el backoffice asigna a los
 *           roles como cualquier otro.
 *   DÓNDE · `hiring.alcances_permiso`, que dice en qué etapas, puntos o
 *           trámites aplica cada acción de cada rol.
 *
 * Un alcance solo cuenta si el rol tiene además el permiso de esa acción: lo
 * resuelve la consulta de `AlcanceService`, así que lo que llega aquí ya viene
 * filtrado y este archivo solo decide si un alcance cubre un destino.
 *
 * Todo lo de aquí es puro a propósito: es el centro de la autorización y se
 * prueba sin base ni Nest.
 */

// ------------------------------------------------------------ acciones --

export type Accion = 'ver' | 'editar' | 'aprobar' | 'decidir';

export const ACCIONES: readonly Accion[] = ['ver', 'editar', 'aprobar', 'decidir'];

/** El permiso de `auth.permission` que habilita cada acción. */
export const PERMISO_DE_ACCION: Record<Accion, string> = {
  ver: 'contratacion.ver',
  editar: 'contratacion.editar',
  aprobar: 'contratacion.aprobar',
  decidir: 'contratacion.decidir',
};

/**
 * Qué acciones satisfacen a cada una.
 *
 * Editar, aprobar o decidir en un punto implican verlo: no se puede diligenciar
 * lo que no se ve, y sembrar una fila de «ver» junto a cada una duplicaría la
 * matriz. Entre las otras tres no hay jerarquía —quien decide no aprueba por
 * eso—, que es justo la separación que el catálogo tiene que conservar.
 */
const LA_SATISFACEN: Record<Accion, readonly Accion[]> = {
  ver: ['ver', 'editar', 'aprobar', 'decidir'],
  editar: ['editar'],
  aprobar: ['aprobar'],
  decidir: ['decidir'],
};

// ------------------------------------------------------------- lugares --

/** Los trámites que no tienen numeral en la matriz. */
export const TRAMITES = ['INC.1', 'INC.2'] as const;
export type Tramite = (typeof TRAMITES)[number];

/**
 * Una fila de alcance, ya leída y filtrada por permiso.
 *
 * A lo sumo uno de los tres lugares viene lleno; los tres vacíos es todo el
 * módulo. Es el mismo CHECK de la tabla.
 */
export interface Alcance {
  accion: Accion;
  etapa: number | null;
  numeral: string | null;
  tramite: string | null;
}

/**
 * Dónde se quiere actuar, tal como lo declara un endpoint:
 *
 *   '4.2'     un punto de la matriz
 *   'E10'     una etapa entera, para lo que no cuelga de un numeral (el cierre
 *             definitivo)
 *   'INC.1'   un trámite sin numeral
 *   'TODO'    todo el módulo (la consulta de auditoría)
 *
 * Y sin destino, «en alguna parte»: para lo que no es de ningún proceso —el
 * catálogo de actividades, los umbrales— basta con tener la acción en algún
 * sitio.
 */
export type Destino = string;

const PATRON_NUMERAL = /^(\d{1,2})\.(\d{1,2})$/;
const PATRON_ETAPA = /^E(\d{1,2})$/;

/** La etapa de un numeral: la 7 para '7.2'. Nulo si no es un numeral. */
export function etapaDe(numeral: string): number | null {
  const m = PATRON_NUMERAL.exec(numeral);
  return m ? Number(m[1]) : null;
}

/** Si un alcance cubre un destino, sin mirar la acción. */
export function cubre(alcance: Alcance, destino: Destino): boolean {
  const todoElModulo =
    alcance.etapa === null && alcance.numeral === null && alcance.tramite === null;
  if (todoElModulo) return true;

  if (destino === 'TODO') return false;

  // Los trámites del incumplimiento solo los cubre su propia fila o todo el
  // módulo. Con la etapa 9 no basta: el supervisor que reporta el hecho
  // podría también instruir el trámite que lo juzga.
  if ((TRAMITES as readonly string[]).includes(destino)) {
    return alcance.tramite === destino;
  }

  const etapa = PATRON_ETAPA.exec(destino);
  if (etapa) {
    // Una etapa entera solo la cubre una fila de etapa, no la suma de sus
    // puntos: tener la 10.2 no alcanza para el cierre definitivo.
    return alcance.etapa === Number(etapa[1]);
  }

  const etapaDelPunto = etapaDe(destino);
  if (etapaDelPunto !== null) {
    return alcance.numeral === destino || alcance.etapa === etapaDelPunto;
  }

  // Un destino que no se entiende no lo cubre nada salvo todo el módulo: más
  // vale un 403 que abrir algo por un numeral mal escrito.
  return false;
}

/**
 * Si con esos alcances se puede hacer la acción en el destino.
 *
 * Sin destino basta con tener la acción en alguna parte.
 */
export function puede(alcances: Alcance[], accion: Accion, destino?: Destino): boolean {
  const validas = LA_SATISFACEN[accion];
  return alcances.some(
    (a) => validas.includes(a.accion) && (destino === undefined || cubre(a, destino)),
  );
}

/** Si el texto es un destino que `cubre` sabe interpretar. */
export function esDestinoValido(destino: string): boolean {
  return (
    destino === 'TODO' ||
    (TRAMITES as readonly string[]).includes(destino) ||
    PATRON_ETAPA.test(destino) ||
    PATRON_NUMERAL.test(destino)
  );
}

// ---------------------------------------------------- lugar como texto --

/**
 * El lugar de un alcance como texto: 'TODO', 'E3', '7.2' o 'INC.1'.
 *
 * Es la forma en que lo escriben la siembra de la 083, la API de la matriz y
 * la pantalla: una sola cadena en vez de tres columnas de las que a lo sumo
 * una viene llena.
 */
export function lugarDe(alcance: Pick<Alcance, 'etapa' | 'numeral' | 'tramite'>): string {
  if (alcance.numeral) return alcance.numeral;
  if (alcance.tramite) return alcance.tramite;
  if (alcance.etapa !== null && alcance.etapa !== undefined) return `E${alcance.etapa}`;
  return 'TODO';
}

/** La fila de alcance que corresponde a un lugar escrito como texto. */
export function alcanceDeLugar(accion: Accion, lugar: string): Alcance {
  if (!esDestinoValido(lugar)) {
    throw new Error(`«${lugar}» no es un lugar: se espera TODO, E3, 7.2 o INC.1`);
  }
  const etapa = PATRON_ETAPA.exec(lugar);
  return {
    accion,
    etapa: etapa ? Number(etapa[1]) : null,
    numeral: PATRON_NUMERAL.test(lugar) ? lugar : null,
    tramite: (TRAMITES as readonly string[]).includes(lugar) ? lugar : null,
  };
}
