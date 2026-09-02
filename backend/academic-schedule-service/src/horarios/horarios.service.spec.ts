import { HorariosService } from './horarios.service.js';
import { buscarSolapeIntraGrupo, seSolapan, jornadaSugerida } from './solapamiento.js';
import { TIPOS_SESION } from './franja-horaria.entity.js';

/**
 * EFDS-1371 — Horario y calendario del grupo.
 * Un test por criterio de aceptación, más los bordes y los dos esquemas reales.
 */
describe('EFDS-1371 :: horario del grupo', () => {
  const GRUPO = { idGrupo: 'g-1', idAsignatura: '10', numeroGrupo: 1 };

  const montar = (franjasIniciales: any[] = [], grupo: any = GRUPO) => {
    const franjas = [...franjasIniciales];
    const grupos = grupo ? [{ ...grupo }] : [];
    const service = new HorariosService(
      {
        find: jest.fn(({ where }: any) =>
          Promise.resolve(franjas.filter((f) => f.idGrupo === where.idGrupo))),
        findOne: jest.fn(({ where }: any) =>
          Promise.resolve(franjas.find((f) => f.idFranja === where.idFranja) || null)),
        create: jest.fn((d: any) => ({ ...d })),
        save: jest.fn((d: any) => {
          if (!d.idFranja) d.idFranja = `f-${franjas.length + 1}`;
          franjas.push(d);
          return Promise.resolve(d);
        }),
        remove: jest.fn((d: any) => {
          const i = franjas.findIndex((f) => f.idFranja === d.idFranja);
          if (i >= 0) franjas.splice(i, 1);
          return Promise.resolve(d);
        }),
      } as any,
      {
        findOne: jest.fn(({ where }: any) =>
          Promise.resolve(grupos.find((g) => g.idGrupo === where.idGrupo) || null)),
        save: jest.fn((g: any) => Promise.resolve(g)),
      } as any,
    );
    return { service, franjas, grupos };
  };

  const sesion = (over: any = {}) => ({
    idGrupo: 'g-1', diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00', ...over,
  });

  it('EFDS-1371 :: AC-01 :: se configuran jornada, día, horas y tipo de la sesión', async () => {
    const { service } = montar();

    const f = await service.crearSesion(sesion({ jornada: 'DIURNA', tipoSesion: 'presencial' }));

    expect(f.diaSemana).toBe('LUNES');
    expect(f.horaInicio).toBe('11:00');
    expect(f.horaFin).toBe('13:00');
    expect(f.jornada).toBe('DIURNA');
    expect(f.tipoSesion).toBe('presencial');
  });

  it('EFDS-1371 :: AC-01 :: periodo con fecha fin anterior a inicio es rechazado', async () => {
    const { service } = montar();

    await expect(
      service.definirPeriodo('g-1', { fechaInicio: '2026-08-01', fechaFin: '2026-07-01' }),
    ).rejects.toThrow(/no puede ser anterior/i);
  });

  it('EFDS-1371 :: AC-01 :: el periodo del grupo se define y queda en el grupo', async () => {
    const { service } = montar();

    const g: any = await service.definirPeriodo('g-1', {
      fechaInicio: '2026-02-02', fechaFin: '2026-06-12',
    });

    expect(g.fechaInicio).toBe('2026-02-02');
    expect(g.fechaFin).toBe('2026-06-12');
  });

  it('EFDS-1371 :: AC-02 :: la sesión registra tipo presencial', async () => {
    const { service } = montar();
    const f = await service.crearSesion(sesion({ tipoSesion: 'presencial' }));
    expect(f.tipoSesion).toBe('presencial');
  });

  it('EFDS-1371 :: AC-02 :: la sesión registra tipo mediada por tecnología', async () => {
    const { service } = montar();
    const f = await service.crearSesion(sesion({ tipoSesion: 'mediada_tecnologia' }));
    expect(f.tipoSesion).toBe('mediada_tecnologia');
  });

  // ⚠️ EL TEST ANTIFUSIÓN. `tipo_sesion` lo define el programador por sesión;
  // `asignatura.modalidad` es dato maestro del SNIES en otro esquema. Confundirlos
  // rompe el cálculo de comisiones en la fase 3.
  it('EFDS-1371 :: AC-02 :: tipo_sesion es independiente de modalidad_asignatura', async () => {
    const { service } = montar();

    // Una asignatura VIRTUAL puede dictar sesiones PRESENCIALES.
    const f = await service.crearSesion(sesion({ tipoSesion: 'presencial' }));

    expect(f.tipoSesion).toBe('presencial');
    // La franja no expone ni deriva la modalidad de la asignatura.
    expect(Object.keys(f)).not.toContain('modalidad');
    expect(TIPOS_SESION).not.toContain('virtual' as any);
    expect(TIPOS_SESION).toEqual(['presencial', 'mediada_tecnologia']);
  });

  it('EFDS-1371 :: AC-03 :: se acepta una franja de domingo', async () => {
    const { service } = montar();
    const f = await service.crearSesion(sesion({ diaSemana: 'DOMINGO', horaInicio: '08:00', horaFin: '14:00' }));
    expect(f.diaSemana).toBe('DOMINGO');
    expect(f.jornada).toBe('FIN_DE_SEMANA');
  });

  // "Sin intervalos fijos predefinidos": descarta la grilla de bloques cerrados.
  it('EFDS-1371 :: AC-03 :: se acepta una franja de 11:05 a 12:35', async () => {
    const { service } = montar();
    const f = await service.crearSesion(sesion({ horaInicio: '11:05', horaFin: '12:35' }));
    expect(f.horaInicio).toBe('11:05');
    expect(f.horaFin).toBe('12:35');
  });

  it('EFDS-1371 :: solapamiento intra-grupo es rechazado', async () => {
    const { service } = montar();
    await service.crearSesion(sesion({ horaInicio: '11:00', horaFin: '13:00' }));

    await expect(
      service.crearSesion(sesion({ horaInicio: '12:00', horaFin: '14:00' })),
    ).rejects.toThrow(/se cruza con otra del mismo grupo/i);
  });

  it('EFDS-1371 :: dos sesiones consecutivas NO se consideran solape', async () => {
    const { service } = montar();
    await service.crearSesion(sesion({ horaInicio: '08:00', horaFin: '10:00' }));

    // Tocarse en el extremo no es coincidir en el tiempo.
    const f = await service.crearSesion(sesion({ horaInicio: '10:00', horaFin: '12:00' }));
    expect(f.horaInicio).toBe('10:00');
  });

  it('EFDS-1371 :: la hora de fin debe ser posterior a la de inicio', async () => {
    const { service } = montar();
    await expect(
      service.crearSesion(sesion({ horaInicio: '13:00', horaFin: '11:00' })),
    ).rejects.toThrow(/posterior a la de inicio/i);
  });

  // Esquema real del levantamiento: AP semanal en dos días distintos.
  it('EFDS-1371 :: esquema AP :: lunes 11:00-13:00 y jueves 14:00-16:00', async () => {
    const { service } = montar();

    const lunes = await service.crearSesion(sesion({ diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' }));
    const jueves = await service.crearSesion(sesion({ diaSemana: 'JUEVES', horaInicio: '14:00', horaFin: '16:00' }));

    expect(lunes.jornada).toBe('DIURNA');
    expect(jueves.jornada).toBe('DIURNA');
    const todas = await service.listarPorGrupo('g-1');
    expect(todas).toHaveLength(2);
  });

  // Esquema real del levantamiento: APT concentra sábado y domingo.
  it('EFDS-1371 :: esquema APT :: sesiones de sábado y domingo en el periodo', async () => {
    const { service } = montar();

    await service.definirPeriodo('g-1', { fechaInicio: '2026-03-07', fechaFin: '2026-04-05' });
    const sab = await service.crearSesion(sesion({ diaSemana: 'SABADO', horaInicio: '08:00', horaFin: '17:00' }));
    const dom = await service.crearSesion(sesion({ diaSemana: 'DOMINGO', horaInicio: '08:00', horaFin: '13:00' }));

    expect(sab.jornada).toBe('FIN_DE_SEMANA');
    expect(dom.jornada).toBe('FIN_DE_SEMANA');
  });

  it('EFDS-1371 :: crear sesión sobre un grupo inexistente es rechazado', async () => {
    const { service } = montar([], null);
    await expect(service.crearSesion(sesion())).rejects.toThrow(/grupo no existe/i);
  });
});

describe('EFDS-1371 :: reglas de tiempo aisladas', () => {
  it('el solape se detecta solo dentro del mismo día', () => {
    expect(seSolapan('11:00', '13:00', '12:00', '14:00')).toBe(true);
    expect(seSolapan('08:00', '10:00', '10:00', '12:00')).toBe(false);
    expect(buscarSolapeIntraGrupo(
      { diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' },
      [{ diaSemana: 'MARTES', horaInicio: '11:00', horaFin: '13:00' }],
    )).toBeNull();
  });

  it('al editar una franja no se compara contra sí misma', () => {
    expect(buscarSolapeIntraGrupo(
      { idFranja: 'f-1', diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' },
      [{ idFranja: 'f-1', diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' }],
    )).toBeNull();
  });

  it('la jornada sugerida distingue diurna, nocturna y fin de semana', () => {
    expect(jornadaSugerida('LUNES', '08:00')).toBe('DIURNA');
    expect(jornadaSugerida('LUNES', '18:00')).toBe('NOCTURNA');
    expect(jornadaSugerida('SABADO', '08:00')).toBe('FIN_DE_SEMANA');
  });
});
