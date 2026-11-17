import { expandRundPermissions, isRundReadOnly, RUND_PROFILE_PERMISSIONS } from './rund-permission-policy';

describe('isRundReadOnly (perfil Consulta RUND)', () => {
  const consulta = RUND_PROFILE_PERMISSIONS.CONSULTA;

  it('el perfil de consulta se expande solo a lectura de ficha y de soportes en el visor', () => {
    expect([...expandRundPermissions([consulta])].sort()).toEqual([
      consulta, 'banco-docentes.rund.sensitive.view', 'banco-docentes.rund.view',
    ].sort());
  });

  it('es solo lectura con el perfil de consulta expandido', () => {
    expect(isRundReadOnly(expandRundPermissions([consulta]))).toBe(true);
  });

  it.each([
    ['carga', RUND_PROFILE_PERMISSIONS.CARGADOR],
    ['revisión', RUND_PROFILE_PERMISSIONS.REVISOR],
    ['incorporación', RUND_PROFILE_PERMISSIONS.INCORPORADOR],
    ['edición', 'banco-docentes.rund.edit'],
    ['exportación', 'banco-docentes.rund.export'],
    ['administración', 'banco-docentes.rund.manage'],
    ['fotos', 'banco-docentes.rund.photos.manage'],
    ['un permiso RUND nuevo que aún no conoce la política', 'banco-docentes.rund.futuro'],
  ])('deja de ser solo lectura si además tiene %s', (_nombre, otro) => {
    expect(isRundReadOnly(expandRundPermissions([consulta, otro]))).toBe(false);
  });

  it('view sin el perfil de consulta (rol personalizado antiguo) no es solo lectura', () => {
    expect(isRundReadOnly(expandRundPermissions(['banco-docentes.rund.view']))).toBe(false);
  });

  it('ignora permisos de otros módulos y valores vacíos', () => {
    expect(isRundReadOnly(expandRundPermissions([consulta, 'pta.approve.all']))).toBe(true);
    expect(isRundReadOnly(undefined)).toBe(false);
    expect(isRundReadOnly(null)).toBe(false);
    expect(isRundReadOnly([])).toBe(false);
  });
});
