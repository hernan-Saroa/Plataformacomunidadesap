import { describe, expect, it } from 'vitest';
import { deriveFromGranular, type PerfilRolPTA } from './PermisosPTAContext';
import { PTA_MANAGE_EDIT_REQUESTS_PERMISSION } from './shared/ptaComponentPermissions';

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
      'pta.review.academica.pregrado',
      PTA_MANAGE_EDIT_REQUESTS_PERMISSION,
    ], perfil);

    expect(permisos?.vistasPerm).toContain('gestion');
    expect(permisos?.vistasPerm).toContain('solicitudes_pta');
  });

  it('no deriva la pestaña desde un permiso de revisión de componente', () => {
    const permisos = deriveFromGranular([
      'pta.review.academica.pregrado',
    ], perfil);

    expect(permisos?.vistasPerm).toContain('gestion');
    expect(permisos?.vistasPerm).not.toContain('solicitudes_pta');
  });
});

