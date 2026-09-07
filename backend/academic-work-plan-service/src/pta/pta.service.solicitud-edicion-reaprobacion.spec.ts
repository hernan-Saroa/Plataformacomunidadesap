import { PtaService } from './pta.service';

describe('PtaService - reaprobacion de componentes reabiertos', () => {
  it('mantiene pendiente un componente reenviado sin horas ni cambios', async () => {
    const service = Object.create(PtaService.prototype) as any;
    const investigacionPendiente = {
      ptaId: 'pta-1',
      componente: 'investigacion',
      estado: 'pendiente',
      scope: 'solicitud_edicion',
      scopeId: 'sol-1',
    };
    const save = jest.fn((value: any) => Promise.resolve(value));

    service.ptaComponentApprovalRepo = {
      find: jest.fn().mockResolvedValue([investigacionPendiente]),
      create: jest.fn((value: any) => value),
      save,
    };
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pta-1',
        datosEstructurados: {
          // El PTA tiene contenido, pero Investigacion continua sin horas.
          asignaturas: [{ total_horas: 120 }],
          investigacion_actividades: [],
          extension_actividades: [],
          complementarias: [],
        },
      }),
    };
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});

    const result = await service.getComponentesAprobacion('pta-1');
    const investigacion = result.find(
      (item: any) => item.componente === 'investigacion',
    );

    expect(investigacion).toMatchObject({
      estado: 'pendiente',
      estado_visual: 'pendiente',
      aplica: true,
      scope: 'solicitud_edicion',
      scopeId: 'sol-1',
    });
    expect(investigacionPendiente.estado).toBe('pendiente');
    expect(save).not.toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          componente: 'investigacion',
          estado: 'aprobado',
        }),
      ]),
    );
  });

  it('expone No aplica sin alterar la autoaprobacion tecnica del workflow', async () => {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaComponentApprovalRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value: any) => value),
      save: jest.fn((value: any) => Promise.resolve(value)),
    };
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pta-1',
        datosEstructurados: {
          asignaturas: [{ total_horas: 120 }],
          investigacion_actividades: [],
          extension_actividades: [],
          complementarias: [],
        },
      }),
    };
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({});

    const result = await service.getComponentesAprobacion('pta-1');
    const investigacion = result.find((item: any) => item.componente === 'investigacion');

    expect(investigacion).toMatchObject({
      estado: 'aprobado',
      estado_visual: 'no_aplica',
      aplica: false,
      horas: 0,
      aprobadorNombre: 'Sistema',
    });
  });
});
