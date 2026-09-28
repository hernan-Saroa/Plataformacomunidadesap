import {
  PERMISOS_TRANSVERSALES,
  PERMISO_CONFIG_ADMINISTRAR,
  PERMISO_PLAZO_TERMINAR,
  PERMISO_PROCESO_ASIGNAR,
  PERMISO_PROCESO_VER_TODOS,
  PERMISO_REPORTE_VER,
  ROLES_QUE_OTORGAN,
  permisosDelUsuario,
  tienePermiso,
} from './permisos';

/**
 * Los cinco permisos transversales (migración 083).
 *
 * Todo lo que es de una etapa se autoriza por acción y alcance; lo que queda
 * con código propio es lo que no es de ninguna: ver todos los procesos,
 * repartirlos, configurar, los informes y la llave de pruebas de los plazos.
 */
describe('permisosDelUsuario', () => {
  it('usa los permisos del token cuando vienen', () => {
    expect(permisosDelUsuario({ permissions: [PERMISO_REPORTE_VER], roles: [] })).toEqual([
      PERMISO_REPORTE_VER,
    ]);
  });

  it('el token manda sobre los roles', () => {
    // Un rol que hoy otorga el permiso no lo añade si el token ya dijo qué
    // tiene el usuario.
    const permisos = permisosDelUsuario({
      permissions: [PERMISO_REPORTE_VER],
      roles: ['DIRECTOR_CONTRATACION'],
    });

    expect(permisos).not.toContain(PERMISO_PROCESO_ASIGNAR);
  });

  it('cae a los roles mientras el token no los traiga', () => {
    const permisos = permisosDelUsuario({ roles: ['DIRECTOR_CONTRATACION'] });

    expect(permisos).toEqual(
      expect.arrayContaining([PERMISO_PROCESO_VER_TODOS, PERMISO_PROCESO_ASIGNAR, PERMISO_CONFIG_ADMINISTRAR]),
    );
  });

  it('reconoce los roles vengan como objetos o en minúscula', () => {
    expect(permisosDelUsuario({ roles: [{ code: 'director_contratacion' }] })).toContain(
      PERMISO_PROCESO_ASIGNAR,
    );
  });

  it('sin roles ni permisos no hay nada', () => {
    expect(permisosDelUsuario({})).toEqual([]);
  });
});

describe('el respaldo en código', () => {
  it('solo cubre los transversales', () => {
    // Los permisos de acción no tienen respaldo a propósito: su alcance vive en
    // la base, y un rol creado desde el backoffice tiene que funcionar sin que
    // el código lo nombre.
    expect(Object.keys(ROLES_QUE_OTORGAN).sort()).toEqual([...PERMISOS_TRANSVERSALES].sort());
  });

  it('ver todos los procesos es una sola X: la del Jefe de Oficina (068)', () => {
    expect(tienePermiso({ roles: ['REVISOR_CONTRATACION'] }, PERMISO_PROCESO_VER_TODOS)).toBe(false);
    expect(tienePermiso({ roles: ['DIRECTOR_CONTRATACION'] }, PERMISO_PROCESO_VER_TODOS)).toBe(true);
  });

  it('el administrador configura e informa sin repartir', () => {
    const admin = { roles: ['ADMINISTRADOR_CONTRATACION'] };
    expect(tienePermiso(admin, PERMISO_CONFIG_ADMINISTRAR)).toBe(true);
    expect(tienePermiso(admin, PERMISO_REPORTE_VER)).toBe(true);
    expect(tienePermiso(admin, PERMISO_PROCESO_ASIGNAR)).toBe(false);
  });

  it('terminar un plazo es solo del superadministrador', () => {
    expect(ROLES_QUE_OTORGAN[PERMISO_PLAZO_TERMINAR]).toEqual(['SUPER_ADMIN']);
  });
});
