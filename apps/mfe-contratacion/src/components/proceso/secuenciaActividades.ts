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
 * Hasta dónde puede llegar el gestor: la secuencia del flujo.
 *
 * Devuelve los numerales que se pueden abrir. La matriz es una secuencia —la
 * 3.2 continúa lo que la 3.1 dejó— y hasta ahora la pantalla las ofrecía todas
 * a la vez, así que se podía diligenciar la 3.2 sin haber hecho la 3.1 y el
 * expediente quedaba contando una historia que no ocurrió en ese orden.
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

  for (const paso of flujo) {
    // Lo que no aplica o no existe se recorre sin abrir ni cerrar la puerta:
    // ni se puede trabajar ni puede detener a nadie.
    if (!paso.aplica || !paso.construida) continue;

    if (alcanzado) disponibles.add(paso.numeral);

    // La primera sin terminar cierra el paso a todas las siguientes; se sigue
    // recorriendo para no marcar disponible nada que venga después.
    if (!estaTerminada(paso)) alcanzado = false;
  }

  return disponibles;
}

/** Por qué una actividad todavía no se puede abrir, para poder decirlo. */
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
