import { describe, expect, it } from 'vitest';
import { getApprovalTerritorialLabel, getPtaAssignmentTerritorialLabel, getTerritorialDisplayName, toTerritorialReference } from './ptaTerritorialDisplay';

describe('nombres de territoriales en campos informativos', () => {
  const id = '265cf9d0-536c-4405-9c62-219ea59c07ab';
  const catalogo = [{ id, codigo: '900017', nombre: 'Risaralda' }];

  it('resuelve IDs y códigos con el catálogo vigente del ambiente', () => {
    expect(getTerritorialDisplayName(id, catalogo)).toBe('Risaralda');
    expect(getTerritorialDisplayName('900017', catalogo)).toBe('Risaralda');
    expect(getTerritorialDisplayName({ territorialId: id, territorialNombre: id }, catalogo)).toBe('Risaralda');
    expect(getTerritorialDisplayName(id, [{ id, nombre: 'Nombre en otro ambiente' }])).toBe('Nombre en otro ambiente');
  });

  it('conserva nombres históricos y no expone UUID ni códigos sin nombre', () => {
    expect(getTerritorialDisplayName({ territorialId: id, territorialNombre: 'Risaralda' })).toBe('Risaralda');
    expect(getTerritorialDisplayName(id)).toBeNull();
    expect(getTerritorialDisplayName('900017')).toBeNull();
    expect(getTerritorialDisplayName({ id })).toBeNull();
    expect(getTerritorialDisplayName('Sede Nacional')).toBe('Sede Nacional');
  });

  it('no confunde la territorial de la decisión con la vinculación del docente', () => {
    expect(getApprovalTerritorialLabel({ scope: 'territorial', scopeId: id }, { territorial: 'Sede Central' }, catalogo)).toBe('Risaralda');
    expect(getApprovalTerritorialLabel({ scope: 'territorial', scopeId: id }, { territorial: 'Sede Central' })).toBe('Territorial no disponible');
    expect(getApprovalTerritorialLabel({ scopeId: 'Meta' }, {})).toBe('Meta');
  });

  it('no interpreta un ID de solicitud de edición o un nivel como territorial', () => {
    expect(getApprovalTerritorialLabel({ scope: 'solicitud_edicion', scopeId: id }, { territorial: 'Meta' }, catalogo)).toBe('Meta');
    expect(getApprovalTerritorialLabel({ scope: 'rol', scopeId: '3', aprobadorRol: 'Gestión Profesoral' }, {})).toBe('Sede Nacional');
  });

  it('extrae la territorial sin confundirla con el nombre del docente o de la asignatura', () => {
    const referencia = toTerritorialReference({ id: 'docente-1', nombre: 'Nombre del docente', territorial: id, territorial_nombre: 'Risaralda' });
    expect(getTerritorialDisplayName(referencia)).toBe('Risaralda');
    expect(getTerritorialDisplayName(toTerritorialReference({ id: 'curso-1', nombre: 'Cálculo' }))).toBeNull();
  });

  it('evita mostrar UUID en la bandeja y recupera los nombres de las asignaturas', () => {
    expect(getPtaAssignmentTerritorialLabel({ territorial: id, territorialesAsignaturas: [id],
      asignaturas: [{ territorial_id: id, territorial_nombre: 'Risaralda' }] })).toBe('Risaralda');
    expect(getPtaAssignmentTerritorialLabel({ territorial: id, territorialesAsignaturas: [id] })).toBe('');
  });
});

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
