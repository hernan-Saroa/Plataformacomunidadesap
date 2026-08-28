import {
  admiteModificacion,
  admiteTipo,
  estadoTrasModificacion,
  plazoConProrroga,
} from './modificaciones.service';

/**
 * Criterio de EFDS-1177: «dado un contrato en ejecución, cuando se tramita una
 * prórroga con justificación técnica, el sistema la registra extendiendo el
 * plazo sin modificar el presupuesto».
 */
describe('admiteModificacion', () => {
  it('un contrato en ejecución admite que se le tramite una prórroga', () => {
    expect(admiteModificacion('EJECUCION')).toBe(true);
  });

  it('uno suspendido también: la reanudación es una modificación', () => {
    expect(admiteModificacion('SUSPENDIDO')).toBe(true);
  });

  it('uno que no ha empezado no: no hay plazo corriendo que extender', () => {
    expect(admiteModificacion('LEGALIZADO')).toBe(false);
    expect(admiteModificacion('PERFECCIONADO')).toBe(false);
  });

  it('uno terminado tampoco: lo que procede es liquidar, no prorrogar', () => {
    // Prorrogar lo terminado reviviría un plazo que ya se agotó.
    expect(admiteModificacion('TERMINADO')).toBe(false);
    expect(admiteModificacion('LIQUIDADO')).toBe(false);
    expect(admiteModificacion('CERRADO')).toBe(false);
  });

  it('ni una minuta rechazada', () => {
    expect(admiteModificacion('RECHAZADO')).toBe(false);
  });
});

describe('plazoConProrroga', () => {
  it('suma los días al plazo vigente', () => {
    expect(plazoConProrroga(90, 30)).toBe(120);
  });

  it('las prórrogas se acumulan sobre el plazo ya extendido', () => {
    // El contrato guarda el plazo con las anteriores sumadas, así que la
    // segunda parte de 120 y no de los 90 originales.
    expect(plazoConProrroga(120, 15)).toBe(135);
  });

  it('un solo día basta', () => {
    expect(plazoConProrroga(90, 1)).toBe(91);
  });
});

/**
 * Criterio de EFDS-1178: «cuando se tramita una cesión, aclaración o
 * suspensión/reanudación, el sistema la registra con su acto administrativo y
 * actualiza el estado del contrato cuando aplique».
 *
 * El «cuando aplique» es lo que decide esta función.
 */
describe('estadoTrasModificacion', () => {
  it('la suspensión detiene el contrato', () => {
    expect(estadoTrasModificacion('SUSPENSION')).toBe('SUSPENDIDO');
  });

  it('la reanudación lo devuelve a la ejecución', () => {
    expect(estadoTrasModificacion('REANUDACION')).toBe('EJECUCION');
  });

  it('la terminación anticipada lo termina', () => {
    expect(estadoTrasModificacion('TERMINACION_ANTICIPADA')).toBe('TERMINADO');
  });

  it('la cesión y la aclaración no lo mueven', () => {
    // Cambian quién ejecuta y qué dice el contrato, pero sigue corriendo igual.
    expect(estadoTrasModificacion('CESION')).toBeNull();
    expect(estadoTrasModificacion('ACLARACION')).toBeNull();
  });

  it('la prórroga tampoco: mueve el plazo, no el estado', () => {
    expect(estadoTrasModificacion('PRORROGA')).toBeNull();
  });
});

describe('admiteTipo', () => {
  it('un contrato corriendo se puede suspender', () => {
    expect(admiteTipo('EJECUCION', 'SUSPENSION')).toBe(true);
  });

  it('uno ya suspendido no se vuelve a suspender', () => {
    expect(admiteTipo('SUSPENDIDO', 'SUSPENSION')).toBe(false);
  });

  it('solo se reanuda lo que está detenido', () => {
    expect(admiteTipo('SUSPENDIDO', 'REANUDACION')).toBe(true);
    expect(admiteTipo('EJECUCION', 'REANUDACION')).toBe(false);
  });

  it('la cesión y la aclaración se tramitan en ambos', () => {
    expect(admiteTipo('EJECUCION', 'CESION')).toBe(true);
    expect(admiteTipo('SUSPENDIDO', 'CESION')).toBe(true);
    expect(admiteTipo('EJECUCION', 'ACLARACION')).toBe(true);
    expect(admiteTipo('SUSPENDIDO', 'ACLARACION')).toBe(true);
  });

  it('un contrato suspendido se puede terminar sin reanudarlo', () => {
    expect(admiteTipo('SUSPENDIDO', 'TERMINACION_ANTICIPADA')).toBe(true);
  });

  it('nada se tramita sobre un contrato que no está en ejecución', () => {
    expect(admiteTipo('LEGALIZADO', 'CESION')).toBe(false);
    expect(admiteTipo('TERMINADO', 'SUSPENSION')).toBe(false);
    expect(admiteTipo('CERRADO', 'ACLARACION')).toBe(false);
  });
});
