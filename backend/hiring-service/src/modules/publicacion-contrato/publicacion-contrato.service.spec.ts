import { admitePublicacion } from './publicacion-contrato.service';

/**
 * Actividad 8.8 de la matriz: la publicación del contrato.
 *
 * La matriz la sitúa en el último puesto de la etapa, así que leerla como
 * flujo lineal exige cumplidas las anteriores. La historia EFDS-1166 dice lo
 * mismo con otras palabras —«dado un contrato perfeccionado y legalizado»—:
 * legalizado es haber pasado por las garantías (8.4) y la ARL (8.5).
 *
 * Publicar antes anunciaría como firme un contrato al que aún pueden faltarle
 * las coberturas.
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
