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

/**
 * El rol del puesto (143): qué le falta para hacer lo que el puesto hace y
 * completarlo desde la configuración del puesto.
 */
describe('PuestosService · rol del puesto', () => {
  const uso = (numeral: string, accion: 'editar' | 'aprobar' | 'decidir') => ({
    puestoId: 'p-1',
    numeral,
    nombreActividad: `Actividad ${numeral}`,
    modalidad: null,
    como: 'HACE' as const,
    accion,
  });

  const armar = (opciones: {
    alcances: { accion: string; etapa: number | null; numeral: string | null; tramite: string | null }[];
    generales: string[];
    rolId?: string | null;
  }) => {
    const insertados: unknown[][] = [];
    const query = jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM hiring.alcances_permiso WHERE rol_id')) return opciones.alcances;
      if (sql.includes('auth.role_permissions')) return opciones.generales.map((code) => ({ code }));
      if (sql.includes('FROM auth.role WHERE id::text = ANY')) return [{ id: 'r-1', nombre: 'Abogado Estructurador' }];
      if (sql.includes('FROM auth.role WHERE id::text = $1')) return [{ id: 'r-1' }];
      return [];
    });
    const puesto = { id: 'p-1', nombre: 'Abogado estructurador', activo: true, rolId: opciones.rolId === undefined ? 'r-1' : opciones.rolId };
    const repo = () => ({ findOne: async () => puesto });
    const dataSource = {
      query,
      manager: { getRepository: repo },
      getRepository: repo,
      transaction: async (fn: (em: any) => Promise<void>) =>
        fn({ query: async (_sql: string, params: unknown[]) => insertados.push(params) }),
    } as any;
    const alcance = { limpiarCache: jest.fn() };
    const service = new PuestosService(dataSource, alcance as any);
    return { service, insertados, alcance };
  };

  it('cuenta como suyo lo que cubre el punto, la etapa o todo el módulo', async () => {
    const { service } = armar({
      alcances: [
        { accion: 'aprobar', etapa: null, numeral: '3.6', tramite: null },
        { accion: 'editar', etapa: 5, numeral: null, tramite: null },
        { accion: 'decidir', etapa: null, numeral: null, tramite: null },
        { accion: 'editar', etapa: null, numeral: '3.7', tramite: null },
      ],
      generales: ['contratacion.aprobar', 'contratacion.editar', 'contratacion.decidir'],
    });

    const r = await service.permisosDelRol('r-1', [
      uso('3.6', 'aprobar'),
      uso('3.7', 'aprobar'),
      uso('5.13', 'editar'),
      uso('6.2', 'decidir'),
    ]);

    expect(r).toEqual({ faltan: [{ accion: 'aprobar', numeral: '3.7', nombreActividad: 'Actividad 3.7' }], sinPermisoGeneral: [] });
  });

  it('completa solo lo que falta, punto por punto, y deja pendiente lo del permiso general', async () => {
    const { service, insertados, alcance } = armar({
      alcances: [],
      generales: ['contratacion.aprobar'],
    });
    jest.spyOn(service, 'usos').mockResolvedValue([uso('3.7', 'aprobar'), uso('5.13', 'editar')]);

    const r = await service.completarPermisos('p-1', { userName: 'directora' } as any);

    expect(insertados).toEqual([['r-1', 'aprobar', '3.7', 'directora']]);
    expect(r).toEqual({ rol: 'Abogado Estructurador', agregados: ['aprobar la 3.7'], pendientes: ['editar'] });
    expect(alcance.limpiarCache).toHaveBeenCalled();
  });

  it('sin rol no completa nada y dice qué hacer', async () => {
    const { service } = armar({ alcances: [], generales: [], rolId: null });

    await expect(service.completarPermisos('p-1', { userName: 'directora' } as any)).rejects.toThrow(/no tiene rol/);
  });
});
