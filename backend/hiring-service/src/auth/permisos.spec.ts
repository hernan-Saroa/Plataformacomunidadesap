import {
  PERMISO_ACTA_INICIO_SUSCRIBIR,
  PERMISO_INCUMPLIMIENTO_DECIDIR,
  PERMISO_INCUMPLIMIENTO_REPORTAR,
  PERMISO_INCUMPLIMIENTO_TRAMITAR,
  PERMISO_INCUMPLIMIENTO_VER,
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
 * RF-INC-01 le encarga el reporte al supervisor, y estas pruebas fijan que sea
 * él y nadie más quien lo tenga: es la lista más estrecha del bloque, porque
 * quien vigila la ejecución día a día es el único en condiciones de afirmar
 * que algo se incumplió.
 */
describe('permisos del presunto incumplimiento', () => {
  it('el supervisor puede reportar', () => {
    expect(tienePermiso({ roles: ['SUPERVISOR_CONTRATO'] }, PERMISO_INCUMPLIMIENTO_REPORTAR)).toBe(
      true,
    );
  });

  it('el gestor de contratación no reporta, aunque lleve el expediente', () => {
    // Lleva el expediente pero no vigila la obra: no ha visto el hecho.
    const gestor = { roles: ['GESTOR_CONTRATACION'] };

    expect(tienePermiso(gestor, PERMISO_INCUMPLIMIENTO_REPORTAR)).toBe(false);
    // Consultarlo sí, que es lo que necesita para tramitarlo.
    expect(tienePermiso(gestor, PERMISO_INCUMPLIMIENTO_VER)).toBe(true);
  });

  it('el ordenador del gasto tampoco reporta', () => {
    // Designa al supervisor, pero no hace la vigilancia él mismo.
    expect(tienePermiso({ roles: ['ORDENADOR_GASTO'] }, PERMISO_INCUMPLIMIENTO_REPORTAR)).toBe(
      false,
    );
  });

  it('el revisor consulta pero no reporta', () => {
    const revisor = { roles: ['REVISOR_CONTRATACION'] };

    expect(tienePermiso(revisor, PERMISO_INCUMPLIMIENTO_VER)).toBe(true);
    expect(tienePermiso(revisor, PERMISO_INCUMPLIMIENTO_REPORTAR)).toBe(false);
  });
});

/**
 * RF-INC-02 encarga el trámite al área jurídica, y estas pruebas fijan la
 * separación que la migración 651 explica: instruir y decidir no son la misma
 * competencia. Reunirlas le daría a quien lleva el trámite la facultad de
 * sancionar, y el debido proceso que pide la historia es justamente que no
 * ocurra.
 */
describe('permisos del trámite sancionatorio', () => {
  it('el gestor de contratación instruye pero no decide', () => {
    // Es el «abogado / profesional» de la matriz de roles: proyecta los actos
    // administrativos del proceso. Proyectarlos no es firmarlos.
    const gestor = { roles: ['GESTOR_CONTRATACION'] };

    expect(tienePermiso(gestor, PERMISO_INCUMPLIMIENTO_TRAMITAR)).toBe(true);
    expect(tienePermiso(gestor, PERMISO_INCUMPLIMIENTO_DECIDIR)).toBe(false);
  });

  it('el ordenador del gasto decide pero no instruye', () => {
    // Declarar el incumplimiento o la caducidad compromete a la entidad frente
    // al contratista, como el acto de adjudicación; citar audiencias no.
    const ordenador = { roles: ['ORDENADOR_GASTO'] };

    expect(tienePermiso(ordenador, PERMISO_INCUMPLIMIENTO_DECIDIR)).toBe(true);
    expect(tienePermiso(ordenador, PERMISO_INCUMPLIMIENTO_TRAMITAR)).toBe(false);
  });

  it('el director de contratación hace las dos cosas', () => {
    const director = { roles: ['DIRECTOR_CONTRATACION'] };

    expect(tienePermiso(director, PERMISO_INCUMPLIMIENTO_TRAMITAR)).toBe(true);
    expect(tienePermiso(director, PERMISO_INCUMPLIMIENTO_DECIDIR)).toBe(true);
  });

  it('el supervisor reporta y consulta, pero no tramita ni decide', () => {
    // Constata el hecho; lo que sigue es del área jurídica, y que sea él quien
    // lo vio no lo pone en condiciones de resolverlo.
    const supervisor = { roles: ['SUPERVISOR_CONTRATO'] };

    expect(tienePermiso(supervisor, PERMISO_INCUMPLIMIENTO_REPORTAR)).toBe(true);
    expect(tienePermiso(supervisor, PERMISO_INCUMPLIMIENTO_VER)).toBe(true);
    expect(tienePermiso(supervisor, PERMISO_INCUMPLIMIENTO_TRAMITAR)).toBe(false);
    expect(tienePermiso(supervisor, PERMISO_INCUMPLIMIENTO_DECIDIR)).toBe(false);
  });

  it('el revisor consulta y nada más', () => {
    const revisor = { roles: ['REVISOR_CONTRATACION'] };

    expect(tienePermiso(revisor, PERMISO_INCUMPLIMIENTO_VER)).toBe(true);
    expect(tienePermiso(revisor, PERMISO_INCUMPLIMIENTO_TRAMITAR)).toBe(false);
    expect(tienePermiso(revisor, PERMISO_INCUMPLIMIENTO_DECIDIR)).toBe(false);
  });
});
