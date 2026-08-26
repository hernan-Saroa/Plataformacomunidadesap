import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AlertaTerminoEnviada } from '../entities/alerta-termino-enviada.entity';
import { ReglaAlertaTermino } from '../entities/regla-alerta-termino.entity';
import { TerminoProcesal } from '../entities/termino-procesal.entity';
import { AlertasVencimientoTerminosService } from './alertas-vencimiento-terminos.service';
import { LegalNotificationsService } from './legal-notifications.service';
import { TerminosService } from './terminos.service';

const HORA_MS = 1000 * 60 * 60;

function terminoPendiente(overrides: Partial<TerminoProcesal> = {}): TerminoProcesal {
    return {
        id: 't-1',
        estado: 'PENDIENTE',
        fechaVencimiento: new Date(Date.now() + 10 * HORA_MS),
        responsableId: 'resp-1',
        nombreActuacion: 'Informe X',
        numeroRadicado: 'RAD-1',
        horasAnticipacionAlertaPersonalizada: null,
        recordatorioManualHorasAnticipacion: null,
        ...overrides,
    } as TerminoProcesal;
}

describe('AlertasVencimientoTerminosService', () => {
    let service: AlertasVencimientoTerminosService;
    let mockTerminoRepo: any;
    let mockReglaRepo: any;
    let mockAlertaEnviadaRepo: any;
    let mockLegalNotifications: any;
    let mockTerminosService: any;

    beforeEach(async () => {
        mockTerminoRepo = {
            find: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue(undefined),
        };
        mockReglaRepo = { find: jest.fn().mockResolvedValue([]) };
        mockAlertaEnviadaRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn((data: any) => Promise.resolve(data)),
            create: jest.fn((data: any) => data),
        };
        mockLegalNotifications = { notifyTerminoProximoAVencer: jest.fn().mockResolvedValue(undefined) };
        mockTerminosService = { addNota: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AlertasVencimientoTerminosService,
                { provide: getRepositoryToken(TerminoProcesal), useValue: mockTerminoRepo },
                { provide: getRepositoryToken(ReglaAlertaTermino), useValue: mockReglaRepo },
                { provide: getRepositoryToken(AlertaTerminoEnviada), useValue: mockAlertaEnviadaRepo },
                { provide: LegalNotificationsService, useValue: mockLegalNotifications },
                { provide: TerminosService, useValue: mockTerminosService },
            ],
        }).compile();

        service = module.get<AlertasVencimientoTerminosService>(AlertasVencimientoTerminosService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('reglas globales', () => {
        it('debe notificar cuando el término cruzó el umbral de una regla activa y aún no se había avisado', async () => {
            const termino = terminoPendiente({ fechaVencimiento: new Date(Date.now() + 2 * HORA_MS) });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-1', horasAnticipacion: 72, activa: true }]);

            const result = await service.ejecutarVerificacionManual();

            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ terminoId: 't-1', origen: 'automatica' }),
            );
            expect(mockAlertaEnviadaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ terminoId: 't-1', reglaId: 'regla-1' }));
            expect(mockTerminosService.addNota).toHaveBeenCalled();
            expect(result.alertasEnviadas).toBe(1);
        });

        it('NO debe notificar si el término todavía no cruzó el umbral', async () => {
            const termino = terminoPendiente({ fechaVencimiento: new Date(Date.now() + 100 * HORA_MS) });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-1', horasAnticipacion: 72, activa: true }]);

            const result = await service.ejecutarVerificacionManual();

            expect(mockLegalNotifications.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
            expect(result.alertasEnviadas).toBe(0);
        });

        it('NO debe re-notificar la misma regla si ya existe un registro de envío para ese término', async () => {
            const termino = terminoPendiente({ fechaVencimiento: new Date(Date.now() + 2 * HORA_MS) });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-1', horasAnticipacion: 72, activa: true }]);
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'ya-existe', terminoId: 't-1', reglaId: 'regla-1' });

            const result = await service.ejecutarVerificacionManual();

            expect(mockLegalNotifications.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
            expect(result.alertasEnviadas).toBe(0);
        });

        it('debe evaluar cada regla activa por separado y notificar las que ya se cruzaron', async () => {
            const termino = terminoPendiente({ fechaVencimiento: new Date(Date.now() + 2 * HORA_MS) });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([
                { id: 'regla-72h', horasAnticipacion: 72, activa: true },
                { id: 'regla-1h', horasAnticipacion: 1, activa: true },
            ]);

            const result = await service.ejecutarVerificacionManual();

            // Solo la regla de 72h se cruzó (faltan 2h); la de 1h todavía no.
            expect(result.alertasEnviadas).toBe(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledTimes(1);
        });
    });

    describe('anticipación personalizada por término', () => {
        it('debe ignorar las reglas globales cuando el término tiene anticipación personalizada', async () => {
            const termino = terminoPendiente({
                fechaVencimiento: new Date(Date.now() + 2 * HORA_MS),
                horasAnticipacionAlertaPersonalizada: 5,
            });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-global', horasAnticipacion: 72, activa: true }]);

            const result = await service.ejecutarVerificacionManual();

            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledTimes(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ origen: 'personalizada' }),
            );
            expect(mockAlertaEnviadaRepo.save).toHaveBeenCalledWith(expect.objectContaining({ terminoId: 't-1', reglaId: null }));
            expect(result.alertasEnviadas).toBe(1);
        });

        it('NO debe notificar la anticipación personalizada si aún no se cruza el umbral', async () => {
            const termino = terminoPendiente({
                fechaVencimiento: new Date(Date.now() + 50 * HORA_MS),
                horasAnticipacionAlertaPersonalizada: 5,
            });
            mockTerminoRepo.find.mockResolvedValue([termino]);

            const result = await service.ejecutarVerificacionManual();

            expect(mockLegalNotifications.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
            expect(result.alertasEnviadas).toBe(0);
        });
    });

    describe('recordatorio manual programado', () => {
        it('debe notificar y limpiar el campo (envío único) cuando se cruza el umbral', async () => {
            const termino = terminoPendiente({
                fechaVencimiento: new Date(Date.now() + 10 * HORA_MS),
                recordatorioManualHorasAnticipacion: 15 * 24, // 15 días
            });
            mockTerminoRepo.find.mockResolvedValue([termino]);

            const result = await service.ejecutarVerificacionManual();

            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ terminoId: 't-1', origen: 'manual' }),
            );
            expect(mockTerminosService.addNota).toHaveBeenCalledWith(
                't-1',
                expect.stringContaining('Recordatorio manual'),
                'Sistema',
            );
            // Debe limpiarse con un update PARCIAL (no un save() de la entidad completa),
            // para no arriesgar pisar la nota que addNota() acaba de escribir.
            expect(mockTerminoRepo.update).toHaveBeenCalledWith('t-1', { recordatorioManualHorasAnticipacion: null });
            expect(result.recordatoriosEnviados).toBe(1);
        });

        it('NO debe notificar el recordatorio manual si aún no se cruza el umbral', async () => {
            const termino = terminoPendiente({
                fechaVencimiento: new Date(Date.now() + 400 * HORA_MS),
                recordatorioManualHorasAnticipacion: 24,
            });
            mockTerminoRepo.find.mockResolvedValue([termino]);

            const result = await service.ejecutarVerificacionManual();

            expect(mockTerminoRepo.update).not.toHaveBeenCalled();
            expect(result.recordatoriosEnviados).toBe(0);
        });

        it('el recordatorio manual y las alertas automáticas son independientes entre sí', async () => {
            const termino = terminoPendiente({
                fechaVencimiento: new Date(Date.now() + 2 * HORA_MS),
                recordatorioManualHorasAnticipacion: 48,
            });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-1', horasAnticipacion: 72, activa: true }]);

            const result = await service.ejecutarVerificacionManual();

            expect(result.alertasEnviadas).toBe(1);
            expect(result.recordatoriosEnviados).toBe(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledTimes(2);
        });
    });

    describe('casos borde', () => {
        it('debe omitir términos sin fechaVencimiento sin lanzar error', async () => {
            const termino = terminoPendiente({ fechaVencimiento: null as any });
            mockTerminoRepo.find.mockResolvedValue([termino]);

            const result = await service.ejecutarVerificacionManual();

            expect(result).toEqual({ alertasEnviadas: 0, recordatoriosEnviados: 0 });
        });

        it('debe retornar ceros cuando no hay términos pendientes', async () => {
            mockTerminoRepo.find.mockResolvedValue([]);

            const result = await service.ejecutarVerificacionManual();

            expect(result).toEqual({ alertasEnviadas: 0, recordatoriosEnviados: 0 });
        });
    });

    describe('verificarAlertas() (cron)', () => {
        it('debe delegar en ejecutarVerificacionManual', async () => {
            const spy = jest.spyOn(service, 'ejecutarVerificacionManual').mockResolvedValue({ alertasEnviadas: 3, recordatoriosEnviados: 1 });

            await service.verificarAlertas();

            expect(spy).toHaveBeenCalled();
        });

        it('no debe propagar la excepción si ejecutarVerificacionManual falla (solo la loguea)', async () => {
            jest.spyOn(service, 'ejecutarVerificacionManual').mockRejectedValue(new Error('DB caída'));

            await expect(service.verificarAlertas()).resolves.toBeUndefined();
        });
    });
});
