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
        mockLegalNotifications = { notifyTerminoProximoAVencer: jest.fn().mockResolvedValue(true) };
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

        it('NO debe repetir el aviso de umbral de una regla ya enviada, pero SÍ el recordatorio periódico', async () => {
            const termino = terminoPendiente({ fechaVencimiento: new Date(Date.now() + 2 * HORA_MS) });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-1', horasAnticipacion: 72, activa: true }]);
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'ya-existe', terminoId: 't-1', reglaId: 'regla-1' });

            const result = await service.ejecutarVerificacionManual();

            // El aviso de umbral es de una sola vez...
            expect(result.alertasEnviadas).toBe(0);
            // ...pero el término sigue en ventana de alerta, así que insiste periódicamente.
            expect(result.recordatoriosEnviados).toBe(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledTimes(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ origen: 'recordatorio' }),
            );
        });

        it('NO debe repetir el recordatorio periódico si el último se mandó hace menos de 2 horas', async () => {
            const termino = terminoPendiente({
                fechaVencimiento: new Date(Date.now() + 2 * HORA_MS),
                ultimoRecordatorioRecurrenteEn: new Date(Date.now() - 30 * 60 * 1000), // hace 30 min
            });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-1', horasAnticipacion: 72, activa: true }]);
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'ya-existe', terminoId: 't-1', reglaId: 'regla-1' });

            const result = await service.ejecutarVerificacionManual();

            expect(result.recordatoriosEnviados).toBe(0);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
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
            // Y al estar en ventana de alerta, arranca también el recordatorio periódico.
            expect(result.recordatoriosEnviados).toBe(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledTimes(2);
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

    describe('rearmar la alerta al configurar la anticipación personalizada', () => {
        it('debe borrar el envío anterior y volver a alertar cuando el usuario cambia la anticipación personalizada', async () => {
            // Ya se había enviado la personalizada con el umbral viejo.
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'e1', terminoId: 't-1', reglaId: null });
            mockAlertaEnviadaRepo.delete = jest.fn().mockImplementation(() => {
                // Tras el borrado ya no hay registro previo, igual que en la BD real.
                mockAlertaEnviadaRepo.findOne.mockResolvedValue(null);
                return Promise.resolve({ affected: 1 });
            });
            mockTerminoRepo.findOne = jest.fn().mockResolvedValue(
                terminoPendiente({ horasAnticipacionAlertaPersonalizada: 12, fechaVencimiento: new Date(Date.now() + 10 * HORA_MS) }),
            );

            const res = await service.verificarTerminoInmediato('t-1', { rearmar: 'personalizada' });

            expect(mockAlertaEnviadaRepo.delete).toHaveBeenCalledWith({ terminoId: 't-1', reglaId: expect.anything() });
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledTimes(1);
            expect(res.alertasEnviadas).toBe(1);
        });

        it('sin la bandera NO debe borrar nada ni re-alertar (comportamiento normal del cron)', async () => {
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'e1', terminoId: 't-1', reglaId: null });
            mockAlertaEnviadaRepo.delete = jest.fn();
            mockTerminoRepo.findOne = jest.fn().mockResolvedValue(
                terminoPendiente({ horasAnticipacionAlertaPersonalizada: 12, fechaVencimiento: new Date(Date.now() + 10 * HORA_MS) }),
            );

            const res = await service.verificarTerminoInmediato('t-1');

            expect(mockAlertaEnviadaRepo.delete).not.toHaveBeenCalled();
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
            expect(res.alertasEnviadas).toBe(0);
        });

        it('al configurar la anticipación en un término que nunca alertó, alerta de una si ya cruzó el umbral', async () => {
            mockAlertaEnviadaRepo.findOne.mockResolvedValue(null);
            mockAlertaEnviadaRepo.delete = jest.fn().mockResolvedValue({ affected: 0 });
            mockTerminoRepo.findOne = jest.fn().mockResolvedValue(
                terminoPendiente({ horasAnticipacionAlertaPersonalizada: 48, fechaVencimiento: new Date(Date.now() + 10 * HORA_MS) }),
            );

            const res = await service.verificarTerminoInmediato('t-1', { rearmar: 'personalizada' });

            expect(res.alertasEnviadas).toBe(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ origen: 'personalizada' }),
            );
        });
    });

    describe('rearmar por cambio de fecha de vencimiento', () => {
        it('al mover la fecha de vencimiento borra TODOS los envíos previos y vuelve a evaluar', async () => {
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'e1', terminoId: 't-1', reglaId: 'R1' });
            mockAlertaEnviadaRepo.delete = jest.fn().mockImplementation(() => {
                mockAlertaEnviadaRepo.findOne.mockResolvedValue(null);
                return Promise.resolve({ affected: 2 });
            });
            mockReglaRepo.find.mockResolvedValue([{ id: 'R1', horasAnticipacion: 72, activa: true }]);
            mockTerminoRepo.findOne = jest.fn().mockResolvedValue(
                terminoPendiente({ fechaVencimiento: new Date(Date.now() + 40 * HORA_MS) }),
            );

            const res = await service.verificarTerminoInmediato('t-1', { rearmar: 'todas' });

            // Sin reglaId en el criterio: limpia la personalizada Y las de reglas globales.
            expect(mockAlertaEnviadaRepo.delete).toHaveBeenCalledWith({ terminoId: 't-1' });
            expect(res.alertasEnviadas).toBe(1);
        });
    });

    describe('reevaluarPorCambioDeRegla', () => {
        it('al crear una regla nueva reevalúa los términos sin borrar envíos de otras reglas', async () => {
            mockAlertaEnviadaRepo.delete = jest.fn();
            mockReglaRepo.find.mockResolvedValue([{ id: 'R-nueva', horasAnticipacion: 48, activa: true }]);
            mockTerminoRepo.find.mockResolvedValue([
                terminoPendiente({ fechaVencimiento: new Date(Date.now() + 10 * HORA_MS) }),
            ]);

            const res = await service.reevaluarPorCambioDeRegla();

            expect(mockAlertaEnviadaRepo.delete).not.toHaveBeenCalled();
            expect(res.alertasEnviadas).toBe(1);
        });

        it('al editar una regla borra sus envíos previos para que el umbral nuevo pueda avisar', async () => {
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'e1', terminoId: 't-1', reglaId: 'R1' });
            mockAlertaEnviadaRepo.delete = jest.fn().mockImplementation(() => {
                mockAlertaEnviadaRepo.findOne.mockResolvedValue(null);
                return Promise.resolve({ affected: 1 });
            });
            mockReglaRepo.find.mockResolvedValue([{ id: 'R1', horasAnticipacion: 24, activa: true }]);
            mockTerminoRepo.find.mockResolvedValue([
                terminoPendiente({ fechaVencimiento: new Date(Date.now() + 10 * HORA_MS) }),
            ]);

            const res = await service.reevaluarPorCambioDeRegla('R1');

            expect(mockAlertaEnviadaRepo.delete).toHaveBeenCalledWith({ reglaId: 'R1' });
            expect(res.alertasEnviadas).toBe(1);
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
            // 2 recordatorios: el manual programado por el usuario y el periódico de la
            // ventana de alerta. Son mecanismos distintos y conviven.
            expect(result.recordatoriosEnviados).toBe(2);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledTimes(3);
        });
    });

    describe('confiabilidad: no marcar como enviada una notificación que falló', () => {
        it('NO debe crear el registro de AlertaTerminoEnviada ni la nota si notifyTerminoProximoAVencer retorna false', async () => {
            const termino = terminoPendiente({ fechaVencimiento: new Date(Date.now() + 2 * HORA_MS) });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-1', horasAnticipacion: 72, activa: true }]);
            mockLegalNotifications.notifyTerminoProximoAVencer.mockResolvedValue(false);

            const result = await service.ejecutarVerificacionManual();

            expect(mockAlertaEnviadaRepo.save).not.toHaveBeenCalled();
            expect(mockTerminosService.addNota).not.toHaveBeenCalled();
            expect(result.alertasEnviadas).toBe(0);
        });

        it('NO debe limpiar el recordatorio manual si notifyTerminoProximoAVencer retorna false (se reintenta luego)', async () => {
            const termino = terminoPendiente({
                fechaVencimiento: new Date(Date.now() + 10 * HORA_MS),
                recordatorioManualHorasAnticipacion: 15 * 24,
            });
            mockTerminoRepo.find.mockResolvedValue([termino]);
            mockLegalNotifications.notifyTerminoProximoAVencer.mockResolvedValue(false);

            const result = await service.ejecutarVerificacionManual();

            expect(mockTerminoRepo.update).not.toHaveBeenCalled();
            expect(result.recordatoriosEnviados).toBe(0);
        });
    });

    describe('aviso de vencimiento y recordatorios tras vencer', () => {
        it('al vencerse manda el aviso puntual de VENCIDO y marca la fecha de envío', async () => {
            mockTerminoRepo.find.mockResolvedValue([
                terminoPendiente({ fechaVencimiento: new Date(Date.now() - 1 * HORA_MS) }),
            ]);

            const result = await service.ejecutarVerificacionManual();

            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ origen: 'vencido' }),
            );
            expect(mockTerminoRepo.update).toHaveBeenCalledWith(
                't-1',
                expect.objectContaining({ alertaVencimientoEnviadaEn: expect.any(Date) }),
            );
            expect(result.alertasEnviadas).toBe(1);
        });

        it('NO repite el aviso de VENCIDO si ya se mandó, pero sigue con los recordatorios', async () => {
            mockTerminoRepo.find.mockResolvedValue([
                terminoPendiente({
                    fechaVencimiento: new Date(Date.now() - 50 * HORA_MS),
                    alertaVencimientoEnviadaEn: new Date(Date.now() - 48 * HORA_MS),
                }),
            ]);

            const result = await service.ejecutarVerificacionManual();

            expect(result.alertasEnviadas).toBe(0);
            expect(result.recordatoriosEnviados).toBe(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ origen: 'recordatorio' }),
            );
        });

        it('un término vencido insiste aunque no haya ninguna regla global activa', async () => {
            mockReglaRepo.find.mockResolvedValue([]);
            mockTerminoRepo.find.mockResolvedValue([
                terminoPendiente({
                    fechaVencimiento: new Date(Date.now() - 10 * HORA_MS),
                    alertaVencimientoEnviadaEn: new Date(Date.now() - 8 * HORA_MS),
                }),
            ]);

            const result = await service.ejecutarVerificacionManual();

            expect(result.recordatoriosEnviados).toBe(1);
        });
    });

    describe('la anticipación personalizada no dispara recordatorios periódicos', () => {
        it('con anticipación personalizada cruzada manda SU aviso y nada más', async () => {
            mockReglaRepo.find.mockResolvedValue([{ id: 'regla-1', horasAnticipacion: 72, activa: true }]);
            mockTerminoRepo.find.mockResolvedValue([
                terminoPendiente({
                    horasAnticipacionAlertaPersonalizada: 3,
                    fechaVencimiento: new Date(Date.now() + 2 * HORA_MS),
                }),
            ]);

            const result = await service.ejecutarVerificacionManual();

            // Un único aviso, el personalizado. Sin recordatorio periódico: el usuario pidió
            // "avísame 3 horas antes", no "avísame cada 2 horas".
            expect(result.alertasEnviadas).toBe(1);
            expect(result.recordatoriosEnviados).toBe(0);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledTimes(1);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ origen: 'personalizada' }),
            );
        });

        it('en la corrida siguiente sigue sin repetir nada', async () => {
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'ya', terminoId: 't-1', reglaId: null });
            mockTerminoRepo.find.mockResolvedValue([
                terminoPendiente({
                    horasAnticipacionAlertaPersonalizada: 3,
                    fechaVencimiento: new Date(Date.now() + 2 * HORA_MS),
                }),
            ]);

            const result = await service.ejecutarVerificacionManual();

            expect(result.alertasEnviadas).toBe(0);
            expect(result.recordatoriosEnviados).toBe(0);
            expect(mockLegalNotifications.notifyTerminoProximoAVencer).not.toHaveBeenCalled();
        });

        it('pero al vencerse sí recibe el aviso de VENCIDO y entra en recordatorios como los demás', async () => {
            mockTerminoRepo.find.mockResolvedValue([
                terminoPendiente({
                    horasAnticipacionAlertaPersonalizada: 3,
                    fechaVencimiento: new Date(Date.now() - 1 * HORA_MS),
                }),
            ]);
            mockAlertaEnviadaRepo.findOne.mockResolvedValue({ id: 'ya', terminoId: 't-1', reglaId: null });

            const result = await service.ejecutarVerificacionManual();

            expect(mockLegalNotifications.notifyTerminoProximoAVencer).toHaveBeenCalledWith(
                expect.objectContaining({ origen: 'vencido' }),
            );
            // La exención de recordatorios aplica solo ANTES del vencimiento ("avísame 3 horas
            // antes" = un aviso). Ya vencido, se persigue igual que cualquier otro término;
            // si no, volvería a quedar mudo justo cuando más importa.
            expect(result.recordatoriosEnviados).toBe(1);
        });
    });

    describe('rearmar por cambio de fecha: limpia también vencimiento y recordatorios', () => {
        it("rearmar 'todas' pone en null las marcas de vencimiento y de recordatorio", async () => {
            mockAlertaEnviadaRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });
            mockTerminoRepo.findOne = jest.fn().mockResolvedValue(
                terminoPendiente({
                    fechaVencimiento: new Date(Date.now() + 200 * HORA_MS),
                    alertaVencimientoEnviadaEn: new Date(Date.now() - 100 * HORA_MS),
                    ultimoRecordatorioRecurrenteEn: new Date(Date.now() - 3 * HORA_MS),
                }),
            );

            await service.verificarTerminoInmediato('t-1', { rearmar: 'todas' });

            expect(mockTerminoRepo.update).toHaveBeenCalledWith('t-1', {
                alertaVencimientoEnviadaEn: null,
                ultimoRecordatorioRecurrenteEn: null,
            });
        });

        it("rearmar 'personalizada' NO toca esas marcas (no cambió el plazo)", async () => {
            mockAlertaEnviadaRepo.delete = jest.fn().mockResolvedValue({ affected: 1 });
            mockTerminoRepo.findOne = jest.fn().mockResolvedValue(
                terminoPendiente({ fechaVencimiento: new Date(Date.now() + 200 * HORA_MS) }),
            );

            await service.verificarTerminoInmediato('t-1', { rearmar: 'personalizada' });

            expect(mockTerminoRepo.update).not.toHaveBeenCalledWith(
                't-1',
                expect.objectContaining({ alertaVencimientoEnviadaEn: null }),
            );
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
