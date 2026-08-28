import { admiteModificacion, plazoConProrroga } from './modificaciones.service';

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
