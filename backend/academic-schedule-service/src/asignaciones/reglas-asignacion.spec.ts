import {
  buscarCruceTransversal,
  cumpleEscalafonParaMaestria,
  evaluarAsignacion,
  periodoDentroDeVinculacion,
  type DocenteParaAsignar,
  type GrupoParaAsignar,
} from './reglas-asignacion.js';

/**
 * EFDS-1372 — Bloqueo duro de asignación.
 *
 * ⚠️ El error aquí es ASIMÉTRICO: un rechazo de más se nota porque alguien se
 * queja; una asignación que debía rechazarse no se nota hasta que hay dos clases
 * a la misma hora. Por eso hay más pruebas del rechazo que del camino feliz.
 */
describe('EFDS-1372 :: bloqueo duro', () => {
  const docenteBase = (over: Partial<DocenteParaAsignar> = {}): DocenteParaAsignar => ({
    idDocente: 'per-1',
    nombre: 'DOCENTE DE PRUEBA',
    escalafon: 'Titular',
    horasPta: 800,
    vinculacionDesde: '2026-01-15',
    vinculacionHasta: null, // indefinida
    situacionAsignable: true,
    situacionMotivo: null,
    ...over,
  });

  const grupoBase = (over: Partial<GrupoParaAsignar> = {}): GrupoParaAsignar => ({
    idGrupo: 'g-1',
    tipoPrograma: 'pregrado',
    fechaInicio: '2026-02-02',
    fechaFin: '2026-06-12',
    franjas: [{ diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' }],
    horasRequeridas: 192,
    ...over,
  });

  it('EFDS-1372 :: AC :: un docente sin impedimentos se puede asignar', () => {
    expect(evaluarAsignacion(docenteBase(), grupoBase(), [], 0)).toEqual([]);
  });

  it('EFDS-1372 :: situación administrativa :: docente no asignable es rechazado', () => {
    const motivos = evaluarAsignacion(
      docenteBase({ situacionAsignable: false, situacionMotivo: 'El docente se encuentra en año sabático hasta el 2026-10-01' }),
      grupoBase(), [], 0,
    );
    expect(motivos).toHaveLength(1);
    expect(motivos[0].regla).toBe('situacion_administrativa');
    // El mensaje debe decir la razón, no ser un rechazo genérico.
    expect(motivos[0].mensaje).toMatch(/año sabático/i);
  });

  // RN-12 — Art. 77 par. 2.
  it('EFDS-1372 :: RN-12 :: en maestría solo Asociado o Titular', () => {
    for (const e of ['Asociado', 'Titular', 'ASOCIADO', 'titular']) {
      expect(cumpleEscalafonParaMaestria('maestria', e)).toBe(true);
    }
    for (const e of ['Auxiliar', 'Asistente']) {
      expect(cumpleEscalafonParaMaestria('maestria', e)).toBe(false);
    }
    // En los demás niveles el escalafón no restringe.
    expect(cumpleEscalafonParaMaestria('pregrado', 'Auxiliar')).toBe(true);
    expect(cumpleEscalafonParaMaestria('especializacion', 'Asistente')).toBe(true);
  });

  it('EFDS-1372 :: RN-12 :: escalafón sin registrar NO habilita maestría', () => {
    // Fail-closed: no se puede afirmar que cumpla.
    expect(cumpleEscalafonParaMaestria('maestria', null)).toBe(false);
    expect(cumpleEscalafonParaMaestria('maestria', '')).toBe(false);
  });

  // RN-10 — las fechas de vinculación acotan el periodo programable.
  it('EFDS-1372 :: RN-10 :: vinculación indefinida no tiene límite superior', () => {
    // 104 de los 263 docentes son indefinidos: tratarlo como fecha faltante
    // rechazaría a casi la mitad de la planta.
    const r = periodoDentroDeVinculacion(
      { fechaInicio: '2026-02-02', fechaFin: '2030-12-31' },
      { vinculacionDesde: '2009-05-28', vinculacionHasta: null },
    );
    expect(r.cumple).toBe(true);
  });

  it('EFDS-1372 :: RN-10 :: el grupo no puede exceder el fin de vinculación', () => {
    const r = periodoDentroDeVinculacion(
      { fechaInicio: '2026-02-02', fechaFin: '2026-06-12' },
      { vinculacionDesde: '2026-01-20', vinculacionHasta: '2026-05-30' },
    );
    expect(r.cumple).toBe(false);
    expect(r.motivo).toContain('2026-05-30');
  });

  it('EFDS-1372 :: RN-10 :: el grupo no puede iniciar antes de la vinculación', () => {
    const r = periodoDentroDeVinculacion(
      { fechaInicio: '2026-01-10', fechaFin: '2026-06-12' },
      { vinculacionDesde: '2026-01-20', vinculacionHasta: null },
    );
    expect(r.cumple).toBe(false);
  });

  it('EFDS-1372 :: RN-10 :: un grupo sin periodo definido NO se puede validar', () => {
    // Fail-closed: no hay forma de afirmar que cae dentro del rango.
    const r = periodoDentroDeVinculacion(
      { fechaInicio: null, fechaFin: null },
      { vinculacionDesde: '2020-01-01', vinculacionHasta: null },
    );
    expect(r.cumple).toBe(false);
  });

  // RN-07 — cruce transversal, en cualquier programa o nivel.
  it('EFDS-1372 :: RN-07 :: se detecta el cruce con un grupo de OTRO programa', () => {
    const cruce = buscarCruceTransversal(
      [{ diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' }],
      [{ idGrupo: 'g-posgrado', diaSemana: 'LUNES', horaInicio: '12:00', horaFin: '14:00' }],
      'g-1',
    );
    expect(cruce).not.toBeNull();
    expect(cruce!.idGrupo).toBe('g-posgrado');
  });

  it('EFDS-1372 :: RN-07 :: el mensaje NO revela qué asignatura ocupa la franja', () => {
    const motivos = evaluarAsignacion(
      docenteBase(), grupoBase(),
      [{ idGrupo: 'g-posgrado', diaSemana: 'LUNES', horaInicio: '12:00', horaFin: '14:00' }],
      0,
    );
    const rn07 = motivos.find((m) => m.regla === 'RN-07')!;
    expect(rn07).toBeDefined();
    // Confidencialidad entre decanaturas: día y hora sí, identidad del grupo no.
    expect(rn07.mensaje).toMatch(/lunes/i);
    expect(rn07.mensaje).not.toContain('g-posgrado');
  });

  it('EFDS-1372 :: RN-07 :: el propio grupo no cuenta como cruce consigo mismo', () => {
    const cruce = buscarCruceTransversal(
      [{ diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' }],
      [{ idGrupo: 'g-1', diaSemana: 'LUNES', horaInicio: '11:00', horaFin: '13:00' }],
      'g-1',
    );
    expect(cruce).toBeNull();
  });

  it('EFDS-1372 :: RN-07 :: dos franjas consecutivas no son cruce', () => {
    const cruce = buscarCruceTransversal(
      [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
      [{ idGrupo: 'g-otro', diaSemana: 'LUNES', horaInicio: '10:00', horaFin: '12:00' }],
      'g-1',
    );
    expect(cruce).toBeNull();
  });

  // RN-04 / RN-05 — topes de horas.
  it('EFDS-1372 :: RN-04 :: exceder el tope del docente es rechazado', () => {
    const motivos = evaluarAsignacion(
      docenteBase({ horasPta: 800 }),
      grupoBase({ horasRequeridas: 192 }),
      [], 700, // 700 + 192 = 892 > 800
    );
    const tope = motivos.find((m) => m.regla === 'RN-04/RN-05')!;
    expect(tope).toBeDefined();
    expect(tope.mensaje).toContain('892');
    expect(tope.mensaje).toContain('800');
  });

  it('EFDS-1372 :: RN-05 :: el tope depende del régimen, no es un número fijo', () => {
    // Acuerdo 009/2004 son 720 h: lo que cabe en 800 no necesariamente cabe aquí.
    const en800 = evaluarAsignacion(docenteBase({ horasPta: 800 }), grupoBase({ horasRequeridas: 100 }), [], 650);
    const en720 = evaluarAsignacion(docenteBase({ horasPta: 720 }), grupoBase({ horasRequeridas: 100 }), [], 650);

    expect(en800).toEqual([]);
    expect(en720.some((m) => m.regla === 'RN-04/RN-05')).toBe(true);
  });

  it('EFDS-1372 :: RN-06 :: justo en el tope se permite, pasarse no', () => {
    // Sin prorrateo: o cabe completa o se rechaza.
    expect(evaluarAsignacion(docenteBase({ horasPta: 800 }), grupoBase({ horasRequeridas: 100 }), [], 700)).toEqual([]);
    expect(
      evaluarAsignacion(docenteBase({ horasPta: 800 }), grupoBase({ horasRequeridas: 101 }), [], 700)
        .some((m) => m.regla === 'RN-04/RN-05'),
    ).toBe(true);
  });

  // Se devuelven TODOS los motivos: decirlos de a uno obliga a reintentar para
  // descubrir el siguiente.
  it('EFDS-1372 :: se reportan todos los motivos de rechazo, no solo el primero', () => {
    const motivos = evaluarAsignacion(
      docenteBase({
        escalafon: 'Auxiliar',
        horasPta: 400,
        situacionAsignable: false,
        situacionMotivo: 'En comisión',
        vinculacionHasta: '2026-03-01',
      }),
      grupoBase({ tipoPrograma: 'maestria', horasRequeridas: 500 }),
      [{ idGrupo: 'g-otro', diaSemana: 'LUNES', horaInicio: '12:00', horaFin: '14:00' }],
      0,
    );

    expect(motivos.map((m) => m.regla).sort()).toEqual([
      'RN-04/RN-05', 'RN-07', 'RN-10', 'RN-12', 'situacion_administrativa',
    ]);
  });
});
