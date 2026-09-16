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
});
