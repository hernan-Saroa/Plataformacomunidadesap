import { BadRequestException } from '@nestjs/common';

import { HorariosService } from './horarios.service.js';

/**
 * EFDS-2448 (reportado por Javier en EFDS-1368): «Guardar periodo» del grupo no guarda si no hay
 * al menos una sesión o si falta alguna fecha del ciclo. La regla es del SERVIDOR.
 */
describe('EFDS-2448 :: guardar periodo del grupo', () => {
  const montar = (modalidad: string, sesiones: number) => {
    const grupo: any = { idGrupo: 'g-1', modalidad, fechaInicio: '2026-02-02', fechaFin: '2026-06-12' };
    const guardar = jest.fn((g: any) => Promise.resolve(g));
    const service = new HorariosService(
      { count: jest.fn(() => Promise.resolve(sesiones)) } as any,
      { findOne: jest.fn(() => Promise.resolve(grupo)), save: guardar } as any,
    );
    return { service, grupo, guardar };
  };
  const ciclo = { fechaInicio: '2026-03-01', fechaFin: '2026-05-30' };

  it('sin ninguna sesión: 400 con el motivo y no guarda nada', async () => {
    const { service, grupo, guardar } = montar('presencial', 0);
    await expect(service.guardarPeriodoDelGrupo('g-1', ciclo)).rejects.toThrow(/al menos una sesión/);
    expect(guardar).not.toHaveBeenCalled();
    expect(grupo.fechaInicio).toBe('2026-02-02');
  });

  it('falta una fecha del ciclo: 400 con el motivo y no guarda nada', async () => {
    const { service, guardar } = montar('presencial', 2);
    await expect(service.guardarPeriodoDelGrupo('g-1', { fechaInicio: '2026-03-01', fechaFin: null }))
      .rejects.toThrow(/fecha de fin del ciclo/);
    await expect(service.guardarPeriodoDelGrupo('g-1', { fechaInicio: '', fechaFin: '2026-05-30' }))
      .rejects.toThrow(/fecha de inicio del ciclo/);
    expect(guardar).not.toHaveBeenCalled();
  });

  it('sin fechas y sin sesión: un solo mensaje con todo lo que falta', async () => {
    const { service } = montar('presencial', 0);
    const e = await service.guardarPeriodoDelGrupo('g-1', { fechaInicio: null, fechaFin: null }).catch((x) => x);
    expect(e).toBeInstanceOf(BadRequestException);
    expect(e.message).toBe('No se guardó el periodo del grupo: falta la fecha de inicio del ciclo, la fecha de fin del ciclo y al menos una sesión en el horario.');
  });

  it('con fechas y una sesión: guarda', async () => {
    const { service, guardar } = montar('presencial', 1);
    const g: any = await service.guardarPeriodoDelGrupo('g-1', ciclo);
    expect(guardar).toHaveBeenCalledTimes(1);
    expect(g).toMatchObject(ciclo);
  });

  it('grupo virtual o a distancia: el horario es opcional, basta con las fechas', async () => {
    for (const m of ['virtual', 'distancia']) {
      const { service, guardar } = montar(m, 0);
      await service.guardarPeriodoDelGrupo('g-1', ciclo);
      expect(guardar).toHaveBeenCalledTimes(1);
      await expect(montar(m, 0).service.guardarPeriodoDelGrupo('g-1', { ...ciclo, fechaFin: null })).rejects.toThrow(/fecha de fin/);
    }
  });

  it('la regla de fin anterior a inicio se conserva', async () => {
    const { service } = montar('presencial', 1);
    await expect(service.guardarPeriodoDelGrupo('g-1', { fechaInicio: '2026-08-01', fechaFin: '2026-07-01' }))
      .rejects.toThrow(/no puede ser anterior/);
  });
});
