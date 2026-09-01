import { EstadoContrato } from '../../entities/contrato.entity';
import { admiteInicio } from './acta-inicio.service';

/**
 * La regla de entrada de la etapa 9 (EFDS-1167).
 *
 * Se prueba aparte y sin base de datos porque es la que decide cuándo un
 * contrato puede empezar a ejecutarse, y equivocarla no falla: deja arrancar
 * un contrato al que todavía le faltan las garantías.
 */
describe('admiteInicio · qué contrato puede empezar a ejecutarse', () => {
  it('exige que el contrato esté legalizado', () => {
    expect(admiteInicio('LEGALIZADO')).toBe(true);
  });

  it('no basta con que las dos partes lo hayan firmado', () => {
    // Perfeccionado es firmado; legalizado es firmado *y* amparado. La reunión
    // de inicio va después de las garantías y la ARL, no entre una cosa y otra.
    expect(admiteInicio('PERFECCIONADO')).toBe(false);
  });

  it('admite el que ya está en ejecución', () => {
    expect(admiteInicio('EJECUCION')).toBe(true);
  });

  it('rechaza los estados anteriores a la firma', () => {
    const previos: EstadoContrato[] = ['GENERADO', 'ACEPTADO'];
    expect(previos.map((e) => admiteInicio(e))).toEqual([false, false]);
  });

  it('rechaza el contrato que el proponente no aceptó', () => {
    expect(admiteInicio('RECHAZADO')).toBe(false);
  });

  it('los desenlaces de la etapa 10 siguen contando como legalizados', () => {
    // `alMenos` mide qué tan avanzado está el contrato, y liquidado o cerrado
    // están *después* de legalizado: la escala no miente. Lo que impide que un
    // contrato liquidado estrene reunión de inicio no es esta regla, es el
    // índice único `uq_acta_inicio_contrato`, que ya tiene la suya.
    const desenlaces: EstadoContrato[] = ['LIQUIDADO', 'CERRADO'];
    expect(desenlaces.map((e) => admiteInicio(e))).toEqual([true, true]);
  });
});
