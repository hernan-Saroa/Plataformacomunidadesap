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
