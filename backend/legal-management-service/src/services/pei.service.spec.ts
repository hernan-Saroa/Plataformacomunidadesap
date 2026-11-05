import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PeiIndicador } from '../entities/pei-indicador.entity';
import { PeiRegistroAvance } from '../entities/pei-registro-avance.entity';
import { PeiService } from './pei.service';

describe('PeiService', () => {
    let service: PeiService;
    let mockIndicadorRepo: any;
    let mockRegistroRepo: any;
    let queryBuilder: any;

    const buildIndicador = (metaObjetivo = 100) => ({
        id: 1,
        metaObjetivo,
        fechaFin: '2026-12-31',
        registros: [],
    });

    beforeEach(async () => {
        queryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };
        mockIndicadorRepo = {
            findOne: jest.fn().mockResolvedValue(buildIndicador()),
            create: jest.fn((data: any) => data),
            save: jest.fn((data: any) => Promise.resolve(data)),
            createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
        };
        mockRegistroRepo = {
            create: jest.fn((data: any) => data),
            save: jest.fn((data: any) => Promise.resolve({ id: 10, ...data })),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PeiService,
                { provide: getRepositoryToken(PeiIndicador), useValue: mockIndicadorRepo },
                { provide: getRepositoryToken(PeiRegistroAvance), useValue: mockRegistroRepo },
            ],
        }).compile();

        service = module.get<PeiService>(PeiService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('registrarAvance() — observaciones', () => {
        it('debe persistir las observaciones recibidas en el registro de avance', async () => {
            await service.registrarAvance(1, 50, 'Todo en orden', 'user-1');

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ observaciones: 'Todo en orden' }),
            );
        });

        it('debe guardar null cuando no se envían observaciones', async () => {
            await service.registrarAvance(1, 50);

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ observaciones: null }),
            );
        });
    });

    describe('registrarAvance() — evidencia', () => {
        it('debe persistir la evidenciaUrl recibida (archivo subido o url externa)', async () => {
            await service.registrarAvance(1, 50, undefined, undefined, 'files/abc123.pdf');

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ evidenciaUrl: 'files/abc123.pdf' }),
            );
        });

        it('debe guardar evidenciaUrl como null cuando no se adjunta archivo ni url', async () => {
            await service.registrarAvance(1, 50);

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ evidenciaUrl: null }),
            );
        });
    });

    describe('registrarAvance() — cálculo de porcentaje', () => {
        it('debe calcular el porcentaje como (valorReportado / metaObjetivo) * 100', async () => {
            mockIndicadorRepo.findOne.mockResolvedValue(buildIndicador(200));

            await service.registrarAvance(1, 50);

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ porcentajeAvance: 25 }),
            );
        });

        it('debe limitar el porcentaje a 100 cuando el valor reportado supera la meta', async () => {
            mockIndicadorRepo.findOne.mockResolvedValue(buildIndicador(100));

            await service.registrarAvance(1, 150);

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ porcentajeAvance: 100 }),
            );
        });

        it('debe limitar el porcentaje a 0 cuando el valor reportado es negativo', async () => {
            mockIndicadorRepo.findOne.mockResolvedValue(buildIndicador(100));

            await service.registrarAvance(1, -20);

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ porcentajeAvance: 0 }),
            );
        });

        it('debe devolver 0% cuando la meta del indicador es 0 (evita división por cero)', async () => {
            mockIndicadorRepo.findOne.mockResolvedValue(buildIndicador(0));

            await service.registrarAvance(1, 50);

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ porcentajeAvance: 0 }),
            );
        });
    });

    describe('registrarAvance() — resultado', () => {
        it('debe asociar el usuarioRegistraId recibido', async () => {
            await service.registrarAvance(1, 50, 'obs', 'user-99');

            expect(mockRegistroRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ usuarioRegistraId: 'user-99' }),
            );
        });

        it('debe retornar el registro guardado junto con el indicador actualizado y el avance global recalculado', async () => {
            mockRegistroRepo.save.mockResolvedValue({ id: 10, observaciones: 'ok' });
            queryBuilder.getMany.mockResolvedValue([
                { ...buildIndicador(), registros: [{ porcentajeAvance: 80, fechaRegistro: new Date() }] },
            ]);

            const result = await service.registrarAvance(1, 50, 'ok');

            expect(result.registro).toEqual({ id: 10, observaciones: 'ok' });
            expect(result.indicador).toBeDefined();
            expect(result.avanceGlobal).toBe(80);
        });
    });

    describe('responsable del indicador (bug 2415)', () => {
        const UID_A = 'a5f1b544-7fbe-4f73-8c34-cc39778f2010';

        it('createIndicador rechaza un responsable en texto libre (sin responsableId)', async () => {
            await expect(service.createIndicador({ nombre: 'X', responsableNombre: 'Dr Carlos perez' } as any))
                .rejects.toBeInstanceOf(BadRequestException);
            expect(mockIndicadorRepo.save).not.toHaveBeenCalled();
        });

        it('createIndicador rechaza un responsableId que no es UUID', async () => {
            await expect(service.createIndicador({ responsableId: '123', responsableNombre: 'Ana' } as any))
                .rejects.toBeInstanceOf(BadRequestException);
        });

        it('createIndicador guarda la referencia al usuario y el nombre de ese usuario', async () => {
            await service.createIndicador({ nombre: 'X', responsableId: UID_A, responsableNombre: ' Ana Lucia Abogada Prueba ' } as any);
            expect(mockIndicadorRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ responsableId: UID_A, responsableNombre: 'Ana Lucia Abogada Prueba' }),
            );
        });

        it('updateIndicador rechaza solo-nombre (texto libre) cuando se intenta cambiar el responsable', async () => {
            await expect(service.updateIndicador(1, { responsableNombre: 'Carlos Perez' } as any))
                .rejects.toBeInstanceOf(BadRequestException);
            expect(mockIndicadorRepo.save).not.toHaveBeenCalled();
        });

        it('updateIndicador sin tocar el responsable no lo valida ni lo marca como cambiado', async () => {
            mockIndicadorRepo.findOne.mockResolvedValue({ ...buildIndicador(), responsableId: UID_A, responsableNombre: 'Ana' });
            const res: any = await service.updateIndicador(1, { nombre: 'Nuevo nombre' } as any);
            expect(res.responsableCambiado).toBe(false);
        });

        it('updateIndicador devuelve el responsable anterior (queda en Auditoría) y no incluye el histórico', async () => {
            mockIndicadorRepo.findOne.mockResolvedValue({ ...buildIndicador(), responsableId: null, responsableNombre: 'Dr Carlos perez' });
            const res: any = await service.updateIndicador(1, { responsableId: UID_A, responsableNombre: 'Ana Lucia Abogada Prueba' } as any);
            expect(res).toEqual(expect.objectContaining({
                responsableId: UID_A,
                responsableNombre: 'Ana Lucia Abogada Prueba',
                responsableAnteriorId: null,
                responsableAnteriorNombre: 'Dr Carlos perez',
                responsableCambiado: true,
            }));
            expect(res.registros).toBeUndefined();
        });

        it('getDashboard marca los indicadores sin responsableId como pendientes de reasignación', async () => {
            queryBuilder.getMany.mockResolvedValue([
                { id: 1, fechaFin: '2099-01-01', registros: [], responsableId: null, responsableNombre: 'Carlos Perez' },
                { id: 2, fechaFin: '2099-01-01', registros: [], responsableId: UID_A, responsableNombre: 'Ana' },
            ]);
            const res = await service.getDashboard();
            expect(res.indicadores.map((i: any) => i.responsableSinReferencia)).toEqual([true, false]);
        });
    });
});
