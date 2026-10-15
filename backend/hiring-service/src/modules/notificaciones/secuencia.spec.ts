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
  const etapa5 = (estadoDeLa54: string | null) => [
    paso('5.1', 'APROBADO'),
    paso('5.2', 'APROBADO'),
    paso('5.4', estadoDeLa54),
    paso('5.3', null),
    paso('5.5', null),
    paso('5.6', null),
  ];

  it('con la publicación hecha, la 5.4, la 5.3 y la 5.5 se abren a la vez', () => {
    expect(porEmpezar(etapa5(null))).toEqual(['5.4', '5.3', '5.5']);
  });

  it('pero la 5.6 sigue esperando a que todas terminen', () => {
    const flujo = etapa5('APROBADO').map((p) =>
      p.numeral === '5.3' ? { ...p, estado: 'APROBADO' } : p,
    );
    expect(actividadesDisponibles(flujo).has('5.6')).toBe(false);
  });

  it('sin la publicación, ninguna de las tres se abre', () => {
    const flujo = etapa5(null).map((p) => (p.numeral === '5.2' ? { ...p, estado: 'BORRADOR' } : p));
    expect(porEmpezar(flujo)).toEqual(['5.2']);
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
