import {
  alertaDelPlazo,
  diasRestantes,
  momentoDelPlazo,
  sumarMeses,
  ventanaDeLiquidacion,
} from './plazos-de-liquidacion';

/**
 * Los plazos legales de la liquidación (EFDS-1172, RF-LIQ-02).
 *
 * Sin base de datos porque son la regla que decide qué liquidación es
 * legalmente posible. Equivocarla no falla: deja liquidar unilateralmente antes
 * de que la potestad exista, y eso vicia el acto.
 */
describe('sumarMeses · meses calendario, no bloques de treinta días', () => {
  it('suma cuatro meses conservando el día', () => {
    expect(sumarMeses('2026-01-15', 4)).toBe('2026-05-15');
  });

  it('cruza el año', () => {
    expect(sumarMeses('2026-11-10', 4)).toBe('2027-03-10');
  });

  it('recorta al último día cuando el mes destino es más corto', () => {
    // Cuatro meses desde el 31 de octubre son el 28 de febrero, no el 3 de
    // marzo: correrlo le daría al contrato días que la ley no le dio.
    expect(sumarMeses('2026-10-31', 4)).toBe('2027-02-28');
  });

  it('respeta el año bisiesto al recortar', () => {
    expect(sumarMeses('2027-10-31', 4)).toBe('2028-02-29');
  });

  it('cuatro meses desde el 31 de enero terminan el 31 de mayo', () => {
    // Si se contaran 120 días caería el 31 de mayo por casualidad; con 30 de
    // abril de por medio, el calendario es lo que manda.
    expect(sumarMeses('2026-01-31', 4)).toBe('2026-05-31');
  });
});

describe('ventanaDeLiquidacion · cuatro meses y dos adicionales', () => {
  it('abre las dos ventanas desde la terminación', () => {
    expect(ventanaDeLiquidacion('2026-03-15')).toEqual({
      fechaTerminacion: '2026-03-15',
      bilateralHasta: '2026-07-15',
      unilateralHasta: '2026-09-15',
    });
  });
});

describe('momentoDelPlazo · en qué ventana está el contrato', () => {
  const ventana = ventanaDeLiquidacion('2026-03-15');

  it('el mismo día de la terminación ya corre el acuerdo', () => {
    expect(momentoDelPlazo('2026-03-15', ventana)).toBe('BILATERAL');
  });

  it('el último día del acuerdo todavía es bilateral', () => {
    // `<=` y no `<`: recortar un día un término legal es el error que estas
    // funciones existen para evitar.
    expect(momentoDelPlazo('2026-07-15', ventana)).toBe('BILATERAL');
  });

  it('al día siguiente se abre la unilateral', () => {
    expect(momentoDelPlazo('2026-07-16', ventana)).toBe('UNILATERAL');
  });

  it('el último día de la unilateral todavía cuenta', () => {
    expect(momentoDelPlazo('2026-09-15', ventana)).toBe('UNILATERAL');
  });

  it('después queda vencido', () => {
    expect(momentoDelPlazo('2026-09-16', ventana)).toBe('VENCIDO');
  });
});

describe('diasRestantes', () => {
  it('cuenta los días que faltan', () => {
    expect(diasRestantes('2026-07-01', '2026-07-15')).toBe(14);
  });

  it('da negativo cuando ya pasó', () => {
    expect(diasRestantes('2026-07-20', '2026-07-15')).toBe(-5);
  });
});

describe('alertaDelPlazo · lo que pide RF-SIS-03', () => {
  const ventana = ventanaDeLiquidacion('2026-03-15');

  it('dentro del acuerdo dice cuántos días quedan y hasta cuándo', () => {
    const alerta = alertaDelPlazo('2026-07-01', ventana);

    expect(alerta.momento).toBe('BILATERAL');
    expect(alerta.dias).toBe(14);
    expect(alerta.mensaje).toContain('2026-07-15');
  });

  it('el último día lo dice sin números', () => {
    // «Quedan 0 días» se lee como si ya hubiera pasado.
    expect(alertaDelPlazo('2026-07-15', ventana).mensaje).toMatch(/hoy vence/i);
  });

  it('abierta la unilateral, avisa que el acuerdo venció', () => {
    const alerta = alertaDelPlazo('2026-08-01', ventana);

    expect(alerta.momento).toBe('UNILATERAL');
    expect(alerta.mensaje).toMatch(/venció el plazo del acuerdo/i);
    expect(alerta.mensaje).toContain('2026-09-15');
  });

  it('vencido todo, dice que queda en manos del juez', () => {
    const alerta = alertaDelPlazo('2026-10-01', ventana);

    expect(alerta.momento).toBe('VENCIDO');
    expect(alerta.dias).toBeLessThan(0);
    expect(alerta.mensaje).toMatch(/juez/i);
  });
});
