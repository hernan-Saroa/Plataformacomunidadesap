import { quienLaHace } from './quien-la-hace';

/**
 * A quién le toca cada actividad por defecto (EFDS-1183).
 *
 * Por papel siempre que el proceso ya sepa quién es, para que llegue a la
 * persona de ese proceso; por rol solo donde aún no hay nadie asignado.
 */
describe('quienLaHace', () => {
  it('el estudio previo y el análisis del sector son del área que radicó', () => {
    expect(quienLaHace('3.1')).toEqual({ papeles: ['RADICADOR'], roles: [] });
    expect(quienLaHace('3.2')).toEqual({ papeles: ['RADICADOR'], roles: [] });
  });

  it('la radicación le toca a quien puede tomarla de la bandeja: aún no es de nadie', () => {
    expect(quienLaHace('3.3')).toEqual({ papeles: ['BANDEJA_CONTRATACION'], roles: [] });
  });

  it('el CDP y el RP, al equipo financiero', () => {
    expect(quienLaHace('4.3')?.papeles).toEqual(['EQUIPO_FINANCIERO']);
    expect(quienLaHace('8.3')?.papeles).toEqual(['EQUIPO_FINANCIERO']);
  });

  it('lo que designa el ordenador del gasto va por rol: todavía no hay a quién nombrar', () => {
    expect(quienLaHace('6.2')).toEqual({ papeles: [], roles: ['ORDENADOR_GASTO'] });
    expect(quienLaHace('8.2')).toEqual({ papeles: [], roles: ['ORDENADOR_GASTO'] });
  });

  it('la evaluación al comité y la ejecución al supervisor de ese proceso', () => {
    expect(quienLaHace('6.3')?.papeles).toEqual(['COMITE_EVALUADOR']);
    expect(quienLaHace('9.4')?.papeles).toEqual(['SUPERVISOR']);
  });

  it('lo demás de la Dirección, al abogado del proceso', () => {
    expect(quienLaHace('5.2')?.papeles).toEqual(['ABOGADO']);
    expect(quienLaHace('10.2')?.papeles).toEqual(['ABOGADO']);
  });

  it('antes de que exista el proceso no hay a quién sugerir', () => {
    expect(quienLaHace('1.1')).toBeNull();
    expect(quienLaHace('2.3')).toBeNull();
  });
});
