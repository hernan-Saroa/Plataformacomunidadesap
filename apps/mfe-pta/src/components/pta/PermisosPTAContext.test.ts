import { describe, expect, it } from 'vitest';
import { deriveFromGranular, type PerfilRolPTA } from './PermisosPTAContext';
import {
  PTA_COMPONENT_KEYS,
  PTA_MANAGE_EDIT_REQUESTS_PERMISSION,
  PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION,
  type PTAComponentKey,
} from './shared/ptaComponentPermissions';

const perfil: PerfilRolPTA = {
  rol: 'docente',
  nombre: 'Revisor Docencia - Pregrado',
  email: 'revisor@esap.edu.co',
  territorial_ids: [],
  programa_ids: [],
};

describe('PermisosPTAContext - solicitudes de edición', () => {
  it('muestra Solicitudes PTA cuando el rol tiene el permiso funcional', () => {
    const permisos = deriveFromGranular([
      PTA_MANAGE_EDIT_REQUESTS_PERMISSION,
    ], perfil);

    expect(permisos?.vistasPerm).toEqual(['solicitudes_pta']);
    expect(permisos?.vistasPerm).toContain('solicitudes_pta');
  });

  it('un permiso de revisión aislado no muestra la pestaña de solicitudes', () => {
    const permisos = deriveFromGranular([
      'pta.review.academica.pregrado',
    ], perfil);

    expect(permisos?.vistasPerm).toContain('gestion');
    expect(permisos?.vistasPerm).not.toContain('solicitudes_pta');
    expect(permisos?.componentesRevisables).toContain('academica_pregrado:general');
  });

  it('combina el permiso de bandeja con el alcance granular del revisor', () => {
    const permisos = deriveFromGranular([
      PTA_MANAGE_EDIT_REQUESTS_PERMISSION,
      'pta.review.academica.pregrado',
    ], perfil);

    expect(permisos?.vistasPerm).toContain('solicitudes_pta');
    expect(permisos?.puedeRevisar).toBe(true);
    expect(permisos?.puedeAprobar).toBe(false);
    expect(permisos?.componentesRevisables).toContain('academica_pregrado:general');
  });

  it('pta.review.all tampoco abre la bandeja sin el permiso funcional', () => {
    const permisos = deriveFromGranular(['pta.review.all'], perfil);

    expect(permisos?.vistasPerm).not.toContain('solicitudes_pta');
    expect(permisos?.puedeRevisar).toBe(true);
  });
});

describe('PermisosPTAContext - permiso funcional y alcance de Seguimiento', () => {
  it.each([
    ['pta.approve.academica.pregrado', 'academica_pregrado'],
    ['pta.approve.investigacion', 'investigacion'],
    ['pta.approve.extension.capacitacion', 'ext_capacitacion'],
    ['pta.approve.complementarias.pregrado', 'complementarias_pregrado'],
    ['pta.approve.complementarias.territorial.pregrado', 'complementarias_territorial'],
  ] as Array<[string, PTAComponentKey]>)('%s define el componente, pero no abre Seguimiento por sí solo', (permiso, componente) => {
    const permisos = deriveFromGranular([permiso], perfil);

    expect(permisos?.vistasPerm).not.toContain('seguimiento_docs');
    expect(permisos?.vistasPerm).toContain('gestion');
    expect(permisos?.vistasPerm).not.toContain('solicitudes_pta');
    expect(permisos?.componentesAprobables).toEqual([componente]);
  });

  it('el permiso funcional abre Seguimiento sin conceder componentes', () => {
    const permisos = deriveFromGranular([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION], perfil);

    expect(permisos?.vistasPerm).toEqual(['seguimiento_docs']);
    expect(permisos?.componentesAprobables).toEqual([]);
    expect(permisos?.puedeAprobar).toBe(false);
  });

  it.each([
    ['pta.approve.academica.pregrado', 'academica_pregrado'],
    ['pta.approve.investigacion', 'investigacion'],
    ['pta.approve.extension.capacitacion', 'ext_capacitacion'],
    ['pta.approve.complementarias.pregrado', 'complementarias_pregrado'],
    ['pta.approve.complementarias.territorial.pregrado', 'complementarias_territorial'],
  ] as Array<[string, PTAComponentKey]>)('combina la entrada con el alcance exacto de %s', (permiso, componente) => {
    const permisos = deriveFromGranular([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION, permiso], perfil);

    expect(permisos?.vistasPerm).toContain('seguimiento_docs');
    expect(permisos?.componentesAprobables).toEqual([componente]);
  });

  it('pta.approve.all conserva alcance total, pero también necesita el permiso funcional', () => {
    const permisos = deriveFromGranular(['pta.approve.all'], perfil);

    expect(permisos?.vistasPerm).not.toContain('seguimiento_docs');
    expect(permisos?.vistasPerm).not.toContain('solicitudes_pta');
    expect(permisos?.componentesAprobables).toEqual(PTA_COMPONENT_KEYS);

    const combinado = deriveFromGranular([
      PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION,
      'pta.approve.all',
    ], perfil);
    expect(combinado?.vistasPerm).toContain('seguimiento_docs');
    expect(combinado?.componentesAprobables).toEqual(PTA_COMPONENT_KEYS);
  });

  it('los permisos funcionales de Solicitudes y Seguimiento son independientes', () => {
    const solicitudes = deriveFromGranular([PTA_MANAGE_EDIT_REQUESTS_PERMISSION], perfil);
    const seguimiento = deriveFromGranular([PTA_MANAGE_DOCUMENT_TRACKING_PERMISSION], perfil);

    expect(solicitudes?.vistasPerm).not.toContain('seguimiento_docs');
    expect(seguimiento?.vistasPerm).not.toContain('solicitudes_pta');
  });
});
