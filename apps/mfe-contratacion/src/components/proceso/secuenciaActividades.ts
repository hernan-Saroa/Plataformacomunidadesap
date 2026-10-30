import { ActividadEtapa } from './ListaActividades';

import { SecuenciaDelPaso } from '../../types';

export type { SecuenciaDelPaso };

/** Lo que la secuencia necesita saber de cada actividad, en orden de flujo. */
export interface PasoDelFlujo {
  numeral: string;
  /** Estado en `proceso_actividades`, o null si nadie la ha empezado. */
  estado: string | null | undefined;
  /** Si la modalidad la adelanta. */
  aplica: boolean;
  /** Si la plataforma tiene panel para trabajarla. */
  construida: boolean;
  /** La de su versión del flujo (125); sin ella, lo predeterminado. */
  secuencia?: SecuenciaDelPaso | null;
}

/**
 * Una actividad está terminada cuando ya no hay nada que hacer en ella.
 *
 * `APROBADO` sirve para las dos formas de cerrar que existen: donde el área
 * configuró aprobación lo pone quien da el visto bueno, y donde no, lo pone el
 * propio registro al cumplirse lo que la actividad exigía. Así la regla es una
 * sola y no hay que preguntarle al servidor, por cada una de las sesenta y
 * tres, si alguien le configuró un aprobador.
 *
 * `NO_APLICA` también la termina: es como queda la 3.7 cuando se deja
 * constancia de que el proceso no pasó por comité, y el servidor la cuenta como
 * cerrada. Sin esto la 4.2 se quedaba esperando a la 3.7 para siempre.
 *
 * Lo demás no termina nada: `BORRADOR` es trabajo empezado, `EN_REVISION` está
 * esperando y `DEVUELTO` pide volver a ella. Dejar que la siguiente arranque
 * sobre cualquiera de los tres sería trabajar sobre algo que puede caerse.
 */
export function estaTerminada(paso: PasoDelFlujo): boolean {
  return paso.estado === 'APROBADO' || paso.estado === 'NO_APLICA';
}

/**
 * Las que atienden una revisión en curso (EFDS-1183).
 *
 * La 3.3 recibe el proceso en la Dirección y la 3.4 lo decide. Las dos existen
 * precisamente porque la 3.1 está esperando, así que exigirles que la 3.1 esté
 * aprobada las deja bloqueadas por lo que ellas mismas tienen que desbloquear:
 * nadie puede aprobar porque nadie ha repartido, y nadie puede repartir porque
 * nadie ha aprobado.
 *
 * El traspaso del área a la Dirección ocurre al **enviar**, no al aprobar. Es
 * lo único que estas dos actividades necesitan de la anterior.
 */
const ATIENDEN_LA_REVISION = new Set(['3.3', '3.4']);

/**
 * Y la que abre ese tramo: el estudio previo.
 *
 * Solo su revisión, no la de cualquier actividad. La 3.3 y la 3.4 atienden lo
 * que el área entregó en la 3.1; que la 3.2 esté esperando decisión no las
 * habilita, y tratarlas igual desbloquearía el tramo por el motivo equivocado.
 */
const ABRE_EL_TRAMO_DE_LA_DIRECCION = '3.1';

/**
 * Lo predeterminado: lo que rige cuando la versión del flujo no dice nada.
 * Desde la 125 se configura en Configuración → Flujo, por modalidad; esto
 * queda para las versiones viejas. Mismo mapa que `DEPENDE_DE_POR_DEFECTO` en
 * `backend/hiring-service/src/flujo/lectura.ts`.
 *
 * Las que no esperan a que termine la actividad que la matriz numera justo
 * antes, porque lo que resuelven no depende de eso (reunión de validación
 * del modelo, 17 sep).
 *
 * La 5.5 (límite a MiPyme) se decide con el valor del proceso y la
 * modalidad, no con la publicación en la web de la ESAP (5.4): nada de lo que
 * la 5.4 produce alimenta esa decisión. La 5.6 (observaciones) entra por lo
 * mismo, y además va después de MiPymes en la matriz sin necesitarla. Las dos
 * cuelgan solo de la publicación en SECOP II (5.3), sea cual sea el orden en
 * que el riel las pinte; ni `mipyme.service.ts` ni `observaciones.service.ts`
 * piden más.
 *
 * Las adendas (5.13) «a partir de la apertura pueden generarse en cualquier
 * momento», dice la matriz: no esperan a la audiencia de riesgos (5.12), que
 * la matriz numera antes. Donde la modalidad no tiene apertura —mínima cuantía
 * y 092— la 5.7 no aplica y basta la publicación, que es lo mismo que exige
 * `adendas.service.ts`.
 *
 * Que se habiliten antes no las exime de bloquear lo que sigue si quedan sin
 * terminar: la apertura (5.7) sigue necesitando la 5.5 y la 5.6 — cada
 * numeral aquí declara de qué depende de verdad, no de qué lo antecede en la
 * matriz.
 *
 * La 9.5 (modificaciones) no es un paso de la línea: una prórroga, una adición
 * o una suspensión caben en cualquier momento de la ejecución, y la ejecución
 * arranca con el acta de inicio (9.1). Es lo mismo que exige el backend
 * —`admiteModificacion` pide el contrato en ejecución o suspendido—, así que
 * esperar a los pagos (9.4) era un candado que el servidor no pone.
 */
const DEPENDE_DE: Readonly<Record<string, readonly string[]>> = {
  '5.5': ['5.3'],
  '5.6': ['5.3'],
  '5.13': ['5.3', '5.7'],
  // Supervisor (8.2), RP, garantías y ARL solo piden el contrato firmado: el
  // backend no exige más (`admiteSupervisor`, `admiteRp`, `admiteLegalizacion`).
  // La 8.6 sí espera a las cuatro, porque comunica que están cumplidas.
  '8.3': ['8.1'],
  '8.4': ['8.1'],
  '8.5': ['8.1'],
  // La publicación corre desde la firma (Decreto 1082): no espera a la
  // legalización ni al acta de inicio, que la matriz numera antes.
  '8.8': ['8.1'],
  '9.5': ['8.7'],
};

/**
 * Las que no cierran nunca mientras dura la ejecución, y por eso no pueden
 * detener nada.
 *
 * La 9.2 es el seguimiento: dura todo el contrato y `seguimiento.service.ts`
 * la deja a propósito en BORRADOR —«el seguimiento dura toda la ejecución:
 * darlo por cumplido con el primer informe haría que el riel dijera que ya no
 * hay nada que hacer»—.
 *
 * La 9.3 es la reasignación de supervisor: la matriz la describe «en
 * cualquier momento durante la ejecución», así que no hay un primer envío que
 * la cierre — es la misma naturaleza de la 9.2, y en ningún módulo del
 * backend hay código que la marque APROBADO.
 *
 * Tratarlas como cualquier actividad a medias encerraba la 9.4 y la 9.5 (pagos
 * y modificaciones) detrás de dos pasos que ninguno iba a terminar nunca: en
 * la base, el cien por ciento de los contratos en ejecución tienen la 9.3 en
 * BORRADOR, así que ningún proceso llegaba a la 9.4 sin una intervención
 * manual en la base de datos.
 *
 * La 9.5 (modificaciones) entra por lo mismo: se cierra con la primera
 * modificación aprobada, pero un contrato puede ejecutarse entero sin
 * modificarse nunca, y exigirla encerraría la etapa 10 detrás de algo que
 * quizá no ocurra.
 *
 * Las adendas (5.13), igual: un proceso puede llegar al cierre de ofertas sin
 * ninguna, y desde la 112 van después de la apertura, así que exigirlas
 * encerraría la recepción de ofertas (6.1) detrás de algo que quizá no ocurra.
 */
export const NUNCA_BLOQUEA = new Set(['5.13', '9.1', '9.2', '9.3', '9.5']);

/** Lo que rige en el paso: lo de su versión del flujo, o lo predeterminado. */
export function secuenciaDe(paso: Pick<PasoDelFlujo, 'numeral' | 'secuencia'>): SecuenciaDelPaso {
  if (paso.secuencia) return paso.secuencia;
  const depende = DEPENDE_DE[paso.numeral];
  return { dependeDe: depende ? [...depende] : null, noBloquea: NUNCA_BLOQUEA.has(paso.numeral) };
}

/** Si quedarse sin terminar no detiene a las siguientes. */
export const noDetiene = (paso: Pick<PasoDelFlujo, 'numeral' | 'secuencia'>) => secuenciaDe(paso).noBloquea;

/**
 * Las que no se trabajan en el proceso —no aplican o no tienen panel— y a
 * cuyo lugar ya llegó la cadena.
 */
function alcanzadasSinTrabajo(flujo: PasoDelFlujo[]): Set<string> {
  const alcanzadas = new Set<string>();
  let alcanzado = true;
  let esperandoDecision = false;
  for (const paso of flujo) {
    if (!paso.aplica || !paso.construida) {
      if (alcanzado && !esperandoDecision) alcanzadas.add(paso.numeral);
      continue;
    }
    if (esperandoDecision) {
      if (ATIENDEN_LA_REVISION.has(paso.numeral) && !estaTerminada(paso)) alcanzado = false;
      continue;
    }
    if (estaTerminada(paso) || noDetiene(paso)) continue;
    if (paso.estado === 'EN_REVISION' && paso.numeral === ABRE_EL_TRAMO_DE_LA_DIRECCION) {
      esperandoDecision = true;
    } else {
      alcanzado = false;
    }
  }
  return alcanzadas;
}

/**
 * Si una dependencia declarada ya no le hace falta a quien la exige.
 *
 * La que no aplica o no tiene panel nunca podrá terminarse: se da por cumplida
 * cuando la cadena llega a su lugar. Antes se daba por cumplida siempre, y la
 * que dependía de ella quedaba abierta desde el primer día (125).
 */
function dependenciaSatisfecha(numeral: string, flujo: PasoDelFlujo[], alcanzadas: Set<string>): boolean {
  const paso = flujo.find((p) => p.numeral === numeral);
  // La que no está en el flujo no puede exigirse: trancaría para siempre.
  if (!paso) return true;
  if (!paso.aplica || !paso.construida) return alcanzadas.has(numeral);
  return estaTerminada(paso);
}

/**
 * Hasta dónde puede llegar el gestor: la secuencia del flujo.
 *
 * Devuelve los numerales que se pueden **trabajar**. La matriz es una secuencia
 * —la 3.2 continúa lo que la 3.1 dejó— y hasta ahora la pantalla las ofrecía
 * todas a la vez, así que se podía diligenciar la 3.2 sin haber hecho la 3.1 y
 * el expediente quedaba contando una historia que no ocurrió en ese orden.
 *
 * Abrirlas se puede siempre (EFDS-1183): lo que esta secuencia decide es dónde
 * se escribe, no dónde se entra. Ver de antemano qué le van a pedir a uno no
 * desordena nada; cargar un documento antes de tiempo, sí.
 *
 * Se salta lo que nunca podrá terminarse:
 *
 * - **Las que la modalidad excluye**, que no van a ocurrir en este proceso.
 * - **Las que aún no tienen panel**, que nadie puede trabajar todavía. Si
 *   bloquearan, un hueco de la matriz trancaría todo lo que viene después y no
 *   habría forma de destrabarlo desde la pantalla. Cuando estén todas
 *   construidas esta excepción sobra: conviene revisarla entonces.
 *
 * Lo que sí bloquea es una actividad aplicable y construida que quedó a medias:
 * ahí es donde el proceso tiene que detenerse.
 */
export function actividadesDisponibles(flujo: PasoDelFlujo[]): Set<string> {
  const disponibles = new Set<string>();
  const alcanzadas = alcanzadasSinTrabajo(flujo);
  let alcanzado = true;
  /**
   * Hay una actividad enviada esperando decisión.
   *
   * A partir de ahí solo se abren las que atienden esa espera; el resto del
   * flujo sigue detenido, que es lo que la secuencia siempre hizo.
   */
  let esperandoDecision = false;

  for (const paso of flujo) {
    // Lo que no aplica o no existe se recorre sin abrir ni cerrar la puerta:
    // ni se puede trabajar ni puede detener a nadie.
    if (!paso.aplica || !paso.construida) continue;

    if (esperandoDecision) {
      // Mientras la decisión no llegue, el resto del flujo está detenido: no
      // se abre, y tampoco cierra nada, porque lo que le falta es justo la
      // decisión que las de abajo tienen que producir.
      if (!ATIENDEN_LA_REVISION.has(paso.numeral)) continue;

      if (alcanzado) disponibles.add(paso.numeral);
      if (!estaTerminada(paso)) alcanzado = false;
      continue;
    }

    // Lo normal es depender de que se llegó hasta aquí en la cadena; las que
    // declaran de qué dependen mandan a buscar lo que de verdad necesitan, en
    // vez de la actividad que la matriz numera justo antes.
    const { dependeDe, noBloquea } = secuenciaDe(paso);
    const disponible = dependeDe?.length
      ? dependeDe.every((dep) => dependenciaSatisfecha(dep, flujo, alcanzadas))
      : alcanzado;

    if (disponible) disponibles.add(paso.numeral);

    if (estaTerminada(paso) || noBloquea) continue;

    // Una actividad enviada y a la espera no cierra el paso: abre el tramo de
    // las que existen para resolver esa espera. Cualquier otra sin terminar sí
    // lo cierra a todas las siguientes; se sigue recorriendo para no marcar
    // disponible nada que venga después. Esto corre para todas, también para
    // las de DEPENDE_DE: que se hayan habilitado antes no las exime de seguir
    // bloqueando lo que viene después si se quedan sin terminar.
    if (paso.estado === 'EN_REVISION' && paso.numeral === ABRE_EL_TRAMO_DE_LA_DIRECCION) {
      esperandoDecision = true;
    } else {
      alcanzado = false;
    }
  }

  return disponibles;
}

/** Por qué una actividad todavía no se puede trabajar, para poder decirlo. */
export function motivoDelBloqueo(
  numeral: string,
  flujo: PasoDelFlujo[],
): string | null {
  const propio = flujo.find((p) => p.numeral === numeral);
  // Con dependencia declarada, el motivo es esa dependencia y no la actividad
  // que la matriz numera justo antes: decir «termina la 5.3» cuando la 5.4 no
  // necesita la 5.3 mandaría a esperar algo que no la destraba.
  const dependencias = secuenciaDe(propio ?? { numeral }).dependeDe;
  if (dependencias?.length) {
    const alcanzadas = alcanzadasSinTrabajo(flujo);
    const faltante = dependencias.find((dep) => !dependenciaSatisfecha(dep, flujo, alcanzadas));
    if (!faltante) return null;
    const suya = flujo.find((p) => p.numeral === faltante);
    // La que espera no se hace aquí: lo que falta es lo que detiene la cadena
    // antes de ella.
    return suya && (!suya.aplica || !suya.construida)
      ? (motivoDelBloqueo(faltante, flujo) ?? `Esperando a que el proceso llegue a la ${faltante}`)
      : `Antes hay que terminar ${faltante}`;
  }

  const indice = flujo.findIndex((p) => p.numeral === numeral);
  if (indice < 0) return null;

  const anterior = flujo
    .slice(0, indice)
    .reverse()
    .find((p) => p.aplica && p.construida && !estaTerminada(p) && !noDetiene(p));

  // Un candado sin explicación se lee como un error del sistema: decir cuál es
  // la actividad que falta convierte el bloqueo en una instrucción.
  return anterior ? `Antes hay que terminar ${anterior.numeral}` : null;
}
