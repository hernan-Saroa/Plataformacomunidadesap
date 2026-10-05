import { describe, expect, it } from 'vitest';
import { getPtaResearchData } from './ptaResearch';

describe('Investigación completa en todas las vistas', () => {
  const proyecto = { nombre: 'Proyecto', horas_solicitadas: '200' };
  const actividad = { actividad_nombre: 'Formación investigativa', horas: '32' };
  it.each([
    [{ investigacion_proyecto: proyecto }, 1, 0, 200],
    [{ investigacion_actividades: [actividad] }, 0, 1, 32],
    [{ investigacion_proyecto: proyecto, investigacion_actividades: [actividad] }, 1, 1, 232],
    [{ investigacion: { proyectos: [proyecto], actividades: [actividad] } }, 1, 1, 232],
    [{ investigacion_proyecto: {}, investigacion_actividades: [actividad] }, 0, 1, 32],
  ])('conserva ambos registros y suma las horas de %j', (pta, proyectos, actividades, horas) => {
    const result = getPtaResearchData(pta);
    expect(result.proyectos).toHaveLength(proyectos as number);
    expect(result.actividades).toHaveLength(actividades as number);
    expect(result.horas).toBe(horas);
  });
  it('no recupera registros eliminados ni duplica formatos planos y agrupados', () => {
    const agrupado = { proyectos: [proyecto], actividades: [actividad] };
    expect(getPtaResearchData({ investigacion_proyecto: null, investigacion_actividades: [], investigacion: agrupado }))
      .toEqual({ proyectos: [], actividades: [], horas: 0 });
    expect(getPtaResearchData({ investigacion_proyecto: null, investigacion_actividades: null, investigacion: agrupado }))
      .toEqual({ proyectos: [], actividades: [], horas: 0 });
    expect(getPtaResearchData({ investigacion_proyecto: proyecto, investigacion_actividades: [actividad], investigacion: agrupado }).horas)
      .toBe(232);
  });
  it('respeta el total confirmado por el servidor, incluido cero', () => {
    expect(getPtaResearchData({ horas_investigacion: 0, investigacion_proyecto: proyecto }).horas).toBe(0);
    expect(getPtaResearchData({ horas_investigacion: 232, investigacion_actividades: [actividad] }).horas).toBe(232);
  });
});
