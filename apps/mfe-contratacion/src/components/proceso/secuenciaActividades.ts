import { ActividadEtapa } from './ListaActividades';

/** Lo que la secuencia necesita saber de cada actividad, en orden de flujo. */
export interface PasoDelFlujo {
  numeral: string;
  /** Estado en `proceso_actividades`, o null si nadie la ha empezado. */
  estado: string | null | undefined;
  /** Si la modalidad la adelanta. */
  aplica: boolean;
  /** Si la plataforma tiene panel para trabajarla. */
  construida: boolean;
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
 * Lo demás no termina nada: `BORRADOR` es trabajo empezado, `EN_REVISION` está
 * esperando y `DEVUELTO` pide volver a ella. Dejar que la siguiente arranque
 * sobre cualquiera de los tres sería trabajar sobre algo que puede caerse.
 */
export function estaTerminada(paso: PasoDelFlujo): boolean {
  return paso.estado === 'APROBADO';
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
 * Las que no esperan a que termine la actividad que la matriz numera justo
 * antes, porque lo que resuelven no depende de eso (reunión de validación
 * del modelo, 17 sep).
 *
 * La 5.4 (límite a MiPyme) se decide con el valor del proceso y la
 * modalidad, no con lo que traigan las observaciones al proyecto de pliego
 * (5.3): nada de lo que la 5.3 produce alimenta esa decisión. La 5.5
 * (audiencia de riesgos) discute el proyecto de pliego (5.2) y tampoco
 * necesita que el plazo de observaciones haya corrido. El propio backend ya
 * las trata así: ni `mipyme.service.ts` ni `riesgos.service.ts` exigen la
 * 5.3 aprobada para escribir.
 *
 * Que se habiliten antes no las exime de bloquear lo que sigue si quedan sin
 * terminar: la 5.6 y la 5.7 las siguen necesitando, igual que necesitan la
 * 5.3 — cada numeral aquí declara de qué depende de verdad, no de qué lo
 * antecede en la matriz.
 */
const DEPENDE_DE: Readonly<Record<string, readonly string[]>> = {
  '5.4': ['5.2'],
  '5.5': ['5.2'],
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
 */
export const NUNCA_BLOQUEA = new Set(['9.2', '9.3']);

/** Si una dependencia declarada ya no le hace falta a quien la exige. */
function dependenciaSatisfecha(numeral: string, flujo: PasoDelFlujo[]): boolean {
  const paso = flujo.find((p) => p.numeral === numeral);
  // La que no está en el flujo, no aplica o no tiene panel nunca podrá
  // terminarse: exigirla trancaría para siempre a quien depende de ella,
  // igual que ya pasa con la cadena por defecto.
  if (!paso || !paso.aplica || !paso.construida) return true;
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

    // Lo normal es depender de que se llegó hasta aquí en la cadena; las
    // declaradas en DEPENDE_DE mandan a buscar lo que de verdad necesitan, en
    // vez de la actividad que la matriz numera justo antes.
    const dependencias = DEPENDE_DE[paso.numeral];
    const disponible = dependencias
      ? dependencias.every((dep) => dependenciaSatisfecha(dep, flujo))
      : alcanzado;

    if (disponible) disponibles.add(paso.numeral);

    if (estaTerminada(paso) || NUNCA_BLOQUEA.has(paso.numeral)) continue;

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
  // Con dependencia declarada, el motivo es esa dependencia y no la actividad
  // que la matriz numera justo antes: decir «termina la 5.3» cuando la 5.4 no
  // necesita la 5.3 mandaría a esperar algo que no la destraba.
  const dependencias = DEPENDE_DE[numeral];
  if (dependencias) {
    const faltante = dependencias.find((dep) => !dependenciaSatisfecha(dep, flujo));
    return faltante ? `Antes hay que terminar ${faltante}` : null;
  }

  const indice = flujo.findIndex((p) => p.numeral === numeral);
  if (indice < 0) return null;

  const anterior = flujo
    .slice(0, indice)
    .reverse()
    .find((p) => p.aplica && p.construida && !estaTerminada(p) && !NUNCA_BLOQUEA.has(p.numeral));

  // Un candado sin explicación se lee como un error del sistema: decir cuál es
  // la actividad que falta convierte el bloqueo en una instrucción.
  return anterior ? `Antes hay que terminar ${anterior.numeral}` : null;
}
