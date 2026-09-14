import { amparosParaCerrar, AmparoParaCierre } from './amparos-de-estabilidad';

describe('amparosParaCerrar (EFDS-1175)', () => {
  const HOY = '2026-08-26';

  const amparo = (parcial: Partial<AmparoParaCierre> = {}): AmparoParaCierre => ({
    tipo: 'ESTABILIDAD_OBRA',
    nombre: 'Estabilidad y calidad de la obra',
    numeroPoliza: 'POL-001',
    vigenciaHasta: '2025-01-31',
    ...parcial,
  });

  it('deja cerrar cuando todos los amparos ya vencieron', () => {
    const estado = amparosParaCerrar([amparo()], HOY);

    expect(estado.puedeCerrar).toBe(true);
    expect(estado.motivo).toBeNull();
    expect(estado.pendientes).toEqual([]);
    expect(estado.ultimoVencimiento).toBe('2025-01-31');
  });

  it('no deja cerrar mientras uno siga amparando, y dice cuál y hasta cuándo', () => {
    const estado = amparosParaCerrar([amparo({ vigenciaHasta: '2028-03-15' })], HOY);

    expect(estado.puedeCerrar).toBe(false);
    expect(estado.motivo).toContain('POL-001');
    expect(estado.motivo).toContain('2028-03-15');
    expect(estado.pendientes).toHaveLength(1);
  });

  /**
   * El caso que gobierna el diseño: casi ningún contrato de la entidad lleva
   * estabilidad de obra, y tratar la ausencia como un pendiente los dejaría
   * abiertos para siempre.
   */
  it('deja cerrar de entrada un contrato sin amparos de estabilidad ni calidad', () => {
    const estado = amparosParaCerrar(
      [amparo({ tipo: 'CUMPLIMIENTO', vigenciaHasta: '2030-01-01' })],
      HOY,
    );

    expect(estado.puedeCerrar).toBe(true);
    expect(estado.sinAmparos).toBe(true);
    expect(estado.verificados).toEqual([]);
    expect(estado.ultimoVencimiento).toBeNull();
  });

  it('mira los tres tipos de estabilidad y calidad, no solo el de obra', () => {
    const estado = amparosParaCerrar(
      [
        amparo({ tipo: 'CALIDAD_SERVICIO', vigenciaHasta: '2025-01-01' }),
        amparo({ tipo: 'CALIDAD_BIENES', vigenciaHasta: '2029-01-01' }),
      ],
      HOY,
    );

    expect(estado.verificados).toHaveLength(2);
    expect(estado.puedeCerrar).toBe(false);
  });

  /** Un amparo que vence hoy todavía ampara hoy. */
  it('no cuenta vencido el amparo que expira justo hoy', () => {
    const estado = amparosParaCerrar([amparo({ vigenciaHasta: HOY })], HOY);

    expect(estado.puedeCerrar).toBe(false);
    expect(estado.verificados[0].vencido).toBe(false);
  });

  it('nombra el último cuando quedan varios vigentes', () => {
    const estado = amparosParaCerrar(
      [
        amparo({ vigenciaHasta: '2027-01-01' }),
        amparo({ tipo: 'CALIDAD_BIENES', vigenciaHasta: '2029-06-30' }),
      ],
      HOY,
    );

    expect(estado.motivo).toContain('2 amparos');
    expect(estado.motivo).toContain('2029-06-30');
  });

  it('ordena los verificados por vencimiento, para leerlos como una espera', () => {
    const estado = amparosParaCerrar(
      [
        amparo({ vigenciaHasta: '2029-01-01' }),
        amparo({ tipo: 'CALIDAD_BIENES', vigenciaHasta: '2024-01-01' }),
      ],
      HOY,
    );

    expect(estado.verificados.map((a) => a.vigenciaHasta)).toEqual(['2024-01-01', '2029-01-01']);
    expect(estado.ultimoVencimiento).toBe('2029-01-01');
  });
});
