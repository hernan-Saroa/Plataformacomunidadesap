import { admiteSupervisor } from './supervision.service';

/**
 * Actividad 8.2 de la matriz: la designación del supervisor.
 *
 * La matriz la sitúa en el puesto 2 de la etapa, antes de las garantías (8.4)
 * y la ARL (8.5), mientras que EFDS-1165 la enuncia «dado un contrato
 * legalizado» —que es justamente tener 8.4 y 8.5 aprobadas—. Exigir la
 * legalización volvería inalcanzable el puesto que la matriz le da, así que
 * manda la matriz y basta con el contrato perfeccionado.
 *
 * La desviación quedó anotada en la historia para que la Dirección de
 * Contratación decida cuál de las dos fuentes se corrige.
 */
describe('admiteSupervisor', () => {
  it('un contrato perfeccionado admite supervisor', () => {
    // El puesto 2 de la matriz: firmado por las dos partes, todavía sin
    // garantías aprobadas.
    expect(admiteSupervisor('PERFECCIONADO')).toBe(true);
  });

  it('un contrato legalizado también, porque ya pasó por el perfeccionamiento', () => {
    expect(admiteSupervisor('LEGALIZADO')).toBe(true);
  });

  it('no se designa antes de las firmas', () => {
    // Sin las dos firmas no hay contrato que vigilar: designar ahí sería
    // encargar la supervisión de algo que aún puede no llegar a existir.
    expect(admiteSupervisor('GENERADO')).toBe(false);
    expect(admiteSupervisor('ACEPTADO')).toBe(false);
  });

  it('tampoco sobre una minuta rechazada', () => {
    expect(admiteSupervisor('RECHAZADO')).toBe(false);
  });
});
