import { EstadoContrato } from '../../entities/contrato.entity';
import { admiteInformeFinal } from './informe-final.service';

/**
 * La regla de entrada de la actividad 10.1 (EFDS-1171).
 *
 * Sin base de datos porque es la que decide cuándo un contrato puede cerrar su
 * ejecución, y de ese informe cuelga la liquidación.
 */
describe('admiteInformeFinal · qué contrato puede cerrar su ejecución', () => {
  it('solo el que está en ejecución', () => {
    expect(admiteInformeFinal('EJECUCION')).toBe(true);
  });

  it('no basta con estar legalizado: sin acta de inicio no hubo ejecución', () => {
    // No hay nada que informar de un contrato que nunca arrancó.
    expect(admiteInformeFinal('LEGALIZADO')).toBe(false);
  });

  it('rechaza todo lo anterior', () => {
    const previos: EstadoContrato[] = ['GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO'];
    expect(previos.map(admiteInformeFinal)).toEqual([false, false, false, false]);
  });
});
