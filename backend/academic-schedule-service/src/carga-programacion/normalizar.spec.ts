import {
  normalizarDia, normalizarFecha, normalizarFila, normalizarHora, normalizarModalidad, normalizarTipoOferta, normalizarTipoSesion,
} from './normalizar.js';

describe('Plantilla de programación :: normalizar lo que escribe una persona en Excel', () => {
  it('días con tildes y minúsculas; lo desconocido no se adivina', () => {
    expect(normalizarDia('miércoles')).toBe('MIERCOLES');
    expect(normalizarDia(' Sábado ')).toBe('SABADO');
    expect(normalizarDia('DOMINGO')).toBe('DOMINGO');
    expect(normalizarDia('Lun')).toBeNull();
    expect(normalizarDia('')).toBeNull();
  });

  it('horas en 24 h y en formato a. m./p. m.', () => {
    expect(normalizarHora('8:00')).toBe('08:00');
    expect(normalizarHora('08:00:00')).toBe('08:00');
    expect(normalizarHora('8:00 a. m.')).toBe('08:00');
    expect(normalizarHora('12:00 p. m.')).toBe('12:00');
    expect(normalizarHora('12:30 a.m.')).toBe('00:30');
    expect(normalizarHora('2:30 p.m.')).toBe('14:30');
    expect(normalizarHora('25:00')).toBeNull();
    expect(normalizarHora('13:00 pm')).toBeNull();
    expect(normalizarHora('ocho')).toBeNull();
  });

  it('fechas ISO o DD/MM/AAAA; una fecha imposible es error, vacía es «sin fecha»', () => {
    expect(normalizarFecha('2026-02-15')).toBe('2026-02-15');
    expect(normalizarFecha('2026-02-15T00:00:00.000Z')).toBe('2026-02-15');
    expect(normalizarFecha('5/2/2026')).toBe('2026-02-05');
    expect(normalizarFecha('')).toBeNull();
    expect(normalizarFecha('2026-02-30')).toBeUndefined();
    expect(normalizarFecha('mañana')).toBeUndefined();
  });

  it('oferta, modalidad y tipo de sesión con los nombres del Excel de la ESAP', () => {
    expect(normalizarTipoOferta('OFERTA REGULAR')).toBeNull(); // = periodo_regular
    expect(normalizarTipoOferta('')).toBeNull();
    expect(normalizarTipoOferta('Interperiodo')).toBe('interperiodo');
    expect(normalizarTipoOferta('créditos virtual')).toBe('creditos_virtual');
    expect(normalizarTipoOferta('especial')).toBeUndefined();
    expect(normalizarModalidad('Distancia')).toBe('distancia');
    expect(normalizarModalidad('mixta')).toBeUndefined();
    expect(normalizarTipoSesion('Mediada por tecnología')).toBe('mediada_tecnologia');
    expect(normalizarTipoSesion('PRESENCIAL')).toBe('presencial');
    expect(normalizarTipoSesion('otra')).toBeUndefined();
  });

  const base = { fila: 5, codigoAsignatura: 'asig-00003', grupo: '1', dia: 'Lunes', horaInicio: '8:00', horaFin: '10:00' };

  it('fila mínima válida: periodo regular, sin docente', () => {
    const r = normalizarFila(base);
    expect(r.errores).toEqual([]);
    expect(r.fila).toMatchObject({
      fila: 5, codigoAsignatura: 'ASIG-00003', grupo: 1, tipoOferta: 'periodo_regular',
      sesion: { dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00', tipoSesion: null, aula: null }, documentoDocente: null,
    });
  });

  it('el documento del docente se limpia (puntos, espacios, «.0» de Excel)', () => {
    expect(normalizarFila({ ...base, documentoDocente: '52.336.004' }).fila?.documentoDocente).toBe('52336004');
    expect(normalizarFila({ ...base, documentoDocente: 52336004.0 }).fila?.documentoDocente).toBe('52336004');
    expect(normalizarFila({ ...base, documentoDocente: '5233 6004.0' }).fila?.documentoDocente).toBe('52336004');
  });

  it('devuelve TODOS los errores de la fila, no solo el primero', () => {
    const r = normalizarFila({ fila: 9, grupo: 'A', dia: 'Lun', horaInicio: '8', horaFin: '' , fechaInicio: '2026-02-01' });
    expect(r.fila).toBeUndefined();
    expect(r.errores).toEqual(expect.arrayContaining([
      'Falta el código de la asignatura.',
      expect.stringContaining('El grupo «A»'),
      expect.stringContaining('Día «Lun»'),
      expect.stringContaining('Hora de inicio «8»'),
      expect.stringContaining('Hora de fin «»'),
      'Indique las dos fechas del grupo (inicio y fin) o ninguna.',
    ]));
  });

  it('sin día ni horas: solo un grupo virtual o a distancia', () => {
    const sinHorario = { fila: 3, codigoAsignatura: 'ASIG-1', grupo: 2 };
    expect(normalizarFila(sinHorario).errores[0]).toMatch(/Falta el día y las horas/);
    const r = normalizarFila({ ...sinHorario, modalidad: 'Virtual', documentoDocente: '123456' });
    expect(r.errores).toEqual([]);
    expect(r.fila).toMatchObject({ modalidad: 'virtual', sesion: null, documentoDocente: '123456' });
  });

  it('fechas del grupo invertidas: error', () => {
    expect(normalizarFila({ ...base, fechaInicio: '2026-05-01', fechaFin: '2026-02-01' }).errores)
      .toContain('La fecha de fin del grupo es anterior a la de inicio.');
  });
});
