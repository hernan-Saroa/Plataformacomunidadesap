import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Expediente } from '../entities/expediente.entity';
import { NotaExpediente } from '../entities/nota-expediente.entity';
import { TareaExpediente } from '../entities/tarea-expediente.entity';
import { LegalNotificationsService } from './legal-notifications.service';
import { NotificationClientService } from './notification-client.service';
import { TareasNotasService } from './tareas-notas.service';

describe('TareasNotasService', () => {
    let service: TareasNotasService;
    let mockTareaRepo: any;
    let mockNotaRepo: any;
    let mockExpedienteRepo: any;
    let mockNotificationClient: any;
    let mockLegalNotifications: any;

    beforeEach(async () => {
        mockTareaRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn((data) => Promise.resolve(data)),
            update: jest.fn(),
            remove: jest.fn(),
            create: jest.fn((data) => data),
        };
        mockNotaRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn((data) => Promise.resolve(data)),
            update: jest.fn(),
            remove: jest.fn(),
            create: jest.fn((data) => data),
        };
        mockExpedienteRepo = { findOne: jest.fn() };
        mockNotificationClient = {
            sendMany: jest.fn(),
            notifyByRoles: jest.fn(),
        };
        mockLegalNotifications = { notifyObservacionAgregada: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TareasNotasService,
                { provide: getRepositoryToken(TareaExpediente), useValue: mockTareaRepo },
                { provide: getRepositoryToken(NotaExpediente), useValue: mockNotaRepo },
                { provide: getRepositoryToken(Expediente), useValue: mockExpedienteRepo },
                { provide: NotificationClientService, useValue: mockNotificationClient },
                { provide: LegalNotificationsService, useValue: mockLegalNotifications },
            ],
        }).compile();

        service = module.get<TareasNotasService>(TareasNotasService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('createTarea()', () => {
        it('debe guardar la tarea y llamar notificarTareaAsignada si hay responsableId', async () => {
            const notifySpy = jest.spyOn(service as any, 'notificarTareaAsignada').mockResolvedValue(undefined);
            mockTareaRepo.save.mockResolvedValue({ id: 'tarea-1', titulo: 'Revisar', expedienteId: 'exp-1', responsableId: '11111111-1111-1111-1111-111111111111' });

            const result = await service.createTarea({ titulo: 'Revisar', responsableId: '11111111-1111-1111-1111-111111111111' });

            expect(result.id).toBe('tarea-1');
            expect(notifySpy).toHaveBeenCalledWith(expect.objectContaining({ responsableId: '11111111-1111-1111-1111-111111111111' }));
        });

        it('debe NO llamar notificarTareaAsignada si responsableId es null/undefined', async () => {
            const notifySpy = jest.spyOn(service as any, 'notificarTareaAsignada').mockResolvedValue(undefined);
            mockTareaRepo.save.mockResolvedValue({ id: 'tarea-2', titulo: 'Sin responsable', responsableId: null });

            await service.createTarea({ titulo: 'Sin responsable' });

            expect(notifySpy).not.toHaveBeenCalled();
        });
    });

    describe('updateTarea()', () => {
        it("debe llamar notificarTareaCompletada cuando estado cambia a 'completada'", async () => {
            const notifySpy = jest.spyOn(service as any, 'notificarTareaCompletada').mockResolvedValue(undefined);
            mockTareaRepo.findOne
                .mockResolvedValueOnce({ id: 'tarea-3', estado: 'pendiente', titulo: 'Cerrar', expedienteId: 'exp-1' })
                .mockResolvedValueOnce({ id: 'tarea-3', estado: 'completada', titulo: 'Cerrar', expedienteId: 'exp-1', fechaCompletada: new Date() });

            await service.updateTarea('tarea-3', { estado: 'completada' });

            expect(mockTareaRepo.update).toHaveBeenCalledWith('tarea-3', expect.objectContaining({ estado: 'completada', fechaCompletada: expect.any(Date) }));
            expect(notifySpy).toHaveBeenCalled();
        });
    });

    describe('createNota()', () => {
        it('debe guardar la nota y disparar notificarObservacionProfesional asíncronamente', async () => {
            const notifySpy = jest.spyOn(service as any, 'notificarObservacionProfesional').mockResolvedValue(undefined);
            mockNotaRepo.save.mockResolvedValue({ id: 'nota-1', expedienteId: 'exp-1', contenido: 'Observación' });

            const result = await service.createNota({ expedienteId: 'exp-1', contenido: 'Observación' });

            expect(result.id).toBe('nota-1');
            expect(notifySpy).toHaveBeenCalledWith(expect.objectContaining({ expedienteId: 'exp-1' }));
        });

        it('debe no fallar si notificarObservacionProfesional lanza error', async () => {
            jest.spyOn(service as any, 'notificarObservacionProfesional').mockRejectedValue(new Error('notificación falló'));
            mockNotaRepo.save.mockResolvedValue({ id: 'nota-2', expedienteId: 'exp-1', contenido: 'Observación' });

            await expect(service.createNota({ expedienteId: 'exp-1', contenido: 'Observación' })).resolves.toEqual(expect.objectContaining({ id: 'nota-2' }));
        });
    });

    describe('findTareasByExpediente()', () => {
        it('debe retornar tareas ordenadas por fechaVencimiento ASC sin cargar relacion responsable', async () => {
            mockTareaRepo.find.mockResolvedValue([{ id: 'tarea-4' }]);

            const result = await service.findTareasByExpediente('exp-1');

            expect(result).toEqual([{ id: 'tarea-4' }]);
            expect(mockTareaRepo.find).toHaveBeenCalledWith({ where: { expedienteId: 'exp-1' }, order: { fechaVencimiento: 'ASC' } });
        });
    });

    describe('findNotasByExpediente()', () => {
        it('debe retornar notas ordenadas por createdAt DESC sin cargar relación autor', async () => {
            mockNotaRepo.find.mockResolvedValue([{ id: 'nota-3' }]);

            const result = await service.findNotasByExpediente('exp-1');

            expect(result).toEqual([{ id: 'nota-3' }]);
            expect(mockNotaRepo.find).toHaveBeenCalledWith({ where: { expedienteId: 'exp-1' }, order: { createdAt: 'DESC' } });
        });
    });

    describe('notificarTareaAsignada() - fallback', () => {
        it('debe retornar sin hacer nada si tarea.responsableId es falsy', async () => {
            await expect((service as any).notificarTareaAsignada({ id: 'tarea-5', expedienteId: 'exp-1', responsableId: null })).resolves.toBeUndefined();

            expect(mockExpedienteRepo.findOne).not.toHaveBeenCalled();
            expect(mockNotificationClient.sendMany).not.toHaveBeenCalled();
        });
    });
});
