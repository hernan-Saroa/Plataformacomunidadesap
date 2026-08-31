import {
  PERMISO_ACTA_INICIO_SUSCRIBIR,
  PERMISO_SUPERVISION_REASIGNAR,
  permisosDelUsuario,
  tienePermiso,
} from './permisos';

/**
 * Los permisos son del código y los roles son datos.
 *
 * El administrador crea y renombra roles desde la plataforma, así que el módulo
 * pregunta por permisos. Mientras el token no los traiga, se deducen de los
 * roles en un único mapa; estas pruebas fijan que el día que lleguen se usen
 * ellos y el mapa deje de importar.
 */
describe('permisosDelUsuario', () => {
  it('usa los permisos del token cuando vienen', () => {
    const permisos = permisosDelUsuario({
      permissions: ['contratacion.acta-inicio.suscribir'],
      roles: [],
    });

    expect(permisos).toEqual(['contratacion.acta-inicio.suscribir']);
  });

  it('el token manda sobre los roles', () => {
    // Un rol que hoy otorga el permiso no debe añadirlo si el token ya dijo
    // qué tiene el usuario: la fuente pasa a ser la configuración real.
    const permisos = permisosDelUsuario({
      permissions: ['contratacion.seguimiento.ver'],
      roles: ['ORDENADOR_GASTO'],
    });

    expect(permisos).not.toContain(PERMISO_SUPERVISION_REASIGNAR);
  });

  it('cae a los roles mientras el token no los traiga', () => {
    const permisos = permisosDelUsuario({ roles: ['ORDENADOR_GASTO'] });

    expect(permisos).toContain(PERMISO_SUPERVISION_REASIGNAR);
    expect(permisos).toContain(PERMISO_ACTA_INICIO_SUSCRIBIR);
  });

  it('reconoce los roles vengan como objetos o en minúscula', () => {
    // El token los ha traído de las dos formas según el servicio que lo emita.
    expect(permisosDelUsuario({ roles: [{ code: 'ordenador_gasto' }] })).toContain(
      PERMISO_SUPERVISION_REASIGNAR,
    );
  });

  it('un rol sin ese permiso no lo obtiene', () => {
    // El revisor consulta el seguimiento, pero no reasigna la supervisión.
    const permisos = permisosDelUsuario({ roles: ['REVISOR_CONTRATACION'] });

    expect(permisos).toContain('contratacion.seguimiento.ver');
    expect(permisos).not.toContain(PERMISO_SUPERVISION_REASIGNAR);
  });

  it('sin roles ni permisos no hay nada', () => {
    expect(permisosDelUsuario({})).toEqual([]);
    expect(permisosDelUsuario(null)).toEqual([]);
  });
});

describe('tienePermiso', () => {
  it('responde por un permiso concreto', () => {
    const ordenador = { roles: ['ORDENADOR_GASTO'] };

    expect(tienePermiso(ordenador, PERMISO_SUPERVISION_REASIGNAR)).toBe(true);
    expect(tienePermiso(ordenador, 'contratacion.seguimiento.cargar')).toBe(false);
  });
});

/**
 * Criterios de EFDS-1183: el rol habilita únicamente los permisos que le
 * corresponden, y una acción no permitida se bloquea.
 */
describe('catálogo por perfil (EFDS-1183)', () => {
  it('el gestor diligencia pero no aprueba', () => {
    const permisos = permisosDelUsuario({ roles: ['GESTOR_CONTRATACION'] });

    expect(permisos).toContain('contratacion.actividad.edit');
    expect(permisos).toContain('contratacion.actividad.send');
    expect(permisos).not.toContain('contratacion.actividad.approve');
  });

  it('el revisor aprueba pero no diligencia', () => {
    const permisos = permisosDelUsuario({ roles: ['REVISOR_CONTRATACION'] });

    expect(permisos).toContain('contratacion.actividad.approve');
    expect(permisos).not.toContain('contratacion.actividad.edit');
  });

  it('configurar etapas es de la Dirección, no del gestor', () => {
    expect(tienePermiso({ roles: ['DIRECTOR_CONTRATACION'] }, 'contratacion.config.manage')).toBe(true);
    expect(tienePermiso({ roles: ['GESTOR_CONTRATACION'] }, 'contratacion.config.manage')).toBe(false);
  });

  it('borrar procesos no lo otorga ningún rol operativo', () => {
    for (const rol of ['GESTOR_CONTRATACION', 'REVISOR_CONTRATACION', 'DIRECTOR_CONTRATACION']) {
      expect(tienePermiso({ roles: [rol] }, 'contratacion.proceso.delete')).toBe(false);
    }
  });

  it('los permisos del token mandan sobre el mapa de roles', () => {
    // Cuando auth-service los incluya, el rol deja de importar aquí.
    const usuario = { roles: ['GESTOR_CONTRATACION'], permissions: ['contratacion.actividad.approve'] };

    expect(tienePermiso(usuario, 'contratacion.actividad.approve')).toBe(true);
    expect(tienePermiso(usuario, 'contratacion.actividad.edit')).toBe(false);
  });
});
