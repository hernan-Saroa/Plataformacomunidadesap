import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReglaAlertaTermino } from '../entities/regla-alerta-termino.entity';
import { ReglasAlertaTerminoService } from './reglas-alerta-termino.service';

describe('ReglasAlertaTerminoService', () => {
    let service: ReglasAlertaTerminoService;
    let mockReglaRepo: any;

    beforeEach(async () => {
        mockReglaRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn((data: any) => Promise.resolve(data)),
            create: jest.fn((data: any) => data),
            remove: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReglasAlertaTerminoService,
                { provide: getRepositoryToken(ReglaAlertaTermino), useValue: mockReglaRepo },
            ],
        }).compile();

        service = module.get<ReglasAlertaTerminoService>(ReglasAlertaTerminoService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('findAll()', () => {
        it('debe retornar las reglas ordenadas por horasAnticipacion ascendente', async () => {
            mockReglaRepo.find.mockResolvedValue([{ id: '1', horasAnticipacion: 24 }]);

            const result = await service.findAll();

            expect(mockReglaRepo.find).toHaveBeenCalledWith({ order: { horasAnticipacion: 'ASC' } });
            expect(result).toEqual([{ id: '1', horasAnticipacion: 24 }]);
        });
    });

    describe('create()', () => {
        it('debe crear y persistir una regla nueva', async () => {
            const result = await service.create({ horasAnticipacion: 72, descripcion: 'Alerta 3 días' });

            expect(mockReglaRepo.create).toHaveBeenCalledWith({ horasAnticipacion: 72, descripcion: 'Alerta 3 días' });
            expect(mockReglaRepo.save).toHaveBeenCalled();
            expect(result.horasAnticipacion).toBe(72);
        });

        it('debe traducir una violación de UNIQUE (horasAnticipacion duplicado) a ConflictException', async () => {
            mockReglaRepo.save.mockRejectedValue({ code: '23505', message: 'duplicate key value violates unique constraint' });

            await expect(service.create({ horasAnticipacion: 72 })).rejects.toThrow(ConflictException);
        });

        it('debe propagar cualquier otro error de base de datos sin transformarlo', async () => {
            mockReglaRepo.save.mockRejectedValue({ code: '08006', message: 'connection failure' });

            await expect(service.create({ horasAnticipacion: 72 })).rejects.toMatchObject({ code: '08006' });
        });
    });

    describe('update()', () => {
        it('debe actualizar los campos de una regla existente', async () => {
            mockReglaRepo.findOne.mockResolvedValue({ id: 'r-1', horasAnticipacion: 72, activa: true });

            const result = await service.update('r-1', { activa: false });

            expect(result.activa).toBe(false);
            expect(mockReglaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'r-1', activa: false }));
        });

        it('debe lanzar NotFoundException si la regla no existe', async () => {
            mockReglaRepo.findOne.mockResolvedValue(null);

            await expect(service.update('no-existe', { activa: false })).rejects.toThrow(NotFoundException);
        });

        it('debe traducir una violación de UNIQUE al cambiar horasAnticipacion a un valor duplicado', async () => {
            mockReglaRepo.findOne.mockResolvedValue({ id: 'r-1', horasAnticipacion: 24, activa: true });
            mockReglaRepo.save.mockRejectedValue({ code: '23505' });

            await expect(service.update('r-1', { horasAnticipacion: 72 })).rejects.toThrow(ConflictException);
        });
    });

    describe('remove()', () => {
        it('debe eliminar una regla existente', async () => {
            mockReglaRepo.findOne.mockResolvedValue({ id: 'r-2' });

            await service.remove('r-2');

            expect(mockReglaRepo.remove).toHaveBeenCalledWith({ id: 'r-2' });
        });

        it('debe lanzar NotFoundException si la regla a eliminar no existe', async () => {
            mockReglaRepo.findOne.mockResolvedValue(null);

            await expect(service.remove('no-existe')).rejects.toThrow(NotFoundException);
            expect(mockReglaRepo.remove).not.toHaveBeenCalled();
        });
    });
});
