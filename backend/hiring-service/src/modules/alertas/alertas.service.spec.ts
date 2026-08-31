import {
  diasParaVencer,
  estadoAlerta,
  finDeVigenciaFiscal,
  limiteLiquidacion,
} from './alertas.service';

/**
 * Criterio 1 de EFDS-1185: «dado un CDP, RP o póliza con fecha de vencimiento,
 * cuando se aproxima el vencimiento, el sistema notifica al responsable».
 */
describe('diasParaVencer', () => {
  it('cuenta los días que faltan', () => {
    expect(diasParaVencer('2026-09-30', '2026-09-01')).toBe(29);
  });

  it('lo que vence hoy no lleva días de sobra', () => {
    expect(diasParaVencer('2026-09-01', '2026-09-01')).toBe(0);
  });

  it('lo ya vencido cuenta en negativo', () => {
    expect(diasParaVencer('2026-08-25', '2026-09-01')).toBe(-7);
  });

  it('cruza el cambio de año', () => {
    expect(diasParaVencer('2027-01-01', '2026-12-31')).toBe(1);
  });
});

describe('estadoAlerta', () => {
  it('avisa cuando faltan menos días que la anticipación', () => {
    expect(estadoAlerta(10, 30)).toBe('POR_VENCER');
  });

  it('el día justo de la anticipación ya avisa', () => {
    // El límite entra: si la anticipación es 30, a 30 días se avisa.
    expect(estadoAlerta(30, 30)).toBe('POR_VENCER');
  });

  it('lo que vence hoy está por vencer, no vencido', () => {
    expect(estadoAlerta(0, 30)).toBe('POR_VENCER');
  });

  it('lo pasado está vencido', () => {
    expect(estadoAlerta(-1, 30)).toBe('VENCIDO');
  });

  it('lo lejano no molesta', () => {
    expect(estadoAlerta(31, 30)).toBe('VIGENTE');
    expect(estadoAlerta(400, 30)).toBe('VIGENTE');
  });
});

/**
 * Criterio 2: «dado un contrato terminado, cuando se aproxima el plazo legal de
 * liquidación, el sistema alerta del vencimiento».
 */
describe('limiteLiquidacion', () => {
  it('cuenta cuatro meses desde la terminación', () => {
    expect(limiteLiquidacion('2026-01-15')).toBe('2026-05-15');
  });

  it('cruza el año', () => {
    expect(limiteLiquidacion('2026-10-31')).toBe('2027-02-28');
  });

  it('cae en el mismo día del mes, no a 120 días', () => {
    // Contar en meses y no en días es lo que hace que febrero no corra la fecha.
    expect(limiteLiquidacion('2026-02-28')).toBe('2026-06-28');
  });
});

describe('finDeVigenciaFiscal', () => {
  it('el respaldo presupuestal vale hasta el cierre del año', () => {
    // El CDP y el RP se imputan a una vigencia, no a una fecha suelta.
    expect(finDeVigenciaFiscal(2026)).toBe('2026-12-31');
  });
});
