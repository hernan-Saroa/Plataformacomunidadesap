import { EntityManager } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';

/**
 * Las reglas del catálogo de documentos requeridos que no necesitan base de
 * datos (EFDS-2066).
 *
 * Aparte del servicio porque son las que deciden si un proceso puede avanzar:
 * qué se le pide y qué le falta. Tienen que poder fijarse en una prueba sin
 * levantar nada.
 */

/** Lo mínimo de un requisito para decidir si le aplica a un proceso. */
export interface AlcanceDeRequisito {
  modalidades: string[];
  tipologias: string[];
}

/**
 * Si el requisito le aplica al proceso.
 *
 * Alcance vacío significa todos, en las dos dimensiones: es la convención del
 * módulo desde la 019 y evita reeditar cada fila cuando entra una modalidad
 * nueva. Si la fila sí declara alcance, el proceso tiene que estar en él; un
 * proceso sin modalidad o sin tipología todavía no cae en ningún alcance
 * declarado, y el requisito aparecerá cuando la elija.
 */
export function aplicaAlProceso(
  requisito: AlcanceDeRequisito,
  modalidad: string | null,
  tipologia: string | null,
): boolean {
  const porModalidad =
    requisito.modalidades.length === 0 || (!!modalidad && requisito.modalidades.includes(modalidad));
  const porTipologia =
    requisito.tipologias.length === 0 || (!!tipologia && requisito.tipologias.includes(tipologia));
  return porModalidad && porTipologia;
}

/** Lo mínimo de un requisito para saber si falta. */
export interface RequisitoExigible {
  codigo: string;
  obligatorio: boolean;
}

/**
 * Los obligatorios que siguen sin entregarse.
 *
 * Lo opcional nunca falta: se ofrece en la lista, con su plantilla y su
 * descripción, pero no traba nada.
 */
export function obligatoriosPendientes<T extends RequisitoExigible>(
  requeridos: T[],
  entregados: string[],
): T[] {
  const hay = new Set(entregados);
  return requeridos.filter((r) => r.obligatorio && !hay.has(r.codigo));
}

/** Estados en que la actividad ya no se mueve: su lista queda como se cerró. */
export const ESTADOS_CERRADOS: readonly string[] = ['APROBADO', 'NEGADO', 'NO_APLICA'];

/**
 * Lo que una actividad cerrada sigue mostrando: lo que alguna vez se entregó.
 *
 * El catálogo cambia —se agrega un documento, se suma una modalidad a uno que
 * ya existía— y la lista viva se lo aplicaría a procesos que pasaron ese punto
 * hace rato, con un obligatorio nuevo que nadie va a poder cargar. Por fecha
 * no alcanza: sumarle una modalidad a un requisito viejo no le cambia la
 * fecha de creación. Lo entregado sí es la huella de lo que se pidió al
 * cerrar; lo que quedó sin cargar ni contaba ni se va a cargar ya.
 */
export function vigentesAlCierre<T extends { codigo: string }>(
  requeridos: T[],
  entregados: string[],
): T[] {
  const hay = new Set(entregados);
  return requeridos.filter((r) => hay.has(r.codigo));
}

/** Lo que se va a hacer con un documento de la lista. */
export type CambioDeDocumento = 'cargar' | 'anular';

/**
 * Las reglas propias de una actividad sobre sus documentos.
 *
 * El catálogo es uno para las sesenta y tres, pero hay actividades cuyo
 * paquete tiene condiciones que solo ellas conocen: la 3.1 lo arma el área
 * que radicó y solo mientras el estudio previo no esté en revisión; la 5.1 no
 * se elabora sin CDP en contratación directa y su estado sale de sus
 * documentos. Esas reglas siguen viviendo en su servicio y se registran aquí,
 * en vez de que el catálogo importe cada módulo —que a su vez lo importan
 * a él— o de que cada actividad vuelva a tener su propia lista.
 */
export interface GuardiaDeDocumentos {
  /** Lanza si el cambio no se permite. Corre dentro de la transacción. */
  antesDeCambiar?(
    em: EntityManager,
    procesoId: string,
    cambio: CambioDeDocumento,
    acceso: HiringAccess,
  ): Promise<void>;
  /** Lo que la actividad recalcula cuando cambian sus documentos. */
  despuesDeCambiar?(em: EntityManager, procesoId: string, acceso?: HiringAccess): Promise<void>;
}
