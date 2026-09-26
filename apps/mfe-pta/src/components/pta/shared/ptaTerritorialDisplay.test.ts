import { describe, expect, it } from 'vitest';
import { getPtaAssignmentTerritorialLabel } from './ptaTerritorialDisplay';

describe('territorial mostrada en la bandeja PTA', () => {
  it('prioriza la ubicación de las asignaturas sobre la vinculación del docente', () => {
    expect(getPtaAssignmentTerritorialLabel({
      territorial: 'Atlántico',
      territorialesAsignaturas: ['Sede Central'],
    })).toBe('Sede Central');
  });

  it('usa la territorial de vinculación solo cuando no existe detalle académico', () => {
    expect(getPtaAssignmentTerritorialLabel({ territorial: 'Atlántico' })).toBe('Atlántico');
  });

  it('muestra Sede Central para docencia pregrado aunque una asignatura antigua no traiga territorial', () => {
    expect(getPtaAssignmentTerritorialLabel({
      territorial: 'Atlántico',
      territorialesAsignaturas: [],
      docencia_por_componente: {
        academica_pregrado: 96,
        academica_posgrado: 0,
        academica_territorial: 0,
      },
    })).toBe('Sede Central');
  });

  it('ignora una territorial de asignatura obsoleta cuando toda la docencia es central', () => {
    expect(getPtaAssignmentTerritorialLabel({
      territorial: 'Atlántico',
      territorialesAsignaturas: ['Atlántico'],
      docencia_por_componente: { academica_pregrado: 48, academica_territorial: 0 },
    })).toBe('Sede Central');
  });

  it('muestra las dos ubicaciones cuando el PTA mezcla docencia central y territorial', () => {
    expect(getPtaAssignmentTerritorialLabel({
      territorial: 'Atlántico',
      territorialesAsignaturas: ['Meta'],
      docencia_por_componente: { academica_posgrado: 32, academica_territorial: 16 },
    })).toBe('Sede Central, Meta');
  });
});
