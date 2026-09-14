import { alMenos, enEjecucion, puedeTransicionar } from './contrato.entity';

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

  it('un contrato suspendido conserva el camino recorrido', () => {
    // La pausa no le quita lo andado: estaba ejecutándose cuando se suspendió,
    // así que responde por el punto donde quedó detenido.
    expect(alMenos('SUSPENDIDO', 'LEGALIZADO')).toBe(true);
    expect(alMenos('SUSPENDIDO', 'EJECUCION')).toBe(true);
  });

  it('los estados del final del ciclo superan a los anteriores', () => {
    expect(alMenos('TERMINADO', 'EJECUCION')).toBe(true);
    expect(alMenos('LIQUIDADO', 'TERMINADO')).toBe(true);
    expect(alMenos('CERRADO', 'LIQUIDADO')).toBe(true);
    expect(alMenos('TERMINADO', 'LIQUIDADO')).toBe(false);
  });
});

/**
 * `enEjecucion` — lo que separa «llegó a ejecutarse» de «está corriendo».
 *
 * Es la distinción que `alMenos` no puede hacer: un contrato terminado también
 * llegó a la ejecución, y sin embargo ya no admite que se le carguen informes
 * del periodo que corre, porque no corre ninguno.
 */
describe('enEjecucion', () => {
  it('un contrato en ejecución está corriendo', () => {
    expect(enEjecucion('EJECUCION')).toBe(true);
  });

  it('uno suspendido también: la pausa detiene el plazo, no la relación', () => {
    // Se le sigue vigilando, y la suspensión suele ser lo que hay que vigilar.
    expect(enEjecucion('SUSPENDIDO')).toBe(true);
  });

  it('uno terminado ya no, aunque haya llegado a ejecutarse', () => {
    // Es justo el caso que `alMenos` respondería que sí, y por eso hace falta
    // esta pregunta aparte.
    expect(alMenos('TERMINADO', 'EJECUCION')).toBe(true);
    expect(enEjecucion('TERMINADO')).toBe(false);
  });

  it('ni uno liquidado o cerrado', () => {
    expect(enEjecucion('LIQUIDADO')).toBe(false);
    expect(enEjecucion('CERRADO')).toBe(false);
  });

  it('ni uno que todavía no ha empezado', () => {
    expect(enEjecucion('LEGALIZADO')).toBe(false);
    expect(enEjecucion('PERFECCIONADO')).toBe(false);
  });
});

/**
 * Criterios de aceptación de EFDS-1184.
 *
 * Criterio 1: «cuando ocurre un hito (suscripción, inicio, suspensión,
 * terminación, liquidación, cierre), el sistema actualiza el estado».
 * Criterio 2: «cuando se intenta una transición no válida, el sistema la
 * impide».
 */
describe('puedeTransicionar', () => {
  it('el ciclo completo se recorre hito a hito', () => {
    // Criterio 1: cada hito lleva al estado siguiente.
    expect(puedeTransicionar('GENERADO', 'ACEPTADO')).toBe(true);
    expect(puedeTransicionar('ACEPTADO', 'PERFECCIONADO')).toBe(true);
    expect(puedeTransicionar('PERFECCIONADO', 'LEGALIZADO')).toBe(true);
    expect(puedeTransicionar('LEGALIZADO', 'EJECUCION')).toBe(true);
    expect(puedeTransicionar('EJECUCION', 'TERMINADO')).toBe(true);
    expect(puedeTransicionar('TERMINADO', 'LIQUIDADO')).toBe(true);
    expect(puedeTransicionar('LIQUIDADO', 'CERRADO')).toBe(true);
  });

  it('la suspensión y la reanudación van en los dos sentidos', () => {
    // RF-MOD-03: lo que se suspende se reanuda, y vuelve donde estaba.
    expect(puedeTransicionar('EJECUCION', 'SUSPENDIDO')).toBe(true);
    expect(puedeTransicionar('SUSPENDIDO', 'EJECUCION')).toBe(true);
  });

  it('un contrato suspendido puede terminarse sin reanudarse', () => {
    // Terminar anticipadamente lo que está suspendido es el caso típico: no
    // hay que reanudar un contrato para poder darlo por terminado.
    expect(puedeTransicionar('SUSPENDIDO', 'TERMINADO')).toBe(true);
  });

  it('no se salta ningún paso del ciclo', () => {
    // Criterio 2. Liquidar sin terminar, o ejecutar sin legalizar, dejaría el
    // expediente afirmando hitos que nunca ocurrieron.
    expect(puedeTransicionar('LEGALIZADO', 'LIQUIDADO')).toBe(false);
    expect(puedeTransicionar('PERFECCIONADO', 'EJECUCION')).toBe(false);
    expect(puedeTransicionar('EJECUCION', 'LIQUIDADO')).toBe(false);
    expect(puedeTransicionar('TERMINADO', 'CERRADO')).toBe(false);
  });

  it('no se retrocede', () => {
    expect(puedeTransicionar('EJECUCION', 'LEGALIZADO')).toBe(false);
    expect(puedeTransicionar('LIQUIDADO', 'TERMINADO')).toBe(false);
  });

  it('los estados finales no llevan a ninguna parte', () => {
    // Un contrato cerrado está cerrado, y una minuta rechazada no revive: para
    // volver a intentarlo se genera otra, que es lo que hace EFDS-1161.
    expect(puedeTransicionar('CERRADO', 'LIQUIDADO')).toBe(false);
    expect(puedeTransicionar('RECHAZADO', 'ACEPTADO')).toBe(false);
    expect(puedeTransicionar('RECHAZADO', 'GENERADO')).toBe(false);
  });

  it('solo se rechaza una minuta que todavía no se aceptó', () => {
    expect(puedeTransicionar('GENERADO', 'RECHAZADO')).toBe(true);
    // Ya aceptada, lo que procede es terminarla, no rechazarla.
    expect(puedeTransicionar('ACEPTADO', 'RECHAZADO')).toBe(false);
    expect(puedeTransicionar('EJECUCION', 'RECHAZADO')).toBe(false);
  });
});
