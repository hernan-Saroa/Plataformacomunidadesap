import { BadRequestException } from '@nestjs/common';
import {
  diasRestantesPrueba, esVinculacionPrueba, fechaCumplimientoPrueba, hoyColombia, pendienteDecisionComite,
  soloFecha, validarDecisionComite,
} from './rund-periodo-prueba';
import { claveAlertaPeriodoPrueba } from './rund-periodo-prueba-alertas.service';

const HOY = '2026-11-15';

function errorDe(fn: () => unknown): any {
  try { fn(); } catch (e) { return e; }
  throw new Error('Se esperaba una excepción');
}

describe('HU 2424 · cálculo del periodo de prueba', () => {
  it('CA-02: la fecha de cumplimiento es un año después del inicio', () => {
    expect(fechaCumplimientoPrueba('2025-11-15')).toBe('2026-11-15');
    expect(fechaCumplimientoPrueba('2024-08-01')).toBe('2025-08-01');
    expect(fechaCumplimientoPrueba('2025-12-31')).toBe('2026-12-31');
    expect(fechaCumplimientoPrueba('2025-01-01T00:00:00.000Z')).toBe('2026-01-01');
  });

  it('borde: 29 de febrero cumple el 28 de febrero (igual que Postgres)', () => {
    expect(fechaCumplimientoPrueba('2024-02-29')).toBe('2025-02-28');
    expect(fechaCumplimientoPrueba('2023-02-28')).toBe('2024-02-28');
  });

  it('sin inicio o con fecha inválida no hay cumplimiento', () => {
    expect(fechaCumplimientoPrueba(null)).toBeNull();
    expect(fechaCumplimientoPrueba('')).toBeNull();
    expect(fechaCumplimientoPrueba('2025-02-30')).toBeNull();
    expect(fechaCumplimientoPrueba('no es fecha')).toBeNull();
  });

  it('lee un Date de pg (timestamp sin zona) con sus componentes locales', () => {
    expect(soloFecha(new Date(2025, 10, 15, 0, 0, 0))).toBe('2025-11-15');
    expect(fechaCumplimientoPrueba(new Date(2025, 10, 15))).toBe('2026-11-15');
    expect(soloFecha(new Date('invalid'))).toBeNull();
  });

  it('días restantes: positivo faltan, 0 es hoy y negativo ya venció', () => {
    expect(diasRestantesPrueba('2026-11-16', HOY)).toBe(1);
    expect(diasRestantesPrueba('2026-11-15', HOY)).toBe(0);
    expect(diasRestantesPrueba('2026-11-14', HOY)).toBe(-1);
    expect(diasRestantesPrueba('2027-11-15', HOY)).toBe(365);
    expect(diasRestantesPrueba(null, HOY)).toBeNull();
  });

  it('hoyColombia usa la zona de Bogotá, no la del servidor', () => {
    // 2026-11-16 03:00 UTC sigue siendo 15 de noviembre a las 22:00 en Colombia.
    expect(hoyColombia(new Date('2026-11-16T03:00:00Z'))).toBe('2026-11-15');
    expect(hoyColombia(new Date('2026-11-16T05:00:00Z'))).toBe('2026-11-16');
  });

  it('RN-01: solo la vinculación «Periodo de prueba» cuenta como en prueba', () => {
    expect(esVinculacionPrueba('PERIODO_DE_PRUEBA')).toBe(true);
    expect(esVinculacionPrueba(' periodo_de_prueba ')).toBe(true);
    expect(esVinculacionPrueba('CARRERA2')).toBe(false);
    expect(esVinculacionPrueba(null)).toBe(false);
  });
});

describe('HU 2424 · pendiente de decisión (RN-03 / CA-03)', () => {
  const base = { vinculacionCodigo: 'PERIODO_DE_PRUEBA', estado: 'ACTIVO', hoy: HOY };

  it('queda pendiente el día que se cumple el año y después', () => {
    expect(pendienteDecisionComite({ ...base, inicio: '2025-11-15' })).toBe(true);
    expect(pendienteDecisionComite({ ...base, inicio: '2025-01-10' })).toBe(true);
  });

  it('un día antes todavía no es pendiente', () => {
    expect(pendienteDecisionComite({ ...base, inicio: '2025-11-16' })).toBe(false);
  });

  it('no es pendiente si está inactivo, ya tiene decisión, no está en prueba o no tiene inicio', () => {
    expect(pendienteDecisionComite({ ...base, estado: 'INACTIVO', inicio: '2025-01-10' })).toBe(false);
    expect(pendienteDecisionComite({ ...base, inicio: '2025-01-10', decision: { resultado: 'SUPERA' } })).toBe(false);
    expect(pendienteDecisionComite({ ...base, vinculacionCodigo: 'CARRERA2', inicio: '2025-01-10' })).toBe(false);
    expect(pendienteDecisionComite({ ...base, inicio: null })).toBe(false);
  });
});

describe('HU 2424 · validación de la decisión del comité (RN-05 / CA-06 / CA-07)', () => {
  const valida = { resultado: 'SUPERA', fechaComite: '2026-11-10', soporteId: 'sop-1' };

  it('acepta «Supera» con fecha y soporte, sin motivo', () => {
    expect(validarDecisionComite(valida, HOY)).toEqual({
      resultado: 'SUPERA', fechaComite: '2026-11-10', motivo: null, observacion: null, soporteId: 'sop-1',
    });
  });

  it('acepta «No supera» con motivo y conserva la observación', () => {
    const r = validarDecisionComite({ ...valida, resultado: 'no_supera', motivo: ' No cumple segunda lengua ', observacion: 'Acta 12' }, HOY);
    expect(r).toMatchObject({ resultado: 'NO_SUPERA', motivo: 'No cumple segunda lengua', observacion: 'Acta 12' });
  });

  it('CA-06: sin soporte y sin fecha nombra los dos campos faltantes', () => {
    const e = errorDe(() => validarDecisionComite({ resultado: 'SUPERA' }, HOY));
    expect(e).toBeInstanceOf(BadRequestException);
    expect(e.getResponse().message).toBe('Faltan campos obligatorios: fecha del comité, soporte (acto administrativo o certificación).');
    expect(e.getResponse().camposFaltantes).toEqual(['fecha del comité', 'soporte (acto administrativo o certificación)']);
  });

  it('CA-06: solo soporte faltante', () => {
    const e = errorDe(() => validarDecisionComite({ resultado: 'SUPERA', fechaComite: '2026-11-10' }, HOY));
    expect(e.getResponse().message).toBe('Faltan campos obligatorios: soporte (acto administrativo o certificación).');
  });

  it('sin resultado exige elegir una decisión', () => {
    const e = errorDe(() => validarDecisionComite({ fechaComite: '2026-11-10', soporteId: 's' }, HOY));
    expect(e.getResponse().camposFaltantes).toEqual(['resultado de la decisión']);
    expect(errorDe(() => validarDecisionComite({ resultado: 'TAL VEZ', fechaComite: '2026-11-10', soporteId: 's' }, HOY))).toBeInstanceOf(BadRequestException);
  });

  it('CA-07: «No supera» sin motivo indica que el motivo es obligatorio', () => {
    const e = errorDe(() => validarDecisionComite({ ...valida, resultado: 'NO_SUPERA' }, HOY));
    expect(e.getResponse().message).toBe('El motivo es obligatorio cuando el docente no supera el periodo de prueba.');
    const blanco = errorDe(() => validarDecisionComite({ ...valida, resultado: 'NO_SUPERA', motivo: '   ' }, HOY));
    expect(blanco.getResponse().camposFaltantes).toEqual(['motivo']);
  });

  it('«No supera» sin fecha ni motivo lista ambos', () => {
    const e = errorDe(() => validarDecisionComite({ resultado: 'NO_SUPERA', soporteId: 's' }, HOY));
    expect(e.getResponse().camposFaltantes).toEqual(['fecha del comité', 'motivo']);
  });

  it('rechaza fechas inválidas y futuras; hoy sí es válido', () => {
    expect(errorDe(() => validarDecisionComite({ ...valida, fechaComite: '15/11/2026' }, HOY)).getResponse().message).toContain('no es válida');
    expect(errorDe(() => validarDecisionComite({ ...valida, fechaComite: '2026-02-30' }, HOY)).getResponse().message).toContain('no es válida');
    expect(errorDe(() => validarDecisionComite({ ...valida, fechaComite: '2026-11-16' }, HOY)).getResponse().message).toContain('posterior a hoy');
    expect(validarDecisionComite({ ...valida, fechaComite: HOY }, HOY).fechaComite).toBe(HOY);
  });

  it('limita motivo y observación a 1000 caracteres', () => {
    expect(errorDe(() => validarDecisionComite({ ...valida, resultado: 'NO_SUPERA', motivo: 'x'.repeat(1001) }, HOY))).toBeInstanceOf(BadRequestException);
    expect(errorDe(() => validarDecisionComite({ ...valida, observacion: 'x'.repeat(1001) }, HOY))).toBeInstanceOf(BadRequestException);
  });
});

describe('HU 2424 · clave idempotente de la alerta', () => {
  it('es un UUID estable por docente, fecha y destinatario', () => {
    const a = claveAlertaPeriodoPrueba('doc-1', '2026-11-15', 'user-1');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(claveAlertaPeriodoPrueba('doc-1', '2026-11-15', 'user-1')).toBe(a);
    expect(claveAlertaPeriodoPrueba('doc-1', '2026-11-15', 'user-2')).not.toBe(a);
    expect(claveAlertaPeriodoPrueba('doc-2', '2026-11-15', 'user-1')).not.toBe(a);
    expect(claveAlertaPeriodoPrueba('doc-1', '2026-11-16', 'user-1')).not.toBe(a);
  });
});
