import { EstadoContrato } from '../../entities/contrato.entity';
import { admiteActaInicio } from './acta-inicio.service';

/**
 * La regla de entrada de la etapa 9 (EFDS-1167).
 *
 * Se prueba aparte y sin base de datos porque es la que decide cuándo un
 * contrato puede empezar a ejecutarse, y equivocarla no falla: deja arrancar
 * un contrato al que todavía le faltan las garantías.
 */
describe('admiteActaInicio · qué contrato puede empezar a ejecutarse', () => {
  it('exige que el contrato esté legalizado', () => {
    expect(admiteActaInicio('LEGALIZADO')).toBe(true);
  });

  it('no basta con que las dos partes lo hayan firmado', () => {
    // Perfeccionado es firmado; legalizado es firmado *y* amparado. El acta va
    // después de las garantías y la ARL, no entre una cosa y la otra.
    expect(admiteActaInicio('PERFECCIONADO')).toBe(false);
  });

  it('admite el que ya está en ejecución, para poder rehacer su acta', () => {
    // Si devolviera false, anular un acta equivocada dejaría al contrato sin
    // salida: no podría suscribirse la corregida.
    expect(admiteActaInicio('EJECUCION')).toBe(true);
  });

  it('rechaza los estados anteriores a la firma', () => {
    const previos: EstadoContrato[] = ['GENERADO', 'ACEPTADO'];
    expect(previos.map(admiteActaInicio)).toEqual([false, false]);
  });

  it('rechaza el contrato que el proponente no aceptó', () => {
    expect(admiteActaInicio('RECHAZADO')).toBe(false);
  });
});
