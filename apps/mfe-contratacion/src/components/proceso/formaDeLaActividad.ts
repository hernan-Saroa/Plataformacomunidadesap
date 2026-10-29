/**
 * Cómo se recorre cada actividad: no todas son un paso de una fila.
 *
 * El riel pintaba las sesenta y tres como una línea, una detrás de otra, y eso
 * decía cosas falsas: que la 8.3 esperaba a la 8.2 (las dos solo necesitan el
 * contrato firmado), o que la 9.4 se acababa con la primera cuenta de cobro
 * (dura lo que dure el contrato). Aquí se declara la forma de las que no son un
 * paso; las demás lo son.
 *
 * - **paso**: se hace una vez y, terminada, abre la siguiente.
 * - **en_paralelo**: un grupo que se abre a la vez y se termina en cualquier
 *   orden; lo que viene después espera a que estén todas.
 * - **permanente**: queda abierta todo un tramo y se usa muchas veces (cada
 *   informe, cada cuenta de cobro). No se «termina» con el primer registro.
 * - **eventual**: solo si ocurre algo (una adenda, un cambio de supervisor).
 *   Puede no usarse nunca y no frena el avance.
 *
 * Las dependencias de verdad siguen en `secuenciaActividades.ts`; esto dice
 * cómo se muestran, y las dos cosas tienen que contar la misma historia.
 */
export type FormaActividad =
  | { tipo: 'paso' }
  | { tipo: 'en_paralelo'; grupo: string; cuando: string }
  | { tipo: 'permanente'; mientras: string }
  | { tipo: 'eventual'; cuando: string };

const PASO: FormaActividad = { tipo: 'paso' };

/**
 * Después de publicar en SECOP II (5.3): la web de la ESAP, el límite a
 * MiPymes y las observaciones no dependen entre sí (reunión del 17 sep).
 */
const TRAS_SECOP: FormaActividad = {
  tipo: 'en_paralelo',
  grupo: 'tras-secop',
  cuando: 'Con el proceso publicado en SECOP II',
};

/**
 * Con el contrato firmado (8.1): supervisor, RP, garantías y ARL solo piden
 * el contrato perfeccionado (`admiteSupervisor`, `admiteRp`,
 * `admiteLegalizacion`). La comunicación de inicio (8.6) espera a esas cuatro.
 * La publicación (8.8) también entra: su plazo legal corre desde la firma
 * (`admitePublicacion`), aunque la matriz la numere al final de la etapa.
 */
const CON_CONTRATO_FIRMADO: FormaActividad = {
  tipo: 'en_paralelo',
  grupo: 'contrato-firmado',
  cuando: 'Con el contrato firmado',
};

const FORMAS: Readonly<Record<string, FormaActividad>> = {
  '5.4': TRAS_SECOP,
  '5.5': TRAS_SECOP,
  '5.6': TRAS_SECOP,
  '5.13': {
    tipo: 'eventual',
    cuando: 'Si hay que cambiar el pliego, desde la apertura hasta el cierre de ofertas',
  },
  '8.2': CON_CONTRATO_FIRMADO,
  '8.3': CON_CONTRATO_FIRMADO,
  '8.4': CON_CONTRATO_FIRMADO,
  '8.5': CON_CONTRATO_FIRMADO,
  '8.8': CON_CONTRATO_FIRMADO,
  '9.2': { tipo: 'permanente', mientras: 'Mientras dure la ejecución' },
  '9.3': { tipo: 'eventual', cuando: 'Si cambia quien supervisa' },
  '9.4': { tipo: 'permanente', mientras: 'Una cuenta de cobro por periodo, hasta el último pago' },
  '9.5': {
    tipo: 'eventual',
    cuando: 'Si hay prórroga, adición, suspensión o terminación anticipada',
  },
};

export function formaDe(numeral: string): FormaActividad {
  return FORMAS[numeral] ?? PASO;
}

/**
 * Si la actividad cuenta para decir que una etapa avanzó.
 *
 * Las permanentes y las eventuales no: una etapa 9 al «1 de 3» porque nadie ha
 * cambiado de supervisor diría que falta algo que quizá no deba pasar nunca.
 */
export function cuentaEnElAvance(numeral: string): boolean {
  const { tipo } = formaDe(numeral);
  return tipo === 'paso' || tipo === 'en_paralelo';
}

/** Un tramo del riel: un paso suelto, un grupo en paralelo o las que están abiertas aparte. */
export type Tramo<T> =
  | { tipo: 'paso'; actividad: T }
  | { tipo: 'en_paralelo'; cuando: string; actividades: T[] };

/**
 * Agrupa en orden las actividades de la línea: los pasos sueltos y los grupos
 * en paralelo. Un grupo queda donde aparece su primera actividad y recoge a las
 * demás aunque la matriz las numere más abajo (la 8.8 va con la 8.2 a 8.5).
 * Las permanentes y eventuales se devuelven aparte, porque no ocupan un lugar
 * en la fila.
 */
export function tramosDe<T extends { numeral: string }>(
  actividades: T[],
): { tramos: Tramo<T>[]; permanentes: T[]; eventuales: T[] } {
  const tramos: Tramo<T>[] = [];
  const permanentes: T[] = [];
  const eventuales: T[] = [];
  const grupos = new Map<string, Extract<Tramo<T>, { tipo: 'en_paralelo' }>>();

  for (const actividad of actividades) {
    const forma = formaDe(actividad.numeral);
    if (forma.tipo === 'permanente') {
      permanentes.push(actividad);
    } else if (forma.tipo === 'eventual') {
      eventuales.push(actividad);
    } else if (forma.tipo === 'en_paralelo') {
      const grupo = grupos.get(forma.grupo);
      if (grupo) {
        grupo.actividades.push(actividad);
      } else {
        const nuevo = { tipo: 'en_paralelo' as const, cuando: forma.cuando, actividades: [actividad] };
        grupos.set(forma.grupo, nuevo);
        tramos.push(nuevo);
      }
    } else {
      tramos.push({ tipo: 'paso', actividad });
    }
  }

  // Un grupo que la modalidad dejó en una sola actividad es un paso más.
  return {
    tramos: tramos.map((t) =>
      t.tipo === 'en_paralelo' && t.actividades.length === 1
        ? { tipo: 'paso', actividad: t.actividades[0] }
        : t,
    ),
    permanentes,
    eventuales,
  };
}
