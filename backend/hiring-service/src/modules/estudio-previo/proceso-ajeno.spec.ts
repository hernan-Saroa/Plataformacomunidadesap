import { NotFoundException } from '@nestjs/common';

import { EstudioPrevioService } from './estudio-previo.service';

/**
 * A qué proceso se puede entrar con el id en la mano (EFDS-1183).
 *
 * El listado ya filtraba —cada quien ve los suyos, salvo con «ver todos»— pero
 * consultar un proceso por su id no comprobaba nada: con el id, que viaja en
 * cada enlace que se comparte, se entraba al expediente de otra dependencia.
 */
describe('EstudioPrevioService · obtenerProceso de otro', () => {
  const servicio = (proceso: unknown, permisos: string[] = [], enProcesos: string[] = []) => {
    const dataSource = {
      getRepository: () => ({ findOne: async () => proceso }),
    };
    const permisosService = { permisosDeRoles: async () => permisos };
    // Estar en el proceso es la tercera vía de acceso desde que existe el
    // reparto: quien lo tomó y el abogado asignado no lo radicaron.
    const participacion = { procesosDe: async () => enProcesos };
    return new EstudioPrevioService(
      dataSource as never,
      {} as never,
      {} as never,
      participacion as never,
      permisosService as never,
      {} as never,
    );
  };

  const ajeno = { id: 'p-1', radicado: 'CTO-2026-0009', createdBy: 'otra.persona@esap.edu.co' };
  const quien = (userName: string) => ({ userName, roles: ['GESTOR_CONTRATACION'] }) as never;

  it('deja entrar al que uno mismo radicó', async () => {
    const propio = { ...ajeno, createdBy: 'yo@esap.edu.co' };

    await expect(servicio(propio).obtenerProceso('p-1', quien('yo@esap.edu.co'))).resolves.toBe(
      propio,
    );
  });

  it('no deja entrar al de otro', async () => {
    await expect(
      servicio(ajeno).obtenerProceso('p-1', quien('yo@esap.edu.co')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('responde 404 y no 403: no confirma que el proceso exista', async () => {
    // Un 403 le diría a quien no debe verlo que ese radicado es real.
    await expect(servicio(ajeno).obtenerProceso('p-1', quien('yo@esap.edu.co'))).rejects.toThrow(
      /no encontrado/i,
    );
  });

  it('con «ver todos» entra al de cualquiera', async () => {
    const conPermiso = servicio(ajeno, ['contratacion.proceso.view-all']);

    await expect(conPermiso.obtenerProceso('p-1', quien('yo@esap.edu.co'))).resolves.toBe(ajeno);
  });

  it('sin acceso no filtra, que es como lo llaman los demás servicios', async () => {
    // `obtenerProceso` se usa internamente sin sesión; filtrar ahí romperia
    // los paneles que resuelven el proceso antes de comprobar nada.
    await expect(servicio(ajeno).obtenerProceso('p-1')).resolves.toBe(ajeno);
  });

  it('si el proceso no existe, tampoco', async () => {
    await expect(
      servicio(null).obtenerProceso('p-1', quien('yo@esap.edu.co')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('y deja entrar a quien está en el proceso aunque no lo haya radicado', async () => {
    // El abogado al que le repartieron el expediente y quien lo tomó de la
    // bandeja no aparecen en `createdBy`: sin esto recibirían 404 al abrir el
    // proceso que les toca trabajar.
    await expect(
      servicio(ajeno, [], ['p-1']).obtenerProceso('p-1', quien('yo@esap.edu.co')),
    ).resolves.toBe(ajeno);
  });
});
