import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RiesgoSeguimientosService } from './riesgo-seguimientos.service';

describe('RiesgoSeguimientosService', () => {
    const HOY = new Date('2026-06-10T15:00:00Z'); // Cuatrimestre 2 de 2026 abierto
    let riesgo: any;
    let guardados: any[];
    let timeline: any[];
    let service: RiesgoSeguimientosService;
    let notifications: { notifyRiesgoSeguimientoVencido: jest.Mock };
    let config: { findByKey: jest.Mock };

    const seguimientoRepo = {
        create: jest.fn((d: any) => ({ id: `seg-${guardados.length + 1}`, createdAt: new Date(), ...d })),
        save: jest.fn(async (e: any) => {
            if (!guardados.includes(e)) {
                if (guardados.some(g => g.riesgoId === e.riesgoId && g.controlId === e.controlId && g.vigencia === e.vigencia && g.cuatrimestre === e.cuatrimestre)) {
                    throw Object.assign(new Error('duplicado'), { code: '23505' });
                }
                guardados.push(e);
            }
            return e;
        }),
        find: jest.fn(async ({ where }: any) =>
            guardados.filter(g => g.riesgoId === where.riesgoId)
                .sort((a, b) => b.fechaEjecucion.localeCompare(a.fechaEjecucion))),
        findOne: jest.fn(async ({ where }: any) => {
            const lista = guardados.filter(g => Object.entries(where).every(([k, v]) => g[k] === v))
                .sort((a, b) => b.fechaEjecucion.localeCompare(a.fechaEjecucion));
            return lista[0] ?? null;
        }),
        count: jest.fn(async ({ where }: any) => guardados.filter(g => Object.entries(where).every(([k, v]) => g[k] === v)).length),
    };
    const riesgoRepo = {
        findOne: jest.fn(async ({ where }: any) => (where.id === riesgo.id ? riesgo : null)),
        find: jest.fn(async () => [riesgo]),
        save: jest.fn(async (r: any) => r),
    };
    const historialRepo = {
        create: jest.fn((d: any) => d),
        save: jest.fn(async (e: any) => { timeline.push(e); return e; }),
        count: jest.fn(async ({ where }: any) =>
            timeline.filter(t => t.riesgoId === where.riesgoId && t.tipoEvento === where.tipoEvento && t.campoModificado === where.campoModificado).length),
    };

    const datos = { cuatrimestre: '2', fechaEjecucion: '2026-06-05', comentarios: 'Se revisó con el abogado', resultado: 'APLICADO', efectividad: '80' };
    const quien = { userId: 'u-1', userName: 'Ana Ruiz' };
    const archivo = { originalname: 'acta.pdf', filename: 'abc123.pdf', size: 1024 };

    beforeEach(() => {
        jest.clearAllMocks();
        guardados = [];
        timeline = [];
        riesgo = {
            id: 'r-1', codigo: 'R-2026-006', nombre: 'Riesgo', estado: 'ACTIVO', responsableId: 'resp-1',
            createdAt: new Date('2026-01-15T00:00:00Z'),
            controlesExistentes: [{ id: 'c-1', descripcion: 'Monitoreo constante', efectividad: 90 }, { descripcion: 'Control antiguo sin id', efectividad: 40 }],
        };
        notifications = { notifyRiesgoSeguimientoVencido: jest.fn().mockResolvedValue(undefined) };
        config = { findByKey: jest.fn().mockResolvedValue(null) };
        service = new RiesgoSeguimientosService(riesgoRepo as any, seguimientoRepo as any, historialRepo as any, config as any, notifications as any);
    });

    it('registra el seguimiento con el usuario autenticado, evidencias y evento en el Timeline', async () => {
        const r = await service.crear('r-1', 'c-1', datos, [archivo], quien, HOY);
        expect(r).toMatchObject({ cuatrimestre: 2, vigencia: 2026, responsable: 'Ana Ruiz', responsableId: 'u-1', resultado: 'APLICADO', efectividad: 80, editable: true });
        expect(r.evidencias).toEqual([{ nombre: 'acta.pdf', archivo: 'abc123.pdf', url: 'files/abc123.pdf', tipo: 'pdf', tamano: 1024 }]);
        expect(timeline).toHaveLength(1);
        expect(timeline[0]).toMatchObject({ tipoEvento: 'SEGUIMIENTO_CONTROL', usuario: 'Ana Ruiz' });
        expect(timeline[0].descripcion).toMatch(/Cuatrimestre 2 2026.*Aplicado \(80%/);
    });

    it('la efectividad del control pasa a ser la del último seguimiento', async () => {
        await service.crear('r-1', 'c-1', datos, [], quien, HOY);
        expect(riesgo.controlesExistentes[0].efectividad).toBe(80);
        expect(riesgo.controlesExistentes[1].efectividad).toBe(40);
        const vista = await service.listar('r-1', undefined, HOY);
        expect(vista.controles[0].efectividad).toBe(80);
    });

    it('permite hacer seguimiento a controles antiguos sin id', async () => {
        const r = await service.crear('r-1', 'idx-1', datos, [], quien, HOY);
        expect(r.controlId).toBe('idx-1');
    });

    it('solo un seguimiento por control y cuatrimestre', async () => {
        await service.crear('r-1', 'c-1', datos, [], quien, HOY);
        await expect(service.crear('r-1', 'c-1', datos, [], quien, HOY)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rechaza datos inválidos con todos los mensajes y descarta los archivos subidos', async () => {
        await expect(service.crear('r-1', 'c-1', { ...datos, comentarios: '', fechaEjecucion: '2026-06-11' }, [archivo], quien, HOY))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(guardados).toHaveLength(0);
    });

    it('aplica el tamaño máximo parametrizable de evidencias', async () => {
        config.findByKey.mockResolvedValue({ value: { maxMb: 1 } });
        const grande = { originalname: 'g.pdf', filename: 'g.pdf', size: 2 * 1024 * 1024 };
        await expect(service.crear('r-1', 'c-1', datos, [grande], quien, HOY)).rejects.toThrow(BadRequestException);
        expect((await service.getConfig()).maxMb).toBe(1);
    });

    it('no registra en un cuatrimestre cerrado ni en un riesgo archivado', async () => {
        const c1 = { ...datos, cuatrimestre: '1', fechaEjecucion: '2026-03-10' };
        // El cuatrimestre se deriva de la fecha actual: en junio solo está abierto el 2
        await expect(service.crear('r-1', 'c-1', c1, [], quien, HOY)).rejects.toBeInstanceOf(ForbiddenException);
        riesgo.estado = 'ARCHIVADO';
        await expect(service.crear('r-1', 'c-1', datos, [], quien, HOY)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('control inexistente -> 404', async () => {
        await expect(service.crear('r-1', 'nope', datos, [], quien, HOY)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('edita mientras el cuatrimestre está abierto y recalcula la efectividad', async () => {
        const creado = await service.crear('r-1', 'c-1', datos, [archivo], quien, HOY);
        const editado = await service.actualizar('r-1', creado.id, { ...datos, efectividad: '60', comentarios: 'Ajuste' }, [], [], quien, HOY);
        expect(editado).toMatchObject({ efectividad: 60, comentarios: 'Ajuste' });
        expect(editado.evidencias).toEqual([]); // la evidencia no conservada se retira
        expect(riesgo.controlesExistentes[0].efectividad).toBe(60);
        expect(timeline).toHaveLength(2);
        expect(timeline[1].descripcion).toMatch(/Seguimiento actualizado/);
    });

    it('al editar sin evidenciasConservar mantiene las existentes y suma las nuevas', async () => {
        const creado = await service.crear('r-1', 'c-1', datos, [archivo], quien, HOY);
        const nuevo = { originalname: 'otro.png', filename: 'zzz.png', size: 10 };
        const editado = await service.actualizar('r-1', creado.id, datos, [nuevo], null, quien, HOY);
        expect(editado.evidencias.map(e => e.archivo)).toEqual(['abc123.pdf', 'zzz.png']);
    });

    it('queda en solo lectura cuando el cuatrimestre se cierra', async () => {
        const creado = await service.crear('r-1', 'c-1', datos, [], quien, HOY);
        const septiembre = new Date('2026-09-02T15:00:00Z');
        await expect(service.actualizar('r-1', creado.id, datos, [], null, quien, septiembre)).rejects.toBeInstanceOf(ForbiddenException);
        const vista = await service.listar('r-1', undefined, septiembre);
        expect(vista.controles[0].cortes[1].seguimiento?.editable).toBe(false);
        expect(vista.controles[0].cortes[1].estado).toBe('REGISTRADO');
    });

    it('lista los tres cortes con su estado: Registrado, Pendiente y Vencido', async () => {
        await service.crear('r-1', 'c-1', datos, [], quien, HOY);
        const vista = await service.listar('r-1', undefined, HOY);
        const cortes = vista.controles[0].cortes;
        expect(cortes.map(c => c.label)).toEqual(['Cuatrimestre 1', 'Cuatrimestre 2', 'Cuatrimestre 3']);
        expect(cortes.map(c => c.estado)).toEqual(['VENCIDO', 'REGISTRADO', 'PENDIENTE']);
        expect(cortes.map(c => c.puedeRegistrar)).toEqual([false, true, false]);
        expect(vista.historial).toHaveLength(1);
    });

    describe('notificarVencidos', () => {
        const JUNIO = new Date('2026-06-10T15:00:00Z');

        it('notifica una sola vez por control sin seguimiento en el último cuatrimestre cerrado', async () => {
            const n1 = await service.notificarVencidos(JUNIO);
            expect(n1).toBe(2); // los dos controles
            expect(notifications.notifyRiesgoSeguimientoVencido).toHaveBeenCalledWith(expect.objectContaining({
                abogadoId: 'resp-1', cuatrimestreLabel: 'Cuatrimestre 1', vigencia: 2026,
            }));
            const n2 = await service.notificarVencidos(JUNIO);
            expect(n2).toBe(0); // dedupe: no repite al día siguiente
        });

        it('no notifica a los controles que sí tienen seguimiento en ese corte', async () => {
            await service.crear('r-1', 'c-1', { ...datos, cuatrimestre: '1', fechaEjecucion: '2026-03-10' }, [], quien, new Date('2026-03-20T15:00:00Z'));
            expect(await service.notificarVencidos(JUNIO)).toBe(1);
        });

        it('no notifica riesgos creados después del cierre del corte', async () => {
            riesgo.createdAt = new Date('2026-05-20T00:00:00Z');
            expect(await service.notificarVencidos(JUNIO)).toBe(0);
        });
    });
});
