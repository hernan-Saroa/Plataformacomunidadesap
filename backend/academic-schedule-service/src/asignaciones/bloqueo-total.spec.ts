import { bloqueoTotal, claveDeMotivo } from './bloqueo-total';
import { periodoDentroDeVinculacion } from './reglas-asignacion';

/**
 * EFDS-2449 (Javier, en EFDS-1939): si todos los candidatos están bloqueados, el servidor redacta
 * la alerta: que no se puede asignar a nadie, qué hacer y los motivos más frecuentes con su conteo.
 */
const vencida = { tipo: 'VINCULACION' as const, causa: 'VENCIDA' as const };
const cruce = { tipo: 'CRUCE' as const };
const bloqueado = (...motivos: Array<{ tipo: any; causa?: any }>) => ({ asignable: false, motivos });

describe('EFDS-2449 :: alerta cuando todos los candidatos están bloqueados', () => {
  it('el ejemplo del ticket: 3 con la vinculación vencida y 1 con cruce de horario', () => {
    const r = bloqueoTotal([bloqueado(vencida), bloqueado(vencida), bloqueado(vencida), bloqueado(cruce)], 'Gestión Pública')!;
    expect(r.titulo).toBe('Ningún docente del área «Gestión Pública» se puede asignar a este grupo.');
    expect(r.resumen).toBe('3 con la vinculación vencida, 1 con cruce de horario.');
    expect(r.accion).toBe('Revise la vinculación de los docentes en el RUND, cambie el horario del grupo o elija otras franjas o habilite docentes del área.');
    expect(r.motivosFrecuentes.map((m) => [m.clave, m.cantidad])).toEqual([['VINCULACION_VENCIDA', 3], ['CRUCE', 1]]);
  });

  it('un solo motivo: la acción es la del ticket', () => {
    const r = bloqueoTotal([bloqueado(vencida), bloqueado(vencida)], 'Derecho')!;
    expect(r.accion).toBe('Revise la vinculación de los docentes en el RUND o habilite docentes del área.');
    expect(r.resumen).toBe('2 con la vinculación vencida.');
  });

  it('cuenta DOCENTES, no motivos: un docente con dos motivos cuenta en cada categoría una vez', () => {
    const r = bloqueoTotal([bloqueado(vencida, vencida, cruce), bloqueado(cruce)], 'Derecho')!;
    expect(r.motivosFrecuentes.map((m) => [m.clave, m.cantidad])).toEqual([['CRUCE', 2], ['VINCULACION_VENCIDA', 1]]);
  });

  it('cada tipo de bloqueo tiene su texto y su acción', () => {
    const r = bloqueoTotal([
      bloqueado({ tipo: 'TOPE' }), bloqueado({ tipo: 'SITUACION' }), bloqueado({ tipo: 'ESCALAFON' }),
      bloqueado({ tipo: 'VINCULACION', causa: 'AUN_NO_INICIA' }), bloqueado({ tipo: 'VINCULACION', causa: 'GRUPO_SIN_PERIODO' }),
    ], 'X')!;
    expect(r.motivosFrecuentes.map((m) => m.clave).sort()).toEqual(['ESCALAFON', 'GRUPO_SIN_PERIODO', 'SITUACION', 'TOPE', 'VINCULACION_NO_INICIA']);
    expect(r.accion.endsWith('o habilite docentes del área.')).toBe(true);
    // Como máximo tres acciones antes de «habilite docentes del área»: el aviso se mantiene corto.
    expect(r.accion.split(',').length).toBeLessThanOrEqual(3);
  });

  it('sin alerta si alguien se puede asignar, o si no hay candidatos', () => {
    expect(bloqueoTotal([bloqueado(vencida), { asignable: true, motivos: [] }], 'X')).toBeNull();
    expect(bloqueoTotal([], 'X')).toBeNull();
  });

  it('un motivo sin tipo conocido no rompe el resumen', () => {
    const r = bloqueoTotal([bloqueado({ tipo: undefined })], 'X')!;
    expect(r.resumen).toBe('1 con otro bloqueo.');
    expect(r.accion).toBe('Habilite docentes del área.');
  });

  it('la regla de vinculación NO cambió: solo informa la causa', () => {
    const grupo = { fechaInicio: '2026-02-02', fechaFin: '2026-06-12' };
    // RUND de 2025-1: la vinculación de un ocasional terminó en diciembre de 2025.
    expect(periodoDentroDeVinculacion(grupo, { vinculacionDesde: '2025-02-01', vinculacionHasta: '2025-12-15' }))
      .toMatchObject({ cumple: false, causa: 'VENCIDA' });
    expect(periodoDentroDeVinculacion(grupo, { vinculacionDesde: '2026-03-01', vinculacionHasta: null }))
      .toMatchObject({ cumple: false, causa: 'AUN_NO_INICIA' });
    expect(periodoDentroDeVinculacion({ fechaInicio: null, fechaFin: null }, { vinculacionDesde: null, vinculacionHasta: null }))
      .toMatchObject({ cumple: false, causa: 'GRUPO_SIN_PERIODO' });
    expect(periodoDentroDeVinculacion(grupo, { vinculacionDesde: '2026-01-01', vinculacionHasta: null }))
      .toEqual({ cumple: true, motivo: null });
    expect(claveDeMotivo({ tipo: 'VINCULACION' })).toBe('VINCULACION_VENCIDA');
  });
});
