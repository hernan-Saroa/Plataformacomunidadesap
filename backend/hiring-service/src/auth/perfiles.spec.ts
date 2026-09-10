import {
  PERFILES_POR_DEFECTO,
  permisosDelPerfil,
  permisosDelRol,
  rolDelCatalogo,
  rolesQueOtorgan,
} from './matriz-roles';
import {
  PERMISO_ACTIVIDAD_APROBAR,
  PERMISO_ACTIVIDAD_EDITAR,
  PERMISO_PROCESO_TOMAR,
  PERMISO_PROCESO_VER,
  PERMISO_PROCESO_VER_TODOS,
} from './permisos';

/**
 * Los cuatro perfiles por defecto (EFDS-1183).
 *
 * Los catorce roles se combinan como se quiera, y esa flexibilidad es correcta.
 * El problema es de otro orden: a quien da de alta a un funcionario le llega
 * como un formulario de treinta y cinco casillas que no sabe responder, y el
 * resultado previsible es que marque de más.
 */
describe('perfiles por defecto', () => {
  it('son cuatro y cubren el recorrido de un proceso', () => {
    expect(PERFILES_POR_DEFECTO.map((p) => p.codigo)).toEqual([
      'AREA_SOLICITANTE',
      'CONTRATACION',
      'ABOGADO',
      'CONSULTA',
    ]);
  });

  it('se componen de roles que existen en el catálogo', () => {
    // Un perfil que nombre un rol inventado no fallaría al compilar y dejaría
    // sin permisos a quien se lo asignen, sin decir por qué.
    for (const perfil of PERFILES_POR_DEFECTO) {
      for (const rol of perfil.roles) {
        expect(rolDelCatalogo(rol)).toBeDefined();
      }
    }
  });

  it('no inventan permisos: los derivan de sus roles', () => {
    // Un perfil no es una tercera fuente de verdad sobre quién puede qué. Si
    // mañana se le quita un permiso a un rol, el perfil lo pierde solo.
    for (const perfil of PERFILES_POR_DEFECTO) {
      const desdeRoles = new Set(perfil.roles.flatMap(permisosDelRol));
      for (const permiso of permisosDelPerfil(perfil.codigo)) {
        expect(desdeRoles.has(permiso)).toBe(true);
      }
    }
  });

  it('el área solicitante diligencia pero no aprueba ni recibe', () => {
    const suyos = permisosDelPerfil('AREA_SOLICITANTE');
    expect(suyos).toContain(PERMISO_ACTIVIDAD_EDITAR);
    // Es de fuera de la Dirección: ni resuelve revisiones ni toma de la bandeja.
    expect(suyos).not.toContain(PERMISO_ACTIVIDAD_APROBAR);
    expect(suyos).not.toContain(PERMISO_PROCESO_TOMAR);
  });

  it('contratación recibe de la bandeja; el abogado resuelve', () => {
    expect(permisosDelPerfil('CONTRATACION')).toContain(PERMISO_PROCESO_TOMAR);
    expect(permisosDelPerfil('ABOGADO')).toContain(PERMISO_ACTIVIDAD_APROBAR);
  });

  it('el abogado ve los que le repartieron, no los de toda la entidad', () => {
    // Llega a los suyos por su participación en el proceso, que es lo que la
    // 3.3 reparte. «Ver todos» lo tenía de cuando el reparto no existía, y con
    // él la pantalla le devolvía el expediente de la entidad entera.
    const suyos = permisosDelPerfil('ABOGADO');

    expect(suyos).toContain(PERMISO_PROCESO_VER);
    expect(suyos).not.toContain(PERMISO_PROCESO_VER_TODOS);
    // La Hoja1 marca esa columna con una sola X, la del Jefe de Oficina.
    expect(rolesQueOtorgan(PERMISO_PROCESO_VER_TODOS)).toEqual(['DIRECTOR_CONTRATACION']);
  });

  it('consulta no puede tocar nada', () => {
    // Es lo único que define a este perfil, así que conviene que una prueba lo
    // sostenga: cualquier permiso de escritura que se le cuele lo desvirtúa.
    const suyos = permisosDelPerfil('CONSULTA');
    expect(suyos).not.toContain(PERMISO_ACTIVIDAD_EDITAR);
    expect(suyos).not.toContain(PERMISO_ACTIVIDAD_APROBAR);
    expect(suyos).not.toContain(PERMISO_PROCESO_TOMAR);
    expect(suyos.length).toBeGreaterThan(0);
  });
});
