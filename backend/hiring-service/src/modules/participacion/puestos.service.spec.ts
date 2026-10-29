import { PuestosService } from './puestos.service';

/**
 * El diagnóstico de los puestos (109): lo que la configuración deja sin
 * salida, dicho con lo que hay que hacer.
 */
describe('PuestosService.diagnostico', () => {
  const armar = (puestos: { id: string; nombre: string; activo: boolean; obligatorio: boolean }[]) => {
    const dataSource = { getRepository: () => ({ find: async () => puestos }) } as any;
    const service = new PuestosService(dataSource, {} as any);
    jest.spyOn(service, 'usos').mockResolvedValue([]);
    return service;
  };

  it('avisa del puesto obligatorio que no hace ni aprueba nada', async () => {
    const service = armar([{ id: 'p-1', nombre: 'Segundo abogado', activo: true, obligatorio: true }]);

    const problemas = await service.diagnostico();

    expect(problemas).toEqual([
      expect.objectContaining({ puestoId: 'p-1', mensaje: expect.stringMatching(/Segundo abogado es obligatorio pero no hace/) }),
    ]);
  });

  it('un puesto sin uso que no es obligatorio no molesta a nadie', async () => {
    const service = armar([
      { id: 'p-1', nombre: 'Jefe', activo: true, obligatorio: false },
      { id: 'p-2', nombre: 'Archivado', activo: false, obligatorio: true },
    ]);

    expect(await service.diagnostico()).toEqual([]);
  });
});
