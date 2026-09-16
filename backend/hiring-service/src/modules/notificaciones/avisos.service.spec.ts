import { BadRequestException } from '@nestjs/common';

import { AvisosService } from './avisos.service';

/** Los avisos de cada actividad, con lo sugerido mientras nadie los cambie (EFDS-1183). */
describe('AvisosService', () => {
  const acceso = { userId: 'u1', userName: 'director@esap.edu.co', roles: [], puedeEditar: true } as never;

  const conFilas = (filas: any[]) => {
    const query = jest.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes('FROM hiring.avisos')) return filas;
      if (sql.includes('FROM auth.role')) return [{ code: 'DIRECTOR_CONTRATACION', name: 'Director de Contratación' }];
      return [];
    });
    return { srv: new AvisosService({ query } as never), query };
  };

  it('sin nada configurado, la actividad avisa con lo sugerido', async () => {
    // Así las 55 actividades avisan desde el primer día sin configurarlas.
    const { srv } = conFilas([]);
    const { avisos } = await srv.deActividad('3.2');
    const devuelta = avisos.find((a) => a.evento === 'DEVUELTA');

    expect(devuelta).toMatchObject({ activo: true, papeles: ['QUIEN_ENVIO'], personalizado: false });
  });

  it('solo ofrece los eventos que pueden pasar en esa actividad', async () => {
    const { srv } = conFilas([]);

    expect((await srv.deActividad('3.2')).avisos.map((a) => a.evento)).not.toContain('ABOGADO_ASIGNADO');
    expect((await srv.deActividad('3.4')).avisos.map((a) => a.evento)).toContain('ABOGADO_ASIGNADO');
  });

  it('lo configurado manda sobre lo sugerido, y dice el rol por su nombre', async () => {
    const { srv } = conFilas([
      { evento: 'DEVUELTA', activo: true, papeles: [], roles: ['DIRECTOR_CONTRATACION'] },
    ]);
    const devuelta = (await srv.deActividad('3.2')).avisos.find((a) => a.evento === 'DEVUELTA');

    expect(devuelta).toMatchObject({
      personalizado: true,
      papeles: [],
      roles: [{ code: 'DIRECTOR_CONTRATACION', name: 'Director de Contratación' }],
    });
  });

  it('sin la tabla no se cae: rige lo sugerido', async () => {
    const srv = new AvisosService({ query: jest.fn().mockRejectedValue(new Error('no existe')) } as never);

    expect((await srv.queRige('3.2', 'DEVUELTA')).activo).toBe(true);
  });

  it('no deja encender un aviso sin nadie a quien avisar', async () => {
    const { srv, query } = conFilas([]);

    await expect(srv.guardar('3.1', 'PROCESO_RADICADO', { activo: true }, acceso)).rejects.toThrow(
      'Elige a quién avisar antes de encenderlo',
    );
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT'))).toBe(false);
  });

  it('guarda por actividad y conserva lo que no se manda', async () => {
    const { srv, query } = conFilas([]);

    await srv.guardar('3.2', 'APROBADA', { activo: false }, acceso);

    const insert = query.mock.calls.find(([sql]) => String(sql).includes('INSERT'));
    expect(insert?.[1]).toEqual(['3.2', 'APROBADA', false, '["QUIEN_ENVIO"]', '[]', 'director@esap.edu.co']);
  });

  it('rechaza avisos que no son de esa actividad y papeles que no existen', async () => {
    const { srv } = conFilas([]);

    await expect(srv.guardar('3.2', 'ABOGADO_ASIGNADO', { activo: false }, acceso)).rejects.toThrow(
      BadRequestException,
    );
    await expect(srv.guardar('3.2', 'APROBADA', { papeles: ['JEFE'] }, acceso)).rejects.toThrow(
      'Alguno de los papeles no existe',
    );
  });
});
