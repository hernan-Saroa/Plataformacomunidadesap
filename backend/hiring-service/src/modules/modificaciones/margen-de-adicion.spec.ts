import { margenDeAdicion } from './margen-de-adicion';

describe('margenDeAdicion (EFDS-1176)', () => {
  const INICIAL = 100_000_000;
  const TOPE = 50;

  it('deja adicionar hasta la mitad del valor inicial', () => {
    const margen = margenDeAdicion(INICIAL, 0, 50_000_000, TOPE);

    expect(margen.cabe).toBe(true);
    expect(margen.topeValor).toBe(50_000_000);
    expect(margen.margenDisponible).toBe(50_000_000);
    expect(margen.motivo).toBeNull();
  });

  it('rechaza un peso por encima del tope', () => {
    const margen = margenDeAdicion(INICIAL, 0, 50_000_001, TOPE);

    expect(margen.cabe).toBe(false);
    expect(margen.motivo).toContain('50%');
  });

  /**
   * El error corriente al implementar esta regla: juzgar cada adición contra el
   * valor vigente —que ya incluye la anterior— deja pasar dos del 40% que
   * juntas superan el límite.
   */
  it('cuenta las adiciones de forma acumulada, no una por una', () => {
    const primera = margenDeAdicion(INICIAL, 0, 40_000_000, TOPE);
    expect(primera.cabe).toBe(true);

    // La segunda cabría por sí sola —40 millones es menos del 50%—, pero
    // acumulada se pasa.
    const segunda = margenDeAdicion(INICIAL, 40_000_000, 40_000_000, TOPE);

    expect(segunda.cabe).toBe(false);
    expect(segunda.margenDisponible).toBe(10_000_000);
    expect(segunda.motivo).toContain('ya tenía');
  });

  it('deja pasar la segunda adición si cabe en lo que queda', () => {
    const margen = margenDeAdicion(INICIAL, 40_000_000, 10_000_000, TOPE);

    expect(margen.cabe).toBe(true);
    expect(margen.margenDisponible).toBe(10_000_000);
  });

  it('el margen nunca es negativo, aunque lo adicionado ya supere el tope', () => {
    const margen = margenDeAdicion(INICIAL, 60_000_000, 1, TOPE);

    expect(margen.margenDisponible).toBe(0);
    expect(margen.cabe).toBe(false);
  });

  /** Es lo que la pantalla pide para decir cuánto cabe antes de escribir nada. */
  it('con solicitado en cero devuelve el margen sin juzgar', () => {
    const margen = margenDeAdicion(INICIAL, 20_000_000, 0, TOPE);

    expect(margen.margenDisponible).toBe(30_000_000);
    expect(margen.cabe).toBe(false);
    expect(margen.motivo).toContain('mayor que cero');
  });

  it('respeta un tope distinto del legal, porque es parametrizable', () => {
    const margen = margenDeAdicion(INICIAL, 0, 30_000_000, 25);

    expect(margen.topeValor).toBe(25_000_000);
    expect(margen.cabe).toBe(false);
    expect(margen.motivo).toContain('25%');
  });
});
