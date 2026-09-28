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
  it('son las ocho que ninguna historia recogió y siguen sin pantalla propia', () => {
    // Eran catorce. De la etapa 3 fueron saliendo cinco: radicar es recibir el
    // proceso (3.3); la 3.4 es la decisión del abogado sobre el estudio previo;
    // la 3.5 es ratificar la modalidad; la 3.6 es elegir la causal del catálogo
    // de esa modalidad; y la 3.7 es lo que decidió el comité, que son tres
    // desenlaces. Ninguna cabe en una fecha y un documento. La sexta, la 3.2,
    // se entrega con el estudio previo (migración 090).
    expect([...NUMERALES_CON_REGISTRO]).toEqual([
      '5.9',
      '5.10',
      '5.11',
      '6.7',
      '6.8',
      '6.9',
      '6.10',
      '8.6',
    ]);
  });

  it('acepta una de cada etapa', () => {
    expect(admiteRegistro('5.10')).toBe(true);
    expect(admiteRegistro('6.10')).toBe(true);
    expect(admiteRegistro('8.6')).toBe(true);
  });

  it('de la 3.3 a la 3.7 ya no: se resuelven en otro sitio', () => {
    // Y no por conveniencia: mientras estuvieron aquí, radicar era anotar una
    // fecha —el proceso no cambiaba de manos por eso—, la revisión se daba por
    // cumplida sin que nadie hubiera decidido nada, la causal quedaba escrita
    // en prosa sin poder filtrarse por modalidad, y el comité cerraba la
    // actividad en APROBADO aunque hubiera observado los documentos.
    expect(admiteRegistro('3.3')).toBe(false);
    expect(admiteRegistro('3.4')).toBe(false);
    expect(admiteRegistro('3.5')).toBe(false);
    expect(admiteRegistro('3.6')).toBe(false);
    expect(admiteRegistro('3.7')).toBe(false);
  });

  it('el análisis del sector ya no es un registro: se entrega con la 3.1', () => {
    // Sus dos documentos pasaron a la lista de chequeo del estudio previo
    // (migración 090) y la actividad se desactivó.
    expect(admiteRegistro('3.2')).toBe(false);
  });

  it('no se lleva por delante las vecinas de la etapa 8', () => {
    // La 8.6 entra por registro, pero está rodeada de actividades que sí
    // tienen trámite: la ARL antes y el acta de inicio después. Que una etapa
    // aporte una a la lista no la abre entera.
    expect(admiteRegistro('8.5')).toBe(false);
    expect(admiteRegistro('8.7')).toBe(false);
    expect(admiteRegistro('8.8')).toBe(false);
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
