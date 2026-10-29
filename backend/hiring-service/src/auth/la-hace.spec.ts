import { accionQueHace, laQueRige, leerLaHace, motivoParaNoHacer } from './la-hace';

/**
 * Quién hace una actividad (109).
 *
 * El permiso dice quién PUEDE; la regla «quién la hace» dice, de esos, quién
 * la HACE en el proceso: el ocupante de un puesto o unas personas. Nunca da un
 * permiso. Sustituye a la regla fija del abogado de la 3.4, la 3.6 y la 3.7.
 */
describe('quién hace la actividad', () => {
  const PUESTO = { puestoId: 'p-abogado' };

  const motivo = (over: Partial<Parameters<typeof motivoParaNoHacer>[0]> = {}) =>
    motivoParaNoHacer({
      tienePermiso: true,
      regla: PUESTO,
      hayOcupante: true,
      esElOcupante: true,
      estaEntreLasPersonas: false,
      ...over,
    });

  it('sin regla la hace cualquiera con el permiso, como siempre', () => {
    expect(motivo({ regla: null })).toBeNull();
  });

  it('con puesto, quien lo ocupa', () => {
    expect(motivo()).toBeNull();
  });

  it('otro con el mismo permiso no, aunque tenga el rol', () => {
    expect(motivo({ esElOcupante: false })).toBe('NO_ES_TUYO');
  });

  it('sin nadie en el puesto no la hace nadie, y se dice que falta asignarlo', () => {
    expect(motivo({ hayOcupante: false, esElOcupante: false })).toBe('SIN_ASIGNAR');
  });

  it('manda el permiso: ocupar el puesto sin él no basta', () => {
    expect(motivo({ tienePermiso: false })).toBe('SIN_PERMISO');
  });

  it('con personas, solo ellas', () => {
    const regla = { personas: ['persona-1'] };
    expect(motivo({ regla, estaEntreLasPersonas: true })).toBeNull();
    expect(motivo({ regla, estaEntreLasPersonas: false })).toBe('NO_ES_TUYO');
  });

  it('lee la regla guardada y descarta lo vacío', () => {
    expect(leerLaHace({ puestoId: ' p-1 ' })).toEqual({ puestoId: 'p-1' });
    expect(leerLaHace({ personas: ['a', '', 'a'] })).toEqual({ personas: ['a'] });
    expect(leerLaHace({})).toBeNull();
  });

  it('la regla de la modalidad tapa la general', () => {
    const reglas = [
      { numeral: '3.6', modalidad: null, regla: { puestoId: 'general' } },
      { numeral: '3.6', modalidad: 'LICITACION_PUBLICA', regla: { puestoId: 'licitacion' } },
    ];
    expect(laQueRige(reglas, '3.6', 'LICITACION_PUBLICA')).toEqual({ puestoId: 'licitacion' });
    expect(laQueRige(reglas, '3.6', 'MINIMA_CUANTIA')).toEqual({ puestoId: 'general' });
    expect(laQueRige(reglas, '5.1', null)).toBeNull();
  });

  it('la causal y el comité se hacen con «aprobar», como se sembraron; lo demás, editando', () => {
    expect(accionQueHace('3.6')).toBe('aprobar');
    expect(accionQueHace('3.7')).toBe('aprobar');
    expect(accionQueHace('5.1')).toBe('editar');
  });
});
