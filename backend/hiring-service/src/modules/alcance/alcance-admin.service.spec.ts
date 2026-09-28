import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AlcanceAdminService } from './alcance-admin.service';

const ROL = '11111111-1111-4111-8111-111111111111';
const acceso = { userId: 'u-1', userName: 'admin@esap.edu.co', roles: ['ADMINISTRADOR_CONTRATACION'], puedeEditar: false };

/**
 * Guardar la matriz de un rol (subtarea 6 de la 083).
 *
 * Reemplazar es apagar lo que sobra e insertar lo que falta, sin tocar lo que
 * se queda: así la fila conserva quién la dio y cuándo.
 */
function montar(actuales: any[], opciones: { rolExiste?: boolean; numerales?: string[] } = {}) {
  const consultas: { sql: string; params: any[] }[] = [];
  const em = {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      consultas.push({ sql, params });
      if (sql.includes('FROM auth.role WHERE')) return opciones.rolExiste === false ? [] : [{ id: ROL }];
      if (sql.includes('FROM hiring.actividades')) {
        return (opciones.numerales ?? params[0]).map((numeral: string) => ({ numeral }));
      }
      if (sql.includes('FROM hiring.alcances_permiso') && sql.includes('rol_id::text = $1')) return actuales;
      return [];
    }),
  };
  const dataSource = {
    transaction: async (cb: (em: any) => Promise<any>) => cb(em),
    query: jest.fn(async () => []),
  };
  const alcance = { limpiarCache: jest.fn(), deRoles: jest.fn(async () => []) };
  const permisos = { permisosDeRoles: jest.fn(async () => []) };
  const service = new AlcanceAdminService(dataSource as never, alcance as never, permisos as never);
  // `roles()` relee la matriz entera; aquí solo interesa lo que se escribió.
  jest.spyOn(service, 'roles').mockResolvedValue([{ id: ROL } as never]);
  return { service, consultas, alcance };
}

const fila = (id: string, accion: string, etapa: number | null, numeral: string | null) => ({
  id,
  accion,
  etapa,
  numeral,
  tramite: null,
});

describe('AlcanceAdminService · guardar', () => {
  it('apaga lo que sobra, inserta lo que falta y no toca lo que se queda', async () => {
    const { service, consultas, alcance } = montar([
      fila('a-queda', 'ver', 3, null),
      fila('a-sobra', 'ver', 4, null),
    ]);

    await service.guardar(
      ROL,
      [
        { accion: 'ver', lugar: 'E3' },
        { accion: 'ver', lugar: '7.2' },
      ],
      acceso,
    );

    const apagado = consultas.find((c) => c.sql.includes('SET activo = false'));
    expect(apagado?.params[0]).toEqual(['a-sobra']);

    const insertados = consultas.filter((c) => c.sql.includes('INSERT INTO hiring.alcances_permiso'));
    expect(insertados.map((c) => c.params.slice(1, 5))).toEqual([['ver', null, '7.2', null]]);
    // Lo decidió una persona: entra con su nombre.
    expect(insertados[0].params[5]).toBe('admin@esap.edu.co');

    expect(alcance.limpiarCache).toHaveBeenCalled();
  });

  it('lo que se queda queda ratificado', async () => {
    // La siembra entra sin confirmar; guardar el rol es que alguien la vio.
    const { service, consultas } = montar([fila('a-queda', 'ver', 3, null)]);

    await service.guardar(ROL, [{ accion: 'ver', lugar: 'E3' }], acceso);

    const ratificado = consultas.find((c) => c.sql.includes('SET confirmado = true'));
    expect(ratificado?.params[0]).toEqual(['a-queda']);
  });

  it('con la lista vacía apaga todo el alcance del rol', async () => {
    const { service, consultas } = montar([fila('a-1', 'editar', null, '4.2')]);

    await service.guardar(ROL, [], acceso);

    expect(consultas.find((c) => c.sql.includes('SET activo = false'))?.params[0]).toEqual(['a-1']);
    expect(consultas.some((c) => c.sql.includes('INSERT'))).toBe(false);
  });

  it('rechaza un punto que no existe o está retirado de la matriz', async () => {
    const { service } = montar([], { numerales: [] });

    await expect(service.guardar(ROL, [{ accion: 'ver', lugar: '5.8' }], acceso)).rejects.toThrow(
      'No existe la actividad 5.8',
    );
  });

  it('rechaza un lugar mal escrito antes de tocar la base', async () => {
    const { service, consultas } = montar([]);

    await expect(service.guardar(ROL, [{ accion: 'ver', lugar: 'E' }], acceso)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(consultas).toEqual([]);
  });

  it('un rol que no existe es 404', async () => {
    const { service } = montar([], { rolExiste: false });

    await expect(service.guardar(ROL, [], acceso)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AlcanceAdminService · mio', () => {
  it('devuelve los alcances como lugar y solo los permisos transversales', async () => {
    const dataSource = { query: jest.fn() };
    const alcance = {
      deRoles: jest.fn(async () => [
        { accion: 'ver', etapa: 3, numeral: null, tramite: null },
        { accion: 'editar', etapa: null, numeral: '7.2', tramite: null },
      ]),
    };
    const permisos = {
      permisosDeRoles: jest.fn(async () => [
        'contratacion.ver',
        'contratacion.config.manage',
        'contratacion.actividad.edit',
      ]),
    };
    const service = new AlcanceAdminService(dataSource as never, alcance as never, permisos as never);

    await expect(service.mio({ roles: ['X'] })).resolves.toEqual({
      alcances: [
        { accion: 'ver', lugar: 'E3' },
        { accion: 'editar', lugar: '7.2' },
      ],
      transversales: ['contratacion.config.manage'],
    });
  });
});
