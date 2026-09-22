import { describe, expect, it } from 'vitest';
import { deriveFromGranular, type PerfilRolPTA } from './PermisosPTAContext';
import {
  PTA_COMPONENT_KEYS,
  PTA_MANAGE_EDIT_REQUESTS_PERMISSION,
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

describe('PermisosPTAContext - acceso a Seguimiento por aprobación', () => {
  it.each([
    ['pta.approve.academica.pregrado', 'academica_pregrado'],
    ['pta.approve.investigacion', 'investigacion'],
    ['pta.approve.extension.capacitacion', 'ext_capacitacion'],
  ] as Array<[string, PTAComponentKey]>)('%s habilita Seguimiento y solo su componente', (permiso, componente) => {
    const permisos = deriveFromGranular([permiso], perfil);

    expect(permisos?.vistasPerm).toContain('seguimiento_docs');
    expect(permisos?.vistasPerm).toContain('gestion');
    expect(permisos?.vistasPerm).not.toContain('solicitudes_pta');
    expect(permisos?.componentesAprobables).toEqual([componente]);
  });

  it('pta.approve.all habilita Seguimiento y todos los componentes', () => {
    const permisos = deriveFromGranular(['pta.approve.all'], perfil);

    expect(permisos?.vistasPerm).toContain('seguimiento_docs');
    expect(permisos?.vistasPerm).not.toContain('solicitudes_pta');
    expect(permisos?.componentesAprobables).toEqual(PTA_COMPONENT_KEYS);
  });
});
