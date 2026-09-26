import { Alcance, alcanceDeLugar, cubre, esDestinoValido, etapaDe, lugarDe, puede } from './alcance';

const todo = (accion: Alcance['accion']): Alcance => ({
  accion,
  etapa: null,
  numeral: null,
  tramite: null,
});
const etapa = (accion: Alcance['accion'], n: number): Alcance => ({
  accion,
  etapa: n,
  numeral: null,
  tramite: null,
});
const punto = (accion: Alcance['accion'], numeral: string): Alcance => ({
  accion,
  etapa: null,
  numeral,
  tramite: null,
});
const tramite = (accion: Alcance['accion'], t: string): Alcance => ({
  accion,
  etapa: null,
  numeral: null,
  tramite: t,
});

/**
 * El permiso dice qué, el alcance dice dónde.
 *
 * Estas pruebas fijan cómo se lee un alcance: el caso que dio origen a la
 * reestructuración es un rol del área Legal que ve la etapa 3, la 4 y solo la
 * 7.2 de la 7, con un único permiso y tres filas.
 */
describe('el alcance de un rol', () => {
  const legal = [etapa('ver', 3), etapa('ver', 4), punto('ver', '7.2')];

  it('el área Legal ve la 3 y la 4 enteras', () => {
    expect(puede(legal, 'ver', '3.1')).toBe(true);
    expect(puede(legal, 'ver', '3.7')).toBe(true);
    expect(puede(legal, 'ver', '4.3')).toBe(true);
  });

  it('y de la 7 solo la 7.2', () => {
    expect(puede(legal, 'ver', '7.2')).toBe(true);
    expect(puede(legal, 'ver', '7.1')).toBe(false);
    expect(puede(legal, 'ver', '7.4')).toBe(false);
  });

  it('ver no le da editar', () => {
    expect(puede(legal, 'editar', '3.1')).toBe(false);
  });

  it('un punto no es un prefijo: la 7.2 no cubre la 7.20', () => {
    // Comparar por texto con startsWith haría que '7.2' abriera '7.20'.
    expect(puede([punto('ver', '7.2')], 'ver', '7.20')).toBe(false);
  });

  it('la etapa 1 no cubre la 10', () => {
    expect(puede([etapa('ver', 1)], 'ver', '10.2')).toBe(false);
  });
});

describe('las acciones', () => {
  it('editar, aprobar o decidir en un punto implican verlo', () => {
    expect(puede([punto('editar', '4.2')], 'ver', '4.2')).toBe(true);
    expect(puede([punto('aprobar', '9.4')], 'ver', '9.4')).toBe(true);
    expect(puede([punto('decidir', '7.4')], 'ver', '7.4')).toBe(true);
  });

  it('pero no implican ver otro punto', () => {
    expect(puede([punto('editar', '4.2')], 'ver', '4.3')).toBe(false);
  });

  it('entre editar, aprobar y decidir no hay jerarquía', () => {
    // En la 9.4 el supervisor avala y la Financiera paga: si decidir
    // implicara aprobar, quien paga podría avalar su propio pago.
    const financiera = [punto('decidir', '9.4')];
    expect(puede(financiera, 'aprobar', '9.4')).toBe(false);
    expect(puede(financiera, 'editar', '9.4')).toBe(false);

    const supervisor = [punto('aprobar', '9.4')];
    expect(puede(supervisor, 'decidir', '9.4')).toBe(false);
  });

  it('sin destino basta con tener la acción en alguna parte', () => {
    expect(puede([punto('ver', '7.2')], 'ver')).toBe(true);
    expect(puede([punto('ver', '7.2')], 'editar')).toBe(false);
    expect(puede([], 'ver')).toBe(false);
  });
});

describe('los lugares', () => {
  it('todo el módulo cubre cualquier destino', () => {
    const a = todo('ver');
    expect(cubre(a, '3.1')).toBe(true);
    expect(cubre(a, 'E10')).toBe(true);
    expect(cubre(a, 'INC.2')).toBe(true);
    expect(cubre(a, 'TODO')).toBe(true);
  });

  it('una etapa entera solo la cubre una fila de esa etapa', () => {
    // Tener la 10.2 no alcanza para el cierre definitivo, que es de toda
    // la etapa 10 y no de uno de sus puntos.
    expect(cubre(punto('editar', '10.2'), 'E10')).toBe(false);
    expect(cubre(etapa('editar', 10), 'E10')).toBe(true);
    expect(cubre(etapa('editar', 9), 'E10')).toBe(false);
  });

  it('TODO solo lo cubre todo el módulo', () => {
    expect(cubre(etapa('ver', 3), 'TODO')).toBe(false);
  });

  it('el incumplimiento no cuelga de la etapa 9', () => {
    // Con la etapa 9 entera, el supervisor que reporta el hecho podría
    // también instruir el trámite sancionatorio.
    expect(cubre(etapa('editar', 9), 'INC.1')).toBe(false);
    expect(cubre(etapa('editar', 9), 'INC.2')).toBe(false);
  });

  it('reportar no es instruir', () => {
    const supervisor = [tramite('editar', 'INC.1')];
    expect(puede(supervisor, 'editar', 'INC.1')).toBe(true);
    expect(puede(supervisor, 'editar', 'INC.2')).toBe(false);
  });

  it('un destino mal escrito no lo cubre nada salvo todo el módulo', () => {
    expect(cubre(etapa('ver', 3), 'tres')).toBe(false);
    expect(cubre(punto('ver', '3.1'), '3.1.1')).toBe(false);
  });
});

describe('etapaDe y esDestinoValido', () => {
  it('sacan la etapa del numeral', () => {
    expect(etapaDe('7.2')).toBe(7);
    expect(etapaDe('10.4')).toBe(10);
    expect(etapaDe('E7')).toBeNull();
  });

  it('reconocen las cuatro formas de destino', () => {
    for (const d of ['4.2', '10.4', 'E10', 'INC.1', 'TODO']) {
      expect(esDestinoValido(d)).toBe(true);
    }
    for (const d of ['', '4', 'E', 'INC.3', '4.2; DROP', 'todo']) {
      expect(esDestinoValido(d)).toBe(false);
    }
  });
});

describe('lugarDe y alcanceDeLugar', () => {
  it('ida y vuelta para las cuatro formas', () => {
    for (const lugar of ['TODO', 'E3', 'E10', '7.2', '10.4', 'INC.1', 'INC.2']) {
      expect(lugarDe(alcanceDeLugar('ver', lugar))).toBe(lugar);
    }
  });

  it('reparte el lugar en su columna', () => {
    expect(alcanceDeLugar('editar', 'E5')).toEqual({ accion: 'editar', etapa: 5, numeral: null, tramite: null });
    expect(alcanceDeLugar('decidir', 'INC.2')).toEqual({ accion: 'decidir', etapa: null, numeral: null, tramite: 'INC.2' });
  });

  it('rechaza lo que no es un lugar', () => {
    expect(() => alcanceDeLugar('ver', 'etapa 3')).toThrow('no es un lugar');
  });
});
