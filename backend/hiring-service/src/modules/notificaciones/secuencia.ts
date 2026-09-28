/**
 * Qué actividades de un proceso se pueden trabajar (EFDS-1183).
 *
 * Es la regla del riel —`apps/mfe-contratacion/src/components/proceso/
 * secuenciaActividades.ts`— traída al servidor para poder avisar «te toca»
 * cuando una actividad se habilita. **Si cambia una, tiene que cambiar la
 * otra**: si no, el aviso diría «ya puedes trabajarla» sobre algo que la
 * pantalla sigue mostrando con candado, o callaría cuando ya se abrió.
 */

/** Lo que la secuencia necesita saber de cada actividad, en orden de flujo. */
export interface PasoDelFlujo {
  numeral: string;
  /** Estado en `proceso_actividades`, o null si nadie la ha empezado. */
  estado: string | null;
  /** Si la modalidad del proceso la adelanta. */
  aplica: boolean;
  /** Si la plataforma tiene pantalla para trabajarla. */
  construida: boolean;
}

/**
 * Las actividades que aún no tienen pantalla.
 *
 * La lista inversa de `TIENEN_PANEL` en `DetalleProceso.tsx`: las etapas 1 y 2
 * ocurren antes de que exista el proceso, la 3.4 se resuelve dentro de la 3.3,
 * y la 5.8, la 5.12 y la 5.13 están por construir. Cuando alguna tenga
 * pantalla hay que sacarla de aquí, igual que se agrega allá.
 */
export const SIN_PANEL = new Set([
  '1.1', '1.2', '1.3', '1.4',
  '2.1', '2.2', '2.3', '2.4',
  '3.4',
  '5.8', '5.12', '5.13',
]);

/** Terminada es aprobada: lo demás está empezado, esperando o devuelto. */
const estaTerminada = (paso: PasoDelFlujo) => paso.estado === 'APROBADO';

/** La 3.3 recibe y la 3.4 decide lo que la 3.1 envió: se abren al enviarla. */
const ATIENDEN_LA_REVISION = new Set(['3.3', '3.4']);
const ABRE_EL_TRAMO_DE_LA_DIRECCION = '3.1';

/** Los numerales que se pueden trabajar, con la misma regla que el riel. */
export function actividadesDisponibles(flujo: PasoDelFlujo[]): Set<string> {
  const disponibles = new Set<string>();
  let alcanzado = true;
  let esperandoDecision = false;

  for (const paso of flujo) {
    if (!paso.aplica || !paso.construida) continue;

    if (esperandoDecision) {
      if (!ATIENDEN_LA_REVISION.has(paso.numeral)) continue;
      if (alcanzado) disponibles.add(paso.numeral);
      if (!estaTerminada(paso)) alcanzado = false;
      continue;
    }

    if (alcanzado) disponibles.add(paso.numeral);
    if (estaTerminada(paso)) continue;

    if (paso.estado === 'EN_REVISION' && paso.numeral === ABRE_EL_TRAMO_DE_LA_DIRECCION) {
      esperandoDecision = true;
    } else {
      alcanzado = false;
    }
  }

  return disponibles;
}

/**
 * Las actividades sin pantalla a las que ya llegó el proceso.
 *
 * El riel las salta porque nadie puede cerrarlas en la plataforma, y si
 * bloquearan detendrían todo lo que sigue. Pero sí ocurren —fuera de la
 * plataforma—, y a quien las hace le sirve saber que ya es su turno. Se
 * recorre el flujo con la misma regla y se anotan las que se alcanzan, sin que
 * detengan a las siguientes.
 */
function sinPantallaAlcanzadas(flujo: PasoDelFlujo[]): Set<string> {
  const alcanzadas = new Set<string>();
  let alcanzado = true;
  let esperandoDecision = false;

  for (const paso of flujo) {
    if (!paso.aplica) continue;

    if (!paso.construida) {
      if (alcanzado && !esperandoDecision) alcanzadas.add(paso.numeral);
      continue;
    }

    if (esperandoDecision) {
      if (ATIENDEN_LA_REVISION.has(paso.numeral) && !estaTerminada(paso)) alcanzado = false;
      continue;
    }

    if (estaTerminada(paso)) continue;

    if (paso.estado === 'EN_REVISION' && paso.numeral === ABRE_EL_TRAMO_DE_LA_DIRECCION) {
      esperandoDecision = true;
    } else {
      alcanzado = false;
    }
  }

  return alcanzadas;
}

/**
 * La 3.4 no se habilita por la secuencia: le toca al abogado cuando se lo
 * asignan en la 3.3, y ese «le toca» sale de la designación. Contarla aquí
 * avisaría antes de que hubiera abogado a quien avisar.
 */
export const SE_HABILITA_AL_ASIGNAR_ABOGADO = '3.4';

/**
 * Las que están esperando a que alguien las empiece.
 *
 * De lo disponible solo interesa lo que nadie ha tocado o quedó en borrador:
 * lo aprobado ya pasó, lo que espera revisión ya tiene su aviso, y lo devuelto
 * tiene el de «se devuelve». Avisar «te toca» sobre cualquiera de esos sería
 * decirle a alguien que empiece algo que ya está hecho o que ya le avisaron.
 *
 * Incluye las que no tienen pantalla y a las que el proceso ya llegó.
 */
export function porEmpezar(flujo: PasoDelFlujo[]): string[] {
  const disponibles = actividadesDisponibles(flujo);
  const sinPantalla = sinPantallaAlcanzadas(flujo);
  return flujo
    .filter((p) => disponibles.has(p.numeral) || sinPantalla.has(p.numeral))
    .filter((p) => p.numeral !== SE_HABILITA_AL_ASIGNAR_ABOGADO)
    .filter((p) => p.estado === null || p.estado === 'BORRADOR')
    .map((p) => p.numeral);
}
