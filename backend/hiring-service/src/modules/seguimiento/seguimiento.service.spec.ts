import { admiteSeguimiento } from './seguimiento.service';

/**
 * Criterios de EFDS-1168, los dos: «dado un contrato en ejecución, cuando el
 * supervisor carga informes/actas/soportes…» y «…cuando se consulta, entonces
 * el sistema muestra su estado actual y responsables».
 *
 * Los dos empiezan igual, así que la regla es una sola: antes de la reunión de
 * inicio no hay ejecución que seguir.
 */
describe('admiteSeguimiento', () => {
  it('un contrato en ejecución admite seguimiento', () => {
    expect(admiteSeguimiento('EJECUCION')).toBe(true);
  });

  it('uno legalizado todavía no: le falta la reunión de inicio', () => {
    // Legalizado es tener las coberturas en firme, no haber empezado. Cargar
    // informes aquí acreditaría un periodo que no ha corrido.
    expect(admiteSeguimiento('LEGALIZADO')).toBe(false);
  });

  it('ni uno apenas suscrito', () => {
    expect(admiteSeguimiento('PERFECCIONADO')).toBe(false);
  });

  it('ni antes de las firmas', () => {
    expect(admiteSeguimiento('GENERADO')).toBe(false);
    expect(admiteSeguimiento('ACEPTADO')).toBe(false);
  });

  it('tampoco sobre una minuta rechazada', () => {
    expect(admiteSeguimiento('RECHAZADO')).toBe(false);
  });
});
