import { admitePublicacion } from './publicacion-contrato.service';

/**
 * Criterio de EFDS-1166: «dado un contrato perfeccionado y legalizado, cuando
 * el usuario lo publica, el sistema registra la publicación y controla el
 * plazo».
 *
 * Publicar un contrato al que le faltan garantías anunciaría como firme algo
 * que todavía puede cambiar.
 */
describe('admitePublicacion', () => {
  it('un contrato legalizado se publica', () => {
    expect(admitePublicacion('LEGALIZADO')).toBe(true);
  });

  it('no se publica uno al que le faltan las garantías', () => {
    // Perfeccionado significa firmado, no amparado: la historia pide las dos
    // cosas, «perfeccionado y legalizado».
    expect(admitePublicacion('PERFECCIONADO')).toBe(false);
  });

  it('no se publica antes de las firmas', () => {
    expect(admitePublicacion('GENERADO')).toBe(false);
    expect(admitePublicacion('ACEPTADO')).toBe(false);
  });

  it('tampoco una minuta rechazada', () => {
    expect(admitePublicacion('RECHAZADO')).toBe(false);
  });
});
