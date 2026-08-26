/** El espacio que queda para adicionar, contra el tope legal. */
export interface MargenDeAdicion {
  /** El valor con el que se firmó el contrato, sin adiciones. */
  valorInicial: number;
  /** Lo que suman las adiciones ya aprobadas. */
  yaAdicionado: number;
  topePorcentaje: number;
  /** Cuánto se puede adicionar en total. */
  topeValor: number;
  /** Cuánto cabe todavía. Nunca negativo. */
  margenDisponible: number;
  /** Si la adición solicitada cabe. */
  cabe: boolean;
  motivo: string | null;
}

const pesos = (valor: number) => `$${Math.round(valor).toLocaleString('es-CO')}`;

/**
 * Cuánto se puede adicionar todavía, y si lo solicitado cabe.
 *
 * El tope se cuenta **sobre el valor inicial y de forma acumulada**: la Ley 80
 * limita el total adicionado, no cada adición por separado. Juzgar cada una
 * contra el valor vigente —que ya incluye las anteriores— dejaría pasar dos
 * adiciones del 40% que juntas superan el límite, que es el error corriente al
 * implementar esta regla.
 *
 * `solicitado` en cero devuelve el margen sin juzgar nada: es lo que la
 * pantalla necesita para decir cuánto cabe antes de que alguien escriba una
 * cifra.
 *
 * Función pura para poder probarla sin base de datos.
 */
export function margenDeAdicion(
  valorInicial: number,
  yaAdicionado: number,
  solicitado: number,
  topePorcentaje: number,
): MargenDeAdicion {
  const topeValor = (valorInicial * topePorcentaje) / 100;
  const margenDisponible = Math.max(0, topeValor - yaAdicionado);

  const base = {
    valorInicial,
    yaAdicionado,
    topePorcentaje,
    topeValor,
    margenDisponible,
  };

  if (solicitado <= 0) {
    return { ...base, cabe: false, motivo: 'la adición tiene que ser mayor que cero' };
  }

  if (solicitado <= margenDisponible) {
    return { ...base, cabe: true, motivo: null };
  }

  // El mensaje dice las tres cifras que explican el rechazo: lo pedido, lo que
  // cabía y por qué cabía eso. Sin ellas, quien tramita no sabe si reducir la
  // adición o si el problema son las anteriores.
  const porAnteriores =
    yaAdicionado > 0
      ? ` (el contrato ya tenía ${pesos(yaAdicionado)} en adiciones aprobadas)`
      : '';

  return {
    ...base,
    cabe: false,
    motivo:
      `se solicitan ${pesos(solicitado)} y solo caben ${pesos(margenDisponible)}: ` +
      `el tope es el ${topePorcentaje}% del valor inicial, ${pesos(topeValor)}${porAnteriores}`,
  };
}
