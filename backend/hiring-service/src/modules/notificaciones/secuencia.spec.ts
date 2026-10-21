import { actividadesDisponibles, PasoDelFlujo, porEmpezar } from './secuencia';

/**
 * La secuencia del riel, en el servidor (EFDS-1183).
 *
 * Son los mismos casos que prueba la pantalla: si esta regla y la del riel se
 * separan, el aviso de «te toca» miente sobre lo que la pantalla deja trabajar.
 */
const paso = (numeral: string, estado: string | null, extra: Partial<PasoDelFlujo> = {}): PasoDelFlujo => ({
  numeral,
  estado,
  aplica: true,
  construida: true,
  ...extra,
});

describe('secuencia · qué se puede trabajar', () => {
  it('al empezar solo está la primera', () => {
    expect([...actividadesDisponibles([paso('3.1', null), paso('3.2', null)])]).toEqual(['3.1']);
  });

  it('aprobar una abre la siguiente', () => {
    expect(porEmpezar([paso('3.1', 'APROBADO'), paso('3.2', null), paso('3.3', null)])).toEqual(['3.2']);
  });

  it('lo que la modalidad excluye o no tiene pantalla no detiene a nadie', () => {
    const flujo = [
      paso('4.1', 'APROBADO'),
      paso('4.2', null, { aplica: false }),
      paso('5.8', null, { construida: false }),
      paso('5.9', null),
    ];
    expect([...actividadesDisponibles(flujo)]).toEqual(['4.1', '5.9']);
  });

  it('a la sin pantalla también le toca a alguien cuando el proceso llega a ella', () => {
    // Se hace fuera de la plataforma, pero ocurre: quien la hace tiene que saberlo.
    const flujo = [
      paso('4.1', 'APROBADO'),
      paso('4.2', null, { aplica: false }),
      paso('5.8', null, { construida: false }),
      paso('5.9', null),
    ];
    expect(porEmpezar(flujo)).toEqual(['5.8', '5.9']);
  });

  it('a la sin pantalla no le toca mientras el proceso no llegue', () => {
    const flujo = [paso('4.1', 'BORRADOR'), paso('5.8', null, { construida: false }), paso('5.9', null)];
    expect(porEmpezar(flujo)).toEqual(['4.1']);
  });

  it('la 3.4 no le toca a nadie por la secuencia: le toca al abogado cuando se lo asignan', () => {
    const flujo = [
      paso('3.1', 'EN_REVISION'),
      paso('3.3', null),
      paso('3.4', null, { construida: false }),
    ];
    expect(porEmpezar(flujo)).toEqual(['3.3']);
  });

  it('enviar el estudio previo abre la 3.3 y la 3.4, y nada más', () => {
    const flujo = [paso('3.1', 'EN_REVISION'), paso('3.2', null), paso('3.3', null), paso('3.4', null)];
    expect([...actividadesDisponibles(flujo)].sort()).toEqual(['3.1', '3.3']);
  });

  it('no avisa «te toca» de lo que ya espera revisión o fue devuelto', () => {
    // Esas tienen su propio aviso; decir «empiézala» sería repetir o confundir.
    const flujo = [paso('4.1', 'APROBADO'), paso('4.2', 'EN_REVISION')];
    expect(porEmpezar(flujo)).toEqual([]);
    expect(porEmpezar([paso('4.1', 'APROBADO'), paso('4.2', 'DEVUELTO')])).toEqual([]);
  });

  it('un borrador empezado todavía es «por empezar»: nadie lo ha entregado', () => {
    expect(porEmpezar([paso('4.1', 'APROBADO'), paso('4.2', 'BORRADOR')])).toEqual(['4.2']);
  });
});

describe('secuencia · dependencias declaradas, como en el riel', () => {
  /** La etapa 5 de la matriz (112), con la publicación en SECOP II hecha. */
  const etapa5 = (estados: Record<string, string | null> = {}) =>
    [
      ['5.1', 'APROBADO'],
      ['5.2', 'APROBADO'],
      ['5.3', 'APROBADO'],
      ['5.4', null],
      ['5.5', null],
      ['5.6', null],
      ['5.7', null],
      ['5.12', null],
      ['5.13', null],
      ['6.1', null],
    ].map(([numeral, estado]) =>
      paso(numeral as string, numeral! in estados ? estados[numeral!] : (estado as string | null)),
    );

  const todoHastaLaApertura = {
    '5.4': 'APROBADO',
    '5.5': 'APROBADO',
    '5.6': 'APROBADO',
    '5.7': 'APROBADO',
  };

  it('con la publicación hecha, la web, MiPymes y observaciones se abren a la vez', () => {
    expect(porEmpezar(etapa5())).toEqual(['5.4', '5.5', '5.6']);
  });

  it('pero la apertura sigue esperando a que todas terminen', () => {
    const flujo = etapa5({ '5.4': 'APROBADO', '5.5': 'APROBADO' });
    expect(actividadesDisponibles(flujo).has('5.7')).toBe(false);
  });

  it('sin la publicación, ninguna de las tres se abre', () => {
    expect(porEmpezar(etapa5({ '5.3': 'BORRADOR' }))).toEqual(['5.3']);
  });

  it('las adendas no se abren antes de la apertura', () => {
    expect(actividadesDisponibles(etapa5()).has('5.13')).toBe(false);
  });

  it('abierto el proceso, la audiencia y las adendas se abren a la vez', () => {
    expect(porEmpezar(etapa5(todoHastaLaApertura))).toEqual(['5.12', '5.13']);
  });

  it('la audiencia detiene la recepción de ofertas; las adendas no', () => {
    const sinAudiencia = etapa5({ ...todoHastaLaApertura, '5.13': 'BORRADOR' });
    expect(actividadesDisponibles(sinAudiencia).has('6.1')).toBe(false);

    const conAudiencia = etapa5({ ...todoHastaLaApertura, '5.12': 'APROBADO', '5.13': 'BORRADOR' });
    expect(actividadesDisponibles(conAudiencia).has('6.1')).toBe(true);
  });

  it('las modificaciones (9.5) se abren con el acta de inicio, sin esperar los pagos', () => {
    const flujo = [
      paso('9.1', 'APROBADO'),
      paso('9.2', 'BORRADOR'),
      paso('9.3', 'BORRADOR'),
      paso('9.4', null),
      paso('9.5', null),
    ];
    expect(porEmpezar(flujo)).toEqual(['9.2', '9.3', '9.4', '9.5']);
  });

  it('el seguimiento y la reasignación, siempre abiertos, no detienen la etapa 10', () => {
    const flujo = [
      paso('9.1', 'APROBADO'),
      paso('9.2', 'BORRADOR'),
      paso('9.3', 'BORRADOR'),
      paso('9.4', 'APROBADO'),
      paso('9.5', null),
      paso('10.1', null),
    ];
    expect(actividadesDisponibles(flujo).has('10.1')).toBe(true);
  });

  it('tampoco detienen el aviso a una sin pantalla que viene después', () => {
    const flujo = [
      paso('9.1', 'APROBADO'),
      paso('9.2', 'BORRADOR'),
      paso('9.3', 'BORRADOR'),
      paso('9.4', 'APROBADO'),
      paso('9.5', null),
      paso('10.1', null, { construida: false }),
    ];
    expect(porEmpezar(flujo)).toContain('10.1');
  });
});

/**
 * La secuencia configurable (125): cada versión del flujo dice, por actividad
 * y modalidad, de qué depende y si detiene a las siguientes.
 */
describe('secuencia · configurada en la versión del flujo', () => {
  it('sin nada en la versión rige lo predeterminado: 5.5 solo espera a la 5.3', () => {
    const flujo = [paso('5.3', 'APROBADO'), paso('5.4', null), paso('5.5', null)];
    expect([...actividadesDisponibles(flujo)]).toEqual(['5.3', '5.4', '5.5']);
  });

  it('una que no detiene el flujo deja pasar a la siguiente aunque siga abierta', () => {
    // 8.8 en paralelo: si no se publica, igual arranca la reunión de inicio.
    const flujo = [
      paso('8.7', 'APROBADO'),
      paso('8.8', null, { secuencia: { dependeDe: ['8.1'], noBloquea: true } }),
      paso('9.1', null),
    ];
    expect([...actividadesDisponibles(flujo)]).toEqual(['8.7', '8.8', '9.1']);
  });

  it('la misma, sin la configuración, detiene a la 9.1 como antes', () => {
    const flujo = [paso('8.7', 'APROBADO'), paso('8.8', null), paso('9.1', null)];
    expect([...actividadesDisponibles(flujo)]).toEqual(['8.7', '8.8']);
  });

  it('depender de una anterior la abre aunque la de en medio siga abierta', () => {
    // 10.4 archiva sobre la liquidación: no espera al cierre financiero.
    const flujo = [
      paso('10.2', 'APROBADO'),
      paso('10.3', null),
      paso('10.4', null, { secuencia: { dependeDe: ['10.2'], noBloquea: false } }),
    ];
    expect([...actividadesDisponibles(flujo)]).toEqual(['10.2', '10.3', '10.4']);
  });

  it('una dependencia que no aplica se cumple al llegar a ella, no desde el primer día', () => {
    const cronograma = paso('5.2', null, { secuencia: { dependeDe: ['4.2'], noBloquea: false } });
    const antes = [paso('3.7', null), paso('4.2', null, { aplica: false }), paso('5.1', null), cronograma];
    expect(actividadesDisponibles(antes).has('5.2')).toBe(false);

    const despues = [paso('3.7', 'APROBADO'), paso('4.2', null, { aplica: false }), paso('5.1', null), cronograma];
    expect([...actividadesDisponibles(despues)]).toEqual(['3.7', '5.1', '5.2']);
  });

  it('el «te toca» también la avisa en cuanto se abre', () => {
    const flujo = [
      paso('10.2', 'APROBADO'),
      paso('10.3', null),
      paso('10.4', null, { secuencia: { dependeDe: ['10.2'], noBloquea: false } }),
    ];
    expect(porEmpezar(flujo)).toEqual(['10.3', '10.4']);
  });
});
