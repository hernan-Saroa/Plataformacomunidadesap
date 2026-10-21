/**
 * Qué actividades de un proceso se pueden trabajar (EFDS-1183).
 *
 * Es la regla del riel —`apps/mfe-contratacion/src/components/proceso/
 * secuenciaActividades.ts`— traída al servidor para poder avisar «te toca»
 * cuando una actividad se habilita. **Si cambia una, tiene que cambiar la
 * otra**: si no, el aviso diría «ya puedes trabajarla» sobre algo que la
 * pantalla sigue mostrando con candado, o callaría cuando ya se abrió.
 */

import {
  DEPENDE_DE_POR_DEFECTO,
  NO_BLOQUEAN_POR_DEFECTO,
  SecuenciaGuardada,
  secuenciaPorDefecto,
} from '../../flujo/lectura';

/** Lo que la secuencia necesita saber de cada actividad, en orden de flujo. */
export interface PasoDelFlujo {
  numeral: string;
  /** Estado en `proceso_actividades`, o null si nadie la ha empezado. */
  estado: string | null;
  /** Si la modalidad del proceso la adelanta. */
  aplica: boolean;
  /** Si la plataforma tiene pantalla para trabajarla. */
  construida: boolean;
  /**
   * De qué depende y si detiene a las siguientes, según la versión del flujo
   * del proceso (125). Sin ella, lo predeterminado.
   */
  secuencia?: SecuenciaGuardada | null;
}

/**
 * Las actividades que aún no tienen pantalla.
 *
 * La lista inversa de `TIENEN_PANEL` en `DetalleProceso.tsx`: las etapas 1 y 2
 * ocurren antes de que exista el proceso, la 3.4 se resuelve dentro de la 3.3,
 * y la 5.8 está apagada (el CDP va en la 3.1 y la 4.2). La 5.12 y la 5.13
 * salieron con la 112: son la audiencia y las adendas, con su pantalla.
 * Cuando alguna tenga pantalla hay que sacarla de aquí, igual que se agrega
 * allá.
 */
export const SIN_PANEL = new Set([
  '1.1', '1.2', '1.3', '1.4',
  '2.1', '2.2', '2.3', '2.4',
  '3.4',
  '5.8',
]);

/** Terminada es aprobada: lo demás está empezado, esperando o devuelto. */
const estaTerminada = (paso: PasoDelFlujo) => paso.estado === 'APROBADO';

/** La 3.3 recibe y la 3.4 decide lo que la 3.1 envió: se abren al enviarla. */
const ATIENDEN_LA_REVISION = new Set(['3.3', '3.4']);
const ABRE_EL_TRAMO_DE_LA_DIRECCION = '3.1';

/**
 * Lo predeterminado, cuando la versión del flujo no dice nada (125). Desde la
 * 125 se configura por versión y modalidad en Configuración → Flujo; el porqué
 * de cada una está en el riel (`secuenciaActividades.ts`).
 */
export const DEPENDE_DE = DEPENDE_DE_POR_DEFECTO;
export const NUNCA_BLOQUEA = NO_BLOQUEAN_POR_DEFECTO;

/** Lo que rige en el paso: lo que trae de su versión, o lo predeterminado. */
export const secuenciaDe = (paso: Pick<PasoDelFlujo, 'numeral' | 'secuencia'>): SecuenciaGuardada =>
  paso.secuencia ?? secuenciaPorDefecto(paso.numeral);

/** Si quedarse sin terminar no detiene a las siguientes. */
export const noDetiene = (paso: Pick<PasoDelFlujo, 'numeral' | 'secuencia'>) => secuenciaDe(paso).noBloquea;

/**
 * Si una dependencia declarada ya no le hace falta a quien la exige.
 *
 * La que no aplica o no tiene pantalla nunca podrá terminarse: se da por
 * cumplida cuando el proceso llega a su lugar, no antes. Dársela por cumplida
 * siempre abría la que depende de ella desde el primer día (125).
 */
function dependenciaSatisfecha(
  numeral: string,
  flujo: PasoDelFlujo[],
  alcanzadas: Set<string>,
): boolean {
  const paso = flujo.find((p) => p.numeral === numeral);
  if (!paso) return true;
  if (!paso.aplica || !paso.construida) return alcanzadas.has(numeral);
  return estaTerminada(paso);
}

/** Los numerales que se pueden trabajar, con la misma regla que el riel. */
export function actividadesDisponibles(flujo: PasoDelFlujo[]): Set<string> {
  const disponibles = new Set<string>();
  /** Las que no se trabajan aquí y a cuyo lugar ya llegó el proceso. */
  const alcanzadas = new Set<string>();
  let alcanzado = true;
  let esperandoDecision = false;

  for (const paso of flujo) {
    if (!paso.aplica || !paso.construida) {
      if (alcanzado && !esperandoDecision) alcanzadas.add(paso.numeral);
      continue;
    }

    if (esperandoDecision) {
      if (!ATIENDEN_LA_REVISION.has(paso.numeral)) continue;
      if (alcanzado) disponibles.add(paso.numeral);
      if (!estaTerminada(paso)) alcanzado = false;
      continue;
    }

    // Habilitarse antes no exime de bloquear: una con dependencias propias sin
    // terminar sigue cerrando el paso a lo que viene después, como cualquier
    // otra, salvo que su versión diga que no detiene el flujo.
    const { dependeDe, noBloquea } = secuenciaDe(paso);
    const disponible = dependeDe?.length
      ? dependeDe.every((dep) => dependenciaSatisfecha(dep, flujo, alcanzadas))
      : alcanzado;

    if (disponible) disponibles.add(paso.numeral);
    if (estaTerminada(paso) || noBloquea) continue;

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
 * La 3.4 no se habilita por la secuencia: es la aprobación de la 3.1, y su
 * «le toca» es el de la ronda (109). Contarla aquí avisaría dos veces.
 */
export const SE_RESUELVE_EN_LA_RONDA = '3.4';

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
    .filter((p) => p.numeral !== SE_RESUELVE_EN_LA_RONDA)
    .filter((p) => p.estado === null || p.estado === 'BORRADOR')
    .map((p) => p.numeral);
}
