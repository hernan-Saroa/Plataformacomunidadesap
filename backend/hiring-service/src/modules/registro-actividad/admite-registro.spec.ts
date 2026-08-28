import {
  NUMERALES_CON_REGISTRO,
  admiteRegistro,
  faltaParaRegistrar,
} from './admite-registro';

const HOY = '2026-08-27';

const base = {
  fecha: HOY,
  nota: 'Se adelantó el sorteo en la Dirección de Contratación con los tres oferentes.',
  tieneSoporte: true,
  exigeSoporte: true,
  hoy: HOY,
};

describe('admiteRegistro · qué actividades se cumplen dejando constancia', () => {
  it('son las once que ninguna historia recogió', () => {
    expect([...NUMERALES_CON_REGISTRO]).toEqual([
      '3.2',
      '3.3',
      '3.4',
      '3.5',
      '5.9',
      '5.10',
      '5.11',
      '6.7',
      '6.8',
      '6.9',
      '6.10',
    ]);
  });

  it('acepta una de cada etapa', () => {
    expect(admiteRegistro('3.3')).toBe(true);
    expect(admiteRegistro('5.10')).toBe(true);
    expect(admiteRegistro('6.10')).toBe(true);
  });

  it('rechaza las que ya tienen su propio trámite', () => {
    // La 5.7 es la apertura del proceso (EFDS-1152) y la 9.1 la reunión de
    // inicio (EFDS-1167): tienen pantalla, reglas y estado propios. Dejar que
    // se cumplieran por registro sería una puerta de atrás a esas reglas.
    const conTramitePropio = ['3.1', '5.1', '5.7', '6.1', '7.3', '9.1', '10.4'];
    expect(conTramitePropio.map(admiteRegistro)).toEqual(conTramitePropio.map(() => false));
  });

  it('no confunde 5.1 con 5.10 ni 6.1 con 6.10', () => {
    // El numeral es texto y la comparación es exacta: '5.1' no es prefijo de
    // '5.10' para estos efectos.
    expect(admiteRegistro('5.1')).toBe(false);
    expect(admiteRegistro('5.10')).toBe(true);
    expect(admiteRegistro('6.1')).toBe(false);
    expect(admiteRegistro('6.10')).toBe(true);
  });
});

describe('faltaParaRegistrar · qué le falta al registro para guardarse', () => {
  it('deja pasar el registro completo', () => {
    expect(faltaParaRegistrar(base)).toBeNull();
  });

  it('exige la nota de trazabilidad', () => {
    expect(faltaParaRegistrar({ ...base, nota: '' })).toMatch(/nota de trazabilidad/i);
  });

  it('no acepta una nota de solo espacios', () => {
    expect(faltaParaRegistrar({ ...base, nota: '   ' })).toMatch(/nota de trazabilidad/i);
  });

  it('exige la fecha del hecho', () => {
    expect(faltaParaRegistrar({ ...base, fecha: '' })).toMatch(/falta la fecha/i);
  });

  it('no registra lo que todavía no ha pasado', () => {
    expect(faltaParaRegistrar({ ...base, fecha: '2026-08-28' })).toMatch(/posterior a hoy/i);
  });

  it('admite transcribir días después', () => {
    // El caso normal: el sorteo se hizo el lunes y se transcribe el jueves.
    expect(faltaParaRegistrar({ ...base, fecha: '2026-08-20' })).toBeNull();
  });

  it('exige el soporte cuando la actividad lo pide', () => {
    expect(faltaParaRegistrar({ ...base, tieneSoporte: false })).toMatch(/soporte/i);
  });

  it('no lo exige cuando no lo pide', () => {
    // La 5.9 es «campo para nota de trazabilidad»: la matriz no pide adjunto.
    expect(
      faltaParaRegistrar({ ...base, exigeSoporte: false, tieneSoporte: false }),
    ).toBeNull();
  });

  it('la nota se revisa antes que la fecha', () => {
    // Con las dos mal, el mensaje habla de lo primero que hay que llenar: ir
    // corrigiendo de a un error por intento es lo que hace odiosos estos
    // formularios.
    expect(faltaParaRegistrar({ ...base, nota: '', fecha: '' })).toMatch(/nota/i);
  });
});
