import { alMenos } from './contrato.entity';

/**
 * El orden del ciclo del contrato.
 *
 * Existe porque las reglas que enumeraban estados a mano —«perfeccionado o
 * legalizado»— había que corregirlas cada vez que aparecía uno nuevo, y
 * olvidarse de una dejaba de admitir contratos más avanzados que el exigido: al
 * añadir EJECUCION, seis reglas habrían dejado de reconocer contratos ya
 * legalizados.
 */
describe('alMenos', () => {
  it('un estado se alcanza a sí mismo', () => {
    expect(alMenos('LEGALIZADO', 'LEGALIZADO')).toBe(true);
  });

  it('los posteriores también cuentan', () => {
    // Quien está en ejecución ya pasó por firmas y coberturas.
    expect(alMenos('EJECUCION', 'PERFECCIONADO')).toBe(true);
    expect(alMenos('EJECUCION', 'LEGALIZADO')).toBe(true);
    expect(alMenos('LEGALIZADO', 'PERFECCIONADO')).toBe(true);
  });

  it('los anteriores no', () => {
    expect(alMenos('PERFECCIONADO', 'LEGALIZADO')).toBe(false);
    expect(alMenos('GENERADO', 'ACEPTADO')).toBe(false);
  });

  it('una minuta rechazada no alcanza ningún punto', () => {
    // Aunque generado sea «anterior», rechazado no es una fase menos avanzada:
    // es una minuta que no prosperó y no llega a ninguna parte.
    expect(alMenos('RECHAZADO', 'GENERADO')).toBe(false);
    expect(alMenos('RECHAZADO', 'PERFECCIONADO')).toBe(false);
  });
});
