import { BadRequestException, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';

import { EstudioPrevioService } from './estudio-previo.service';

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  unlink: jest.fn(async () => undefined),
}));

/**
 * El superadministrador borra un proceso (108).
 *
 * No hay cómo deshacerlo y la trazabilidad se va con el proceso, así que la
 * regla es estrecha: solo él, con el radicado escrito, y sin llevarse del
 * disco un archivo que otro documento siga usando.
 */
describe('EstudioPrevioService · borrar un proceso', () => {
  const proceso = { id: 'p-1', radicado: 'CTO-2026-0009' };

  const servicio = (opciones: {
    encontrado?: unknown;
    archivos?: string[];
    siguenEnUso?: string[];
    permisos?: string[];
  }) => {
    const em = {
      findOne: jest.fn(async () => ('encontrado' in opciones ? opciones.encontrado : proceso)),
      delete: jest.fn(async () => ({ affected: 1 })),
      query: jest.fn(async (sql: string) =>
        sql.includes('JOIN hiring.expedientes')
          ? (opciones.archivos ?? []).map((archivo_url) => ({ archivo_url }))
          : (opciones.siguenEnUso ?? []).map((archivo_url) => ({ archivo_url })),
      ),
    };
    const dataSource = { transaction: async (fn: (m: typeof em) => unknown) => fn(em) };
    const permisosService = { permisosDeRoles: async () => opciones.permisos ?? [] };
    const s = new EstudioPrevioService(
      dataSource as never,
      {} as never,
      {} as never,
      {} as never,
      permisosService as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { s, em };
  };

  const admin = { userName: 'admin@esap.edu.co', roles: ['SUPER_ADMIN'] } as never;
  const motivo = 'Proceso de prueba';

  beforeEach(() => (unlink as jest.Mock).mockClear());

  it('sin el radicado exacto no borra nada', async () => {
    const { s, em } = servicio({});

    await expect(
      s.borrarProceso('p-1', { radicado: 'CTO-2026-0008', motivo }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(em.delete).not.toHaveBeenCalled();
  });

  it('un proceso que no existe responde 404', async () => {
    const { s } = servicio({ encontrado: null });

    await expect(
      s.borrarProceso('p-1', { radicado: 'CTO-2026-0009', motivo }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('borra el proceso y sus archivos, salvo los que otro documento sigue usando', async () => {
    const { s, em } = servicio({
      archivos: ['hiring/files/a.pdf', 'hiring/files/b.pdf'],
      siguenEnUso: ['hiring/files/b.pdf'],
    });

    // Con espacios alrededor, como queda al pegarlo.
    const r = await s.borrarProceso('p-1', { radicado: ' CTO-2026-0009 ', motivo }, admin);

    expect(em.delete).toHaveBeenCalledWith(expect.anything(), { id: 'p-1' });
    expect(r).toEqual({ radicado: 'CTO-2026-0009', archivosBorrados: 1 });
    expect(unlink).toHaveBeenCalledTimes(1);
    expect((unlink as jest.Mock).mock.calls[0][0]).toMatch(/a\.pdf$/);
  });

  it('solo el superadministrador puede borrar', async () => {
    expect(await servicio({}).s.puedeBorrar(admin)).toBe(true);
    expect(
      await servicio({}).s.puedeBorrar({ userName: 'g', roles: ['DIRECTOR_CONTRATACION'] } as never),
    ).toBe(false);
    // Un rol creado desde la administración con el permiso también puede.
    expect(
      await servicio({ permisos: ['contratacion.proceso.delete'] }).s.puedeBorrar({
        userName: 'g',
        roles: ['ROL_NUEVO'],
      } as never),
    ).toBe(true);
  });
});
