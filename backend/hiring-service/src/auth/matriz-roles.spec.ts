import {
  CATALOGO_PERMISOS,
  CATALOGO_ROLES,
  ColumnaDelFormato,
  MATRIZ_CONFIRMADA,
  esRolDeContratacion,
  loQuePuedeHacer,
  matrizDeRoles,
  permisosDelRol,
  rolDelCatalogo,
  rolesQueOtorgan,
} from './matriz-roles';
import * as permisos from './permisos';
import { permisosDelUsuario } from './permisos';

/** Los códigos que `permisos.ts` declara, leídos de sus propias exportaciones. */
const CODIGOS_DECLARADOS = Object.entries(permisos)
  .filter(([nombre, valor]) => nombre.startsWith('PERMISO_') && typeof valor === 'string')
  .map(([, valor]) => valor as string);

/**
 * La matriz no puede inventarse ni perderse columnas.
 *
 * El catálogo se escribe a mano —los códigos ya estaban declarados uno a uno y
 * nada los recorría—, así que lo que hay que fijar es que no se desincronice
 * del archivo del que salió.
 */
describe('catálogo de permisos', () => {
  it('cubre exactamente los códigos que declara permisos.ts', () => {
    const enElCatalogo = CATALOGO_PERMISOS.map((p) => p.codigo).sort();

    expect(enElCatalogo).toEqual([...CODIGOS_DECLARADOS].sort());
  });

  it('no repite códigos', () => {
    const codigos = CATALOGO_PERMISOS.map((p) => p.codigo);

    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it('no nombra ningún rol que no esté en el catálogo', () => {
    // Es la única red contra un código mal escrito en cualquiera de los dos
    // archivos: si el mapa dijera ESTRUCTURADOR_TECNIC0 y el catálogo el
    // correcto, las dos funciones devolverían la lista vacía y coincidirían.
    const conocidos = new Set([
      ...CATALOGO_ROLES.map((r) => r.codigo),
      ...matrizDeRoles().transversales,
    ]);

    for (const [permiso, otorgan] of Object.entries(permisos.ROLES_QUE_OTORGAN)) {
      for (const rol of otorgan) {
        expect([permiso, rol, conocidos.has(rol)]).toEqual([permiso, rol, true]);
      }
    }
  });

  it('todos tienen quién los otorgue', () => {
    // Un permiso sin ningún rol sería una columna que nadie puede marcar: o
    // sobra del catálogo, o falta ponerlo en el mapa.
    for (const permiso of CATALOGO_PERMISOS) {
      const otorgan = permisos.ROLES_QUE_OTORGAN[permiso.codigo] ?? [];
      expect(otorgan.length).toBeGreaterThan(0);
    }
  });

  it('el recurso del código y el declarado coinciden', () => {
    // `contratacion.proceso.view` se agrupa bajo «proceso» y no bajo otra cosa:
    // la rejilla se agrupa por ahí y un recurso mal escrito parte la fila.
    for (const permiso of CATALOGO_PERMISOS) {
      expect(permiso.codigo).toBe(`contratacion.${permiso.recurso}.${permiso.codigo.split('.')[2]}`);
    }
  });

  it('las diez columnas del formato están representadas', () => {
    const columnas: ColumnaDelFormato[] = [
      'Radicar',
      'Editar',
      'Adjuntar',
      'Visualizar todos los procesos',
      'Asignar / Reasignar',
      'Aprobar',
      'Archivar',
      'Borrar',
      'Generar informes',
      'Configurar',
    ];
    const usadas = new Set(CATALOGO_PERMISOS.map((p) => p.columna).filter(Boolean));

    for (const columna of columnas) expect(usadas.has(columna)).toBe(true);
  });
});

/**
 * Los catorce del anexo, ni uno más.
 */
describe('catálogo de roles', () => {
  it('tiene los catorce del formato', () => {
    expect(CATALOGO_ROLES).toHaveLength(14);
    expect(new Set(CATALOGO_ROLES.map((r) => r.codigo)).size).toBe(14);
  });

  it('SUPER_ADMIN no es un rol de contratación', () => {
    // Es transversal a la plataforma: sale en `transversales`, no como fila.
    expect(esRolDeContratacion('SUPER_ADMIN')).toBe(false);
    expect(matrizDeRoles().transversales).toContain('SUPER_ADMIN');
  });

  it('el ente de control es el único externo', () => {
    const externos = CATALOGO_ROLES.filter((r) => r.procedencia === 'EXTERNA');

    expect(externos.map((r) => r.codigo)).toEqual(['ENTE_DE_CONTROL']);
  });

  it('reconoce el código venga como venga', () => {
    expect(rolDelCatalogo('gestor_contratacion')?.nombre).toBe('Gestor de Contratación');
    expect(rolDelCatalogo('  SUPERVISOR_CONTRATO ')?.nombre).toBe('Supervisor de Contrato');
    expect(rolDelCatalogo('JEFE_DE_LO_QUE_SEA')).toBeUndefined();
  });
});

/**
 * La rejilla y el guard tienen que decir lo mismo.
 *
 * Es la razón de que la matriz se arme leyendo `ROLES_QUE_OTORGAN` en vez de
 * repetirlo: una pantalla que prometa un permiso que el guard niega es peor que
 * no tener pantalla.
 */
describe('el cruce', () => {
  it('lo que la matriz le marca a un rol es lo que el guard le concede', () => {
    for (const rol of CATALOGO_ROLES) {
      const delGuard = permisosDelUsuario({ roles: [rol.codigo] }).sort();

      expect(permisosDelRol(rol.codigo).sort()).toEqual(delGuard);
    }
  });

  it('SUPER_ADMIN lo otorga todo', () => {
    expect(permisosDelRol('SUPER_ADMIN').sort()).toEqual(
      CATALOGO_PERMISOS.map((p) => p.codigo).sort(),
    );
  });

  it('un rol que no existe no otorga nada', () => {
    expect(permisosDelRol('ROL_INVENTADO')).toEqual([]);
  });

  it('devuelve los permisos en el orden del catálogo', () => {
    // Dos llamadas tienen que dar la misma lista: la rejilla se dibuja con
    // ella y un orden que baile mueve las casillas de sitio.
    const orden = CATALOGO_PERMISOS.map((p) => p.codigo);
    const suyos = permisosDelRol('DIRECTOR_CONTRATACION');

    expect(suyos).toEqual(orden.filter((c) => suyos.includes(c)));
  });

  it('rolesQueOtorgan no lista al superadministrador', () => {
    const otorgan = rolesQueOtorgan('contratacion.proceso.delete');

    // Borrar procesos solo lo tiene SUPER_ADMIN, así que ningún rol del módulo.
    expect(otorgan).toEqual([]);
    expect(rolesQueOtorgan('contratacion.config.manage')).toContain('DIRECTOR_CONTRATACION');
  });
});

/**
 * Las cuatro filas que la matriz agrega, que son las que el formato describía
 * y ninguna historia había necesitado.
 */
describe('las filas que faltaban (EFDS-1183)', () => {
  it('el estructurador técnico elabora el estudio previo pero no lo aprueba', () => {
    const suyos = permisosDelRol('ESTRUCTURADOR_TECNICO');

    expect(suyos).toContain('contratacion.proceso.create');
    expect(suyos).toContain('contratacion.actividad.edit');
    expect(suyos).toContain('contratacion.actividad.send');
    expect(suyos).toContain('contratacion.documento.upload');
    // Elabora y pasa a aprobación del jefe de área: la aprobación no es suya.
    expect(suyos).not.toContain('contratacion.actividad.approve');
    expect(suyos).not.toContain('contratacion.proceso.view-all');
  });

  it('el apoyo a la supervisión solo consulta y reporta', () => {
    const suyos = permisosDelRol('APOYO_SUPERVISION');

    expect(suyos).toContain('contratacion.reporte.view');
    expect(suyos).toContain('contratacion.seguimiento.ver');
    expect(suyos).toContain('contratacion.expediente.view');
    // Su atributo en el formato es «consulta y reportes»: nada que escriba.
    for (const escribe of [
      'contratacion.proceso.create',
      'contratacion.proceso.edit',
      'contratacion.actividad.edit',
      'contratacion.documento.upload',
      'contratacion.seguimiento.cargar',
      'contratacion.config.manage',
    ]) {
      expect(suyos).not.toContain(escribe);
    }
  });

  it('el ente de control entra por la auditoría y no por el expediente de trabajo', () => {
    const suyos = permisosDelRol('ENTE_DE_CONTROL');

    expect(suyos).toEqual(['contratacion.expediente.auditar']);
  });

  it('el administrador del módulo no toca ningún proceso', () => {
    // Las dos únicas casillas que la Hoja1 del formato le marca.
    expect(permisosDelRol('ADMINISTRADOR_CONTRATACION').sort()).toEqual(
      ['contratacion.config.manage', 'contratacion.reporte.view'].sort(),
    );
  });
});

/**
 * Lo que el microfrontend le pregunta al backend sobre quien está mirando.
 */
describe('loQuePuedeHacer', () => {
  it('dice sus roles del módulo con nombre y sus permisos', () => {
    const suyo = loQuePuedeHacer({ roles: ['gestor_contratacion'] });

    expect(suyo.roles).toEqual(['GESTOR_CONTRATACION']);
    expect(suyo.rolesDeContratacion.map((r) => r.nombre)).toEqual(['Gestor de Contratación']);
    expect(suyo.permisos).toContain('contratacion.actividad.edit');
  });

  it('un rol ajeno al módulo no aparece como rol de contratación', () => {
    const suyo = loQuePuedeHacer({ roles: ['JEFE_GESTION_LEGAL', 'SUPERVISOR_CONTRATO'] });

    expect(suyo.roles).toEqual(['JEFE_GESTION_LEGAL', 'SUPERVISOR_CONTRATO']);
    expect(suyo.rolesDeContratacion.map((r) => r.codigo)).toEqual(['SUPERVISOR_CONTRATO']);
  });

  it('sin roles no puede nada', () => {
    expect(loQuePuedeHacer({}).permisos).toEqual([]);
  });
});

describe('la matriz completa', () => {
  it('se entrega sin confirmar mientras Contratación no la ratifique', () => {
    // Igual que los umbrales de cuantía y los plazos: la pantalla tiene que
    // poder decir que es la lectura del equipo y no una decisión de la entidad.
    expect(MATRIZ_CONFIRMADA).toBe(false);
    expect(matrizDeRoles().confirmada).toBe(false);
  });

  it('trae las catorce filas con sus columnas', () => {
    const matriz = matrizDeRoles();

    expect(matriz.roles).toHaveLength(14);
    expect(matriz.permisos).toHaveLength(CATALOGO_PERMISOS.length);
    expect(matriz.roles.every((r) => Array.isArray(r.permisos))).toBe(true);
  });
});
