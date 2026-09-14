import { admiteInicio } from './acta-inicio.service';

/**
 * Criterio de EFDS-1167: «dado un contrato legalizado con supervisor designado,
 * cuando se suscribe el acta de inicio, entonces el sistema la registra y marca
 * el contrato en ejecución».
 *
 * Aquí solo se prueba la mitad que depende del estado; que haya supervisor lo
 * comprueba el servicio, porque no se deduce del contrato.
 */
describe('admiteInicio', () => {
  it('un contrato legalizado puede arrancar', () => {
    expect(admiteInicio('LEGALIZADO')).toBe(true);
  });

  it('uno ya en ejecución sigue cumpliendo la condición', () => {
    // Si no, la regla se contradiría al consultarla después de arrancar: el
    // contrato dejaría de cumplir lo que lo llevó ahí.
    expect(admiteInicio('EJECUCION')).toBe(true);
  });

  it('no arranca sin las coberturas en firme', () => {
    // Perfeccionado es firmado, no amparado: pueden faltar pólizas o la ARL.
    expect(admiteInicio('PERFECCIONADO')).toBe(false);
  });

  it('no arranca antes de las firmas', () => {
    expect(admiteInicio('GENERADO')).toBe(false);
    expect(admiteInicio('ACEPTADO')).toBe(false);
  });

  it('tampoco sobre una minuta rechazada', () => {
    expect(admiteInicio('RECHAZADO')).toBe(false);
  });
});
