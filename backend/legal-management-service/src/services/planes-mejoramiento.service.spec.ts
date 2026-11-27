import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanesMejoramientoService } from './planes-mejoramiento.service';

describe('PlanesMejoramientoService (Bug 2418 PHVA, pesos, cumplimiento y trazabilidad)', () => {
  let service: PlanesMejoramientoService;
  let planStore: any;
  let hallazgosStore: any[];
  let seguimientosStore: any[];

  beforeEach(() => {
    planStore = {
      id: 'plan-1',
      codigo: 'PM-2026-001',
      titulo: 'Plan de prueba',
      origen: 'OCI',
      estado: 'EN_EJECUCION',
      avancePorcentaje: 0,
      fechaCierreReal: null,
      evidencias: [],
      seguimientos: [],
      comentarios: [],
      hallazgos: [],
    };
    hallazgosStore = [];
    seguimientosStore = [];
    let seq = 1;

    const planRepo: any = {
      findOne: jest.fn(async ({ where }: any) => (where?.id === planStore.id ? { ...planStore, hallazgos: [...hallazgosStore], seguimientos: [...seguimientosStore] } : null)),
      findOneBy: jest.fn(async ({ id }: any) => (id === planStore.id ? planStore : null)),
      save: jest.fn(async (p: any) => {
        Object.assign(planStore, p);
        return planStore;
      }),
    };

    const hallazgoRepo: any = {
      find: jest.fn(async () => [...hallazgosStore]),
      findOneBy: jest.fn(async ({ id }: any) => hallazgosStore.find((h) => h.id === id) || null),
      create: jest.fn((data: any) => ({
        id: `acc-${seq++}`,
        createdAt: new Date(Date.now() + seq * 1000),
        updatedAt: new Date(),
        ...data,
      })),
      save: jest.fn(async (entityOrArray: any) => {
        if (Array.isArray(entityOrArray)) {
          for (const item of entityOrArray) {
            const idx = hallazgosStore.findIndex((h) => h.id === item.id);
            if (idx >= 0) hallazgosStore[idx] = { ...hallazgosStore[idx], ...item };
            else hallazgosStore.push(item);
          }
          return entityOrArray;
        }
        const idx = hallazgosStore.findIndex((h) => h.id === entityOrArray.id);
        if (idx >= 0) hallazgosStore[idx] = { ...hallazgosStore[idx], ...entityOrArray };
        else hallazgosStore.push(entityOrArray);
        return entityOrArray;
      }),
      remove: jest.fn(async (entity: any) => {
        hallazgosStore = hallazgosStore.filter((h) => h.id !== entity.id);
        return entity;
      }),
    };

    const seguimientoRepo: any = {
      create: jest.fn((data: any) => ({ id: `seg-${seguimientosStore.length + 1}`, fechaReporte: new Date(), ...data })),
      save: jest.fn(async (s: any) => {
        seguimientosStore.push(s);
        return s;
      }),
    };

    const emptyRepo: any = { find: jest.fn(async () => []), create: jest.fn(), save: jest.fn() };
    const dataSource: any = { query: jest.fn(async () => []), getRepository: jest.fn(() => emptyRepo) };

    service = new PlanesMejoramientoService(
      planRepo,
      emptyRepo,
      seguimientoRepo,
      emptyRepo,
      hallazgoRepo,
      dataSource,
    );
  });

  it('rechaza crear acción sin fase PHVA válida', async () => {
    await expect(
      service.createHallazgo('plan-1', { nombre: 'Acción sin fase' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createHallazgo('plan-1', { nombre: 'Acción inválida', fasePhva: 'OTRA' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('asigna pesos automáticos (33.33, 33.33, 33.34), actualiza cumplimiento y completa el plan al 100%', async () => {
    const a1 = await service.createHallazgo('plan-1', {
      nombre: 'Definir protocolo',
      fasePhva: 'Planear',
      responsable: 'Ana',
      fechaLimite: '2026-12-15',
    });
    expect(a1.pesoPorcentual).toBe(100);
    expect(a1.fasePhva).toBe('PLANEAR');

    const a2 = await service.createHallazgo('plan-1', {
      nombre: 'Implementar control',
      fasePhva: 'Hacer',
    });
    const a3 = await service.createHallazgo('plan-1', {
      nombre: 'Verificar auditoría',
      fasePhva: 'Verificar',
    });

    expect(hallazgosStore.map((h) => Number(h.pesoPorcentual))).toEqual([33.33, 33.33, 33.34]);
    expect(planStore.avancePorcentaje).toBe(0);

    // Ejecutar acción 1 -> 33.33%
    const r1 = await service.cambiarEstadoHallazgo(a1.id, { estado: 'EJECUTADA' });
    expect(r1.estado).toBe('EJECUTADA');
    expect(r1.fechaEjecucion).toBeTruthy();
    expect(planStore.avancePorcentaje).toBe(33.33);
    expect(planStore.estado).toBe('EN_EJECUCION');

    // Ejecutar acción 2 y 3 -> 100% y estado CERRADO (Completado)
    await service.cambiarEstadoHallazgo(a2.id, { estado: 'EJECUTADA' });
    await service.cambiarEstadoHallazgo(a3.id, { estado: 'EJECUTADA' });
    expect(planStore.avancePorcentaje).toBe(100);
    expect(planStore.estado).toBe('CERRADO');
    expect(planStore.fechaCierreReal).toBeTruthy();

    // Reabrir acción 3 -> 66.66% y vuelve a EN_EJECUCION
    const r3Reabierta = await service.cambiarEstadoHallazgo(a3.id, { estado: 'PENDIENTE' });
    expect(r3Reabierta.estado).toBe('PENDIENTE');
    expect(r3Reabierta.fechaEjecucion).toBeNull();
    expect(planStore.avancePorcentaje).toBe(66.66);
    expect(planStore.estado).toBe('EN_EJECUCION');
    expect(planStore.fechaCierreReal).toBeNull();

    // Eliminar acción 3 -> quedan 2 ejecutadas (50% + 50% = 100%) -> vuelve a CERRADO
    await service.deleteHallazgo(a3.id);
    expect(hallazgosStore.map((h) => Number(h.pesoPorcentual))).toEqual([50, 50]);
    expect(planStore.avancePorcentaje).toBe(100);
    expect(planStore.estado).toBe('CERRADO');

    // Trazabilidad registrada en Timeline (seguimientos)
    expect(seguimientosStore.length).toBeGreaterThanOrEqual(7);
    expect(seguimientosStore.some((s) => s.descripcionAvance.includes('Acción ejecutada [Planear]'))).toBe(true);
    expect(seguimientosStore.some((s) => s.descripcionAvance.includes('Acción reabierta [Verificar]'))).toBe(true);
    expect(seguimientosStore.some((s) => s.descripcionAvance.includes('Plan completado automáticamente'))).toBe(true);
  });

  it('lanza NotFoundException al cambiar estado de acción inexistente', async () => {
    await expect(
      service.cambiarEstadoHallazgo('no-existe', { estado: 'EJECUTADA' }),
    ).rejects.toThrow(NotFoundException);
  });
});
