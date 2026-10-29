import { admitePublicacion } from './publicacion-contrato.service';

/**
 * Actividad 8.8: la publicación del contrato.
 *
 * Se publica con el contrato firmado por las dos partes: el plazo legal (tres
 * días hábiles, Decreto 1082) corre desde ahí y no espera a las garantías ni
 * a la ARL. Antes exigía el contrato legalizado y podía vencerse el término.
 */
describe('admitePublicacion', () => {
  it('un contrato firmado por las dos partes se publica', () => {
    expect(admitePublicacion('PERFECCIONADO')).toBe(true);
  });

  it('no espera a las garantías ni a la ARL', () => {
    expect(admitePublicacion('LEGALIZADO')).toBe(true);
  });

  it('no se publica antes de las firmas', () => {
    expect(admitePublicacion('GENERADO')).toBe(false);
    expect(admitePublicacion('ACEPTADO')).toBe(false);
  });

  it('tampoco una minuta rechazada', () => {
    expect(admitePublicacion('RECHAZADO')).toBe(false);
  });
});
