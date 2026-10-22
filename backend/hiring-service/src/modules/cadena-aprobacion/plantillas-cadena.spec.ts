import { BadRequestException, ConflictException } from '@nestjs/common';

import { PlantillasCadenaService } from './plantillas-cadena.service';

/**
 * Las plantillas de cadena en Configuración (migración 101).
 *
 * Lo que se fija: que una cadena inválida no se guarda —y se dice todo lo que
 * le falta a la vez— y que no se archiva una cadena que alguna actividad
 * exige hoy, porque esa actividad quedaría sin aprobación sin que nadie lo
 * decidiera.
 */
describe('PlantillasCadenaService', () => {
  const acceso = { userId: 'u-1', userName: 'admin@esap.edu.co', roles: [] } as never;

  const montar = (usos: { numeral: string }[] = []) => {
    const guardadas: any[] = [];
    const plantilla: any = { id: 'c-1', activa: true, escalones: [] };
    const repo = {
      findOne: jest.fn(async () => plantilla),
      create: (x: any) => x,
      save: jest.fn(async (x: any) => {
        guardadas.push(x);
        return { id: 'c-nueva', ...x };
      }),
    };
    const dataSource = {
      getRepository: () => repo,
      query: jest.fn(async () => usos),
    };
    return { servicio: new PlantillasCadenaService(dataSource as never, {} as never), guardadas, plantilla };
  };

  it('guarda una cadena bien formada', async () => {
    const { servicio, guardadas } = montar();

    await servicio.crear(
      {
        nombre: ' Técnico y director ',
        escalones: [
          { nombre: 'Técnico', roles: ['REVISOR_CONTRATACION'] },
          { nombre: 'Director', roles: ['DIRECTOR_CONTRATACION'], acciones: ['APROBAR', 'DEVOLVER', 'NEGAR'] },
        ],
      },
      acceso,
    );

    expect(guardadas[0]).toEqual(
      expect.objectContaining({ nombre: 'Técnico y director', permiteMismoAprobador: false }),
    );
    expect(guardadas[0].escalones.map((e: any) => e.acciones)).toEqual([
      ['APROBAR', 'DEVOLVER'],
      ['APROBAR', 'DEVOLVER', 'NEGAR'],
    ]);
  });

  it('rechaza una cadena sin nombre y sin quien decida, diciendo las dos cosas', async () => {
    const { servicio } = montar();

    await expect(
      servicio.crear({ nombre: '', escalones: [{ nombre: 'Uno', roles: [] }] }, acceso),
    ).rejects.toThrow(
      new BadRequestException(
        'La cadena necesita un nombre. El escalón 1 no tiene quién decida: elige un rol, una persona, un puesto o un papel',
      ),
    );
  });

  it('no archiva una cadena que alguna actividad exige hoy', async () => {
    const { servicio, plantilla } = montar([{ numeral: '5.2' }, { numeral: '8.1' }]);

    await expect(servicio.archivar('c-1', acceso)).rejects.toThrow(ConflictException);
    expect(plantilla.activa).toBe(true);
  });

  it('archiva la que nadie usa', async () => {
    const { servicio, plantilla } = montar([]);

    await servicio.archivar('c-1', acceso);
    expect(plantilla.activa).toBe(false);
  });
});
