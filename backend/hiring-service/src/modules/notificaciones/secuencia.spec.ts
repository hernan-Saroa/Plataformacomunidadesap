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
