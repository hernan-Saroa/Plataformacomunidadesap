import { admiteSupervisor } from './supervision.service';

/**
 * Criterio de EFDS-1165: «dado un contrato legalizado, cuando el ordenador del
 * gasto designa al supervisor, el sistema registra la designación».
 *
 * Se vigila la ejecución de un contrato con sus coberturas en firme: designar
 * antes sería encargar la vigilancia de algo que todavía puede no llegar a
 * ejecutarse.
 */
describe('admiteSupervisor', () => {
  it('un contrato legalizado admite supervisor', () => {
    expect(admiteSupervisor('LEGALIZADO')).toBe(true);
  });

  it('no se designa sobre un contrato al que le faltan garantías', () => {
    // Perfeccionado significa firmado, no amparado: las pólizas todavía pueden
    // estar sin aprobar, o faltar la ARL.
    expect(admiteSupervisor('PERFECCIONADO')).toBe(false);
  });

  it('no se designa antes de las firmas', () => {
    expect(admiteSupervisor('GENERADO')).toBe(false);
    expect(admiteSupervisor('ACEPTADO')).toBe(false);
  });

  it('tampoco sobre una minuta rechazada', () => {
    expect(admiteSupervisor('RECHAZADO')).toBe(false);
  });
});
