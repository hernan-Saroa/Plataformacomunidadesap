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
            sendMany: jest.fn().mockResolvedValue(undefined),
            notifyByRoles: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'resuelve-1', email: 'resuelve@esap.edu.co' }),
            sendEmail: jest.fn().mockResolvedValue(undefined),
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

        it('debe llamar notificarTareaAsignada(updated, true) cuando responsableId cambia (reasignación)', async () => {
            const notifySpy = jest.spyOn(service as any, 'notificarTareaAsignada').mockResolvedValue(undefined);
            mockTareaRepo.findOne
                .mockResolvedValueOnce({ id: 'tarea-6', estado: 'pendiente', titulo: 'Revisar', expedienteId: 'exp-1', responsableId: 'antiguo-resuelve' })
                .mockResolvedValueOnce({ id: 'tarea-6', estado: 'pendiente', titulo: 'Revisar', expedienteId: 'exp-1', responsableId: 'nuevo-resuelve' });

            await service.updateTarea('tarea-6', { responsableId: 'nuevo-resuelve' });

            expect(notifySpy).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'tarea-6', responsableId: 'nuevo-resuelve' }),
                true,
            );
        });

        it('NO debe notificar reasignación si responsableId no cambia', async () => {
            const notifySpy = jest.spyOn(service as any, 'notificarTareaAsignada').mockResolvedValue(undefined);
            mockTareaRepo.findOne
                .mockResolvedValueOnce({ id: 'tarea-7', estado: 'pendiente', titulo: 'Revisar', expedienteId: 'exp-1', responsableId: 'resuelve-1' })
                .mockResolvedValueOnce({ id: 'tarea-7', estado: 'pendiente', titulo: 'Revisar actualizada', expedienteId: 'exp-1', responsableId: 'resuelve-1' });

            await service.updateTarea('tarea-7', { titulo: 'Revisar actualizada' });

            expect(notifySpy).not.toHaveBeenCalled();
        });

        it('NO debe notificar reasignación si responsableId se envía pero es el mismo valor', async () => {
            const notifySpy = jest.spyOn(service as any, 'notificarTareaAsignada').mockResolvedValue(undefined);
            mockTareaRepo.findOne
                .mockResolvedValueOnce({ id: 'tarea-8', estado: 'pendiente', titulo: 'Revisar', expedienteId: 'exp-1', responsableId: 'resuelve-1' })
                .mockResolvedValueOnce({ id: 'tarea-8', estado: 'pendiente', titulo: 'Revisar', expedienteId: 'exp-1', responsableId: 'resuelve-1' });

            await service.updateTarea('tarea-8', { responsableId: 'resuelve-1' });

            expect(notifySpy).not.toHaveBeenCalled();
        });

        it('debe seguir el flujo normal aunque falle notificarTareaAsignada en una reasignación (no debe propagar el error)', async () => {
            jest.spyOn(service as any, 'notificarTareaAsignada').mockRejectedValue(new Error('notifications-service caído'));
            mockTareaRepo.findOne
                .mockResolvedValueOnce({ id: 'tarea-9', estado: 'pendiente', titulo: 'Revisar', expedienteId: 'exp-1', responsableId: 'antiguo-resuelve' })
                .mockResolvedValueOnce({ id: 'tarea-9', estado: 'pendiente', titulo: 'Revisar', expedienteId: 'exp-1', responsableId: 'nuevo-resuelve' });

            await expect(service.updateTarea('tarea-9', { responsableId: 'nuevo-resuelve' })).resolves.toEqual(
                expect.objectContaining({ id: 'tarea-9' }),
            );
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

    describe('notificarTareaAsignada()', () => {
        it('debe retornar sin hacer nada si tarea.responsableId es falsy', async () => {
            await expect((service as any).notificarTareaAsignada({ id: 'tarea-5', expedienteId: 'exp-1', responsableId: null })).resolves.toBeUndefined();

            expect(mockExpedienteRepo.findOne).not.toHaveBeenCalled();
            expect(mockNotificationClient.sendMany).not.toHaveBeenCalled();
            expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
        });

        it('debe enviar la notificación in-app con categoria "gestion-legal" (la única que el bell del shell reconoce para el módulo)', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: 'exp-1', radicado: 'RAD-100', jurisdiccion: 'CIVIL', tipoProceso: 'Ordinario' });

            await (service as any).notificarTareaAsignada({
                id: 'tarea-10',
                expedienteId: 'exp-1',
                titulo: 'Contestar demanda',
                responsableId: 'resuelve-1',
                prioridad: 'alta',
            });

            expect(mockNotificationClient.sendMany).toHaveBeenCalledWith([
                expect.objectContaining({
                    id_usuario_destinatario: 'resuelve-1',
                    tipo_notificacion: 'TAREA_ASIGNADA',
                    categoria: 'gestion-legal',
                    prioridad: 'Alta',
                }),
            ]);
        });

        it('debe enviar también un correo electrónico al responsable cuando tiene email registrado', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: 'exp-1', radicado: 'RAD-100' });

            await (service as any).notificarTareaAsignada({
                id: 'tarea-11',
                expedienteId: 'exp-1',
                titulo: 'Contestar demanda',
                responsableId: 'resuelve-1',
            });

            expect(mockNotificationClient.getUserDetailsById).toHaveBeenCalledWith('resuelve-1');
            expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
                'resuelve@esap.edu.co',
                expect.stringContaining('Contestar demanda'),
                expect.stringContaining('RAD-100'),
            );
        });

        it('NO debe enviar correo si el responsable no tiene email registrado (pero sí debe notificar in-app)', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: 'exp-1', radicado: 'RAD-100' });
            mockNotificationClient.getUserDetailsById.mockResolvedValue({ id_user: 'resuelve-1', email: null });

            await (service as any).notificarTareaAsignada({
                id: 'tarea-12',
                expedienteId: 'exp-1',
                titulo: 'Contestar demanda',
                responsableId: 'resuelve-1',
            });

            expect(mockNotificationClient.sendMany).toHaveBeenCalled();
            expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
        });

        it('usa tipo_notificacion TAREA_REASIGNADA y el texto "reasignó" cuando esReasignacion=true', async () => {
            mockExpedienteRepo.findOne.mockResolvedValue({ id: 'exp-1', radicado: 'RAD-100' });

            await (service as any).notificarTareaAsignada({
                id: 'tarea-13',
                expedienteId: 'exp-1',
                titulo: 'Contestar demanda',
                responsableId: 'resuelve-1',
            }, true);

            const dto = mockNotificationClient.sendMany.mock.calls[0][0][0];
            expect(dto.tipo_notificacion).toBe('TAREA_REASIGNADA');
            expect(dto.mensaje).toContain('reasignó');

            const emailHtml = mockNotificationClient.sendEmail.mock.calls[0][2];
            expect(emailHtml).toContain('reasignó');
        });
    });
});
