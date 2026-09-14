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

    if (alcanzado) disponibles.add(paso.numeral);

    if (estaTerminada(paso)) continue;

    // Una actividad enviada y a la espera no cierra el paso: abre el tramo de
    // las que existen para resolver esa espera. Cualquier otra sin terminar sí
    // lo cierra a todas las siguientes; se sigue recorriendo para no marcar
    // disponible nada que venga después.
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
  const indice = flujo.findIndex((p) => p.numeral === numeral);
  if (indice < 0) return null;

  const anterior = flujo
    .slice(0, indice)
    .reverse()
    .find((p) => p.aplica && p.construida && !estaTerminada(p));

  // Un candado sin explicación se lee como un error del sistema: decir cuál es
  // la actividad que falta convierte el bloqueo en una instrucción.
  return anterior ? `Antes hay que terminar ${anterior.numeral}` : null;
}
