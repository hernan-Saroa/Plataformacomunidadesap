import { EstadoContrato } from '../../entities/contrato.entity';
import { admiteLiquidacion } from './liquidacion.service';

/**
 * La regla de entrada de la actividad 10.2 (EFDS-1172).
 *
 * Se prueba aparte y sin base de datos porque cada estado nuevo del contrato la
 * toca: al llegar LIQUIDADO (EFDS-1175) esta función dejó de reconocer
 * contratos que antes entraban, y costó dos suites e2e descubrirlo.
 */
describe('admiteLiquidacion · qué contrato se puede liquidar', () => {
  it('el que está en ejecución y el que ya tiene acta', () => {
    // También el liquidado: anular el acta para rehacerla exige poder entrar.
    expect(admiteLiquidacion('EJECUCION')).toBe(true);
    expect(admiteLiquidacion('LIQUIDADO')).toBe(true);
  });

  it('el terminado anticipadamente sí: liquidar lo ejecutado es lo que sigue', () => {
    expect(admiteLiquidacion('TERMINADO')).toBe(true);
  });

  it('el detenido no: liquidar lo que sigue vivo cerraría cuentas que se mueven', () => {
    expect(admiteLiquidacion('SUSPENDIDO')).toBe(false);
  });

  it('rechaza el que nunca arrancó y el que ya cerró', () => {
    const fuera: EstadoContrato[] = ['GENERADO', 'ACEPTADO', 'RECHAZADO', 'LEGALIZADO', 'CERRADO'];
    expect(fuera.map(admiteLiquidacion)).toEqual([false, false, false, false, false]);
  });
});
