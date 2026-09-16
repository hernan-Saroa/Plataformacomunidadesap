import { saldoNoComprometido } from './cierre-financiero.service';

/**
 * El saldo que vuelve al presupuesto (EFDS-1173, RF-LIQ-03).
 *
 * Sin base de datos porque es la cifra que no se puede equivocar: de menos deja
 * plata amarrada a un contrato que ya terminó, y de más libera algo que todavía
 * se debía.
 */
describe('saldoNoComprometido · lo que vuelve al presupuesto', () => {
  it('libera la diferencia entre el RP y lo pagado', () => {
    expect(saldoNoComprometido(80_000_000, 52_000_000)).toEqual({
      valorRp: 80_000_000,
      valorPagado: 52_000_000,
      valorLiberado: 28_000_000,
      sobrepago: 0,
      advertencia: null,
    });
  });

  it('no libera nada cuando el contrato se ejecutó completo', () => {
    const cuadre = saldoNoComprometido(80_000_000, 80_000_000);

    expect(cuadre.valorLiberado).toBe(0);
    // Ejecutar todo el RP es lo normal, no un problema: no se avisa.
    expect(cuadre.advertencia).toBeNull();
  });

  it('libera el RP entero cuando no se pagó nada', () => {
    // Un contrato liquidado sin pagos: raro, pero el saldo vuelve completo.
    expect(saldoNoComprometido(80_000_000, 0).valorLiberado).toBe(80_000_000);
  });

  it('avisa del sobrepago y no libera nada', () => {
    const cuadre = saldoNoComprometido(80_000_000, 85_000_000);

    // Nunca negativo: liberar «menos cinco millones» no significa nada, y la
    // base lo rechazaría.
    expect(cuadre.valorLiberado).toBe(0);
    expect(cuadre.sobrepago).toBe(5_000_000);
    expect(cuadre.advertencia).toContain('5.000.000');
  });

  it('el aviso dice que hubo pagos sin respaldo, no solo que la cifra no cuadra', () => {
    // Es más duro que el aviso del CDP a propósito: allá era un error de
    // digitación sobre un estimado, aquí es un hallazgo.
    const cuadre = saldoNoComprometido(50_000_000, 60_000_000);

    expect(cuadre.advertencia).toMatch(/sin respaldo/i);
    expect(cuadre.advertencia).toMatch(/registro presupuestal/i);
  });
});
