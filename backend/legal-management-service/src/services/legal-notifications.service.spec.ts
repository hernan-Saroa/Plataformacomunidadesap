import { Test, TestingModule } from '@nestjs/testing';
import { LegalNotificationsService } from './legal-notifications.service';
import { NotificationClientService } from './notification-client.service';

// Cobertura acotada al método nuevo (notifyResponsableAsignadoTermino) agregado junto con el
// fix de persistencia de "Responsable" en Términos e Informes. El resto de este servicio no
// tenía specs previos y queda fuera de alcance de este cambio.
describe('LegalNotificationsService — notifyResponsableAsignadoTermino()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'resp-1', email: 'responsable@esap.edu.co' }),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LegalNotificationsService,
                { provide: NotificationClientService, useValue: mockNotificationClient },
            ],
        }).compile();

        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    const baseParams = {
        terminoId: 'term-1',
        responsableId: 'resp-1',
        nombreActuacion: 'Informe trimestral',
        numeroRadicado: 'RAD-1',
        fechaBase: new Date(2026, 0, 1),
        fechaVencimiento: new Date(2026, 1, 1),
    };

    it('debe notificar in-app y por correo con tipo_notificacion TERMINO_ASIGNADO cuando es una asignación nueva', async () => {
        await service.notifyResponsableAsignadoTermino(baseParams);

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'resp-1',
            expect.objectContaining({ tipo_notificacion: 'TERMINO_ASIGNADO' }),
        );
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'responsable@esap.edu.co',
            expect.stringContaining('RAD-1'),
            expect.stringContaining('Informe trimestral'),
        );
    });

    it('debe usar tipo_notificacion TERMINO_REASIGNADO y el texto "reasignado" cuando esReasignacion=true', async () => {
        await service.notifyResponsableAsignadoTermino({ ...baseParams, esReasignacion: true });

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'resp-1',
            expect.objectContaining({ tipo_notificacion: 'TERMINO_REASIGNADO' }),
        );
        const emailHtml = mockNotificationClient.sendEmail.mock.calls[0][2];
        expect(emailHtml).toContain('reasignado(a)');
    });

    it('debe incluir fecha de inicio, vencimiento y periodicidad en el HTML del correo cuando se provee periodicidadTexto', async () => {
        await service.notifyResponsableAsignadoTermino({ ...baseParams, periodicidadTexto: 'Mensual · 12 vencimientos/año' });

        const emailHtml = mockNotificationClient.sendEmail.mock.calls[0][2];
        expect(emailHtml).toContain('Mensual · 12 vencimientos/año');
        expect(emailHtml).toContain('enero de 2026');
        expect(emailHtml).toContain('febrero de 2026');
    });

    it('no debe incluir la línea de periodicidad cuando no se provee (no debe inventar el dato)', async () => {
        await service.notifyResponsableAsignadoTermino(baseParams);

        const emailHtml = mockNotificationClient.sendEmail.mock.calls[0][2];
        expect(emailHtml).not.toContain('Periodicidad');
    });

    it('debe escapar HTML en nombreActuacion para evitar inyección de markup en el correo', async () => {
        await service.notifyResponsableAsignadoTermino({
            ...baseParams,
            nombreActuacion: '<img src=x onerror=alert(1)>Informe',
        });

        const emailHtml = mockNotificationClient.sendEmail.mock.calls[0][2];
        expect(emailHtml).not.toContain('<img src=x onerror=alert(1)>');
        expect(emailHtml).toContain('&lt;img src=x onerror=alert(1)&gt;Informe');
    });

    it('no debe enviar correo si el responsable no tiene email registrado (pero sí debe notificar in-app)', async () => {
        mockNotificationClient.getUserDetailsById.mockResolvedValue({ id_user: 'resp-1', email: null });

        await service.notifyResponsableAsignadoTermino(baseParams);

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalled();
        expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
    });

    it('no debe propagar el error si notifyUserById falla (no debe romper el flujo de guardado)', async () => {
        mockNotificationClient.notifyUserById.mockRejectedValue(new Error('servicio de notificaciones caído'));

        await expect(service.notifyResponsableAsignadoTermino(baseParams)).resolves.toBeUndefined();
    });
});

describe('LegalNotificationsService — notifyTerminoProximoAVencer()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            notifyByRole: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'resp-1', email: 'responsable@esap.edu.co' }),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LegalNotificationsService,
                { provide: NotificationClientService, useValue: mockNotificationClient },
            ],
        }).compile();

        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    const baseParams = {
        terminoId: 'term-1',
        responsableId: 'resp-1',
        nombreActuacion: 'Informe trimestral',
        numeroRadicado: 'RAD-1',
        horasRestantes: 20,
        origen: 'automatica' as const,
    };

    it('con responsable y email: debe notificar in-app, enviar correo, y retornar true', async () => {
        const enviado = await service.notifyTerminoProximoAVencer(baseParams);

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'resp-1',
            expect.objectContaining({ tipo_notificacion: 'TERMINO_PROXIMO_A_VENCER' }),
        );
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'responsable@esap.edu.co',
            expect.any(String),
            expect.any(String),
        );
        expect(enviado).toBe(true);
    });

    it('con responsable pero sin email registrado: no debe enviar correo, pero sí debe retornar true (in-app fue suficiente)', async () => {
        mockNotificationClient.getUserDetailsById.mockResolvedValue({ id_user: 'resp-1', email: null });

        const enviado = await service.notifyTerminoProximoAVencer(baseParams);

        expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
        expect(enviado).toBe(true);
    });

    it('sin responsableId: NO debe descartar la alerta en silencio — debe notificar al rol Jefe de Gestión Legal y retornar true', async () => {
        const enviado = await service.notifyTerminoProximoAVencer({ ...baseParams, responsableId: null });

        expect(mockNotificationClient.notifyUserById).not.toHaveBeenCalled();
        expect(mockNotificationClient.notifyByRole).toHaveBeenCalledWith(
            'JEFE_GESTION_LEGAL',
            expect.objectContaining({ tipo_notificacion: 'TERMINO_PROXIMO_A_VENCER' }),
        );
        expect(enviado).toBe(true);
    });

    it('si notifyUserById (in-app) falla: debe retornar false para que el caller reintente en la próxima corrida', async () => {
        mockNotificationClient.notifyUserById.mockRejectedValue(new Error('notifications-service caído'));

        const enviado = await service.notifyTerminoProximoAVencer(baseParams);

        expect(enviado).toBe(false);
    });

    it('si notifyByRole (fallback sin responsable) falla: debe retornar false para reintentar', async () => {
        mockNotificationClient.notifyByRole.mockRejectedValue(new Error('DB caída'));

        const enviado = await service.notifyTerminoProximoAVencer({ ...baseParams, responsableId: null });

        expect(enviado).toBe(false);
    });

    it('si el in-app se entregó pero SOLO falla el envío del correo: debe seguir retornando true (no debe reintentar y duplicar la notificación in-app ya entregada)', async () => {
        mockNotificationClient.sendEmail.mockRejectedValue(new Error('SMTP caído'));

        const enviado = await service.notifyTerminoProximoAVencer(baseParams);

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledTimes(1);
        expect(enviado).toBe(true);
    });

    it('si el in-app se entregó pero falla getUserDetailsById (no se puede resolver el email): debe seguir retornando true', async () => {
        mockNotificationClient.getUserDetailsById.mockRejectedValue(new Error('DB caída'));

        const enviado = await service.notifyTerminoProximoAVencer(baseParams);

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledTimes(1);
        expect(enviado).toBe(true);
    });

    it('horasRestantes negativo (ya venció): el mensaje debe indicar que ya venció, no que "vence en"', async () => {
        await service.notifyTerminoProximoAVencer({ ...baseParams, horasRestantes: -30 });

        const dto = mockNotificationClient.notifyUserById.mock.calls[0][1];
        expect(dto.mensaje).toContain('venció hace');
        expect(dto.mensaje).not.toContain('vence en');
    });

    it('horasRestantes < 24: la prioridad debe ser Alta', async () => {
        await service.notifyTerminoProximoAVencer({ ...baseParams, horasRestantes: 10 });

        const dto = mockNotificationClient.notifyUserById.mock.calls[0][1];
        expect(dto.prioridad).toBe('Alta');
    });

    it('horasRestantes >= 24: la prioridad debe ser Media', async () => {
        await service.notifyTerminoProximoAVencer({ ...baseParams, horasRestantes: 48 });

        const dto = mockNotificationClient.notifyUserById.mock.calls[0][1];
        expect(dto.prioridad).toBe('Media');
    });

    it.each([
        ['automatica' as const, 'Alerta de vencimiento de término'],
        ['personalizada' as const, 'Alerta personalizada de vencimiento'],
        ['manual' as const, 'Recordatorio programado de vencimiento'],
    ])('origen=%s debe usar el título "%s"', async (origen, tituloEsperado) => {
        await service.notifyTerminoProximoAVencer({ ...baseParams, origen });

        const dto = mockNotificationClient.notifyUserById.mock.calls[0][1];
        expect(dto.titulo).toBe(tituloEsperado);
    });
});

describe('LegalNotificationsService — notifyTerminoCreado()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyByRoles: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LegalNotificationsService,
                { provide: NotificationClientService, useValue: mockNotificationClient },
            ],
        }).compile();

        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('debe notificar a los roles Jefe y Resuelve de Gestión Legal con tipo_notificacion TERMINO_CREADO', async () => {
        await service.notifyTerminoCreado({
            terminoId: 'term-1',
            nombreActuacion: 'Informe nuevo',
            numeroRadicado: 'RAD-1',
            origenModulo: 'MANUAL',
        });

        expect(mockNotificationClient.notifyByRoles).toHaveBeenCalledWith(
            ['JEFE_GESTION_LEGAL', 'RESUELVE_GESTION_LEGAL'],
            expect.objectContaining({ tipo_notificacion: 'TERMINO_CREADO' }),
        );
    });

    it('sin responsableNombre: el mensaje debe indicar explícitamente que no tiene responsable asignado', async () => {
        await service.notifyTerminoCreado({
            terminoId: 'term-1',
            nombreActuacion: 'Informe nuevo',
            numeroRadicado: 'RAD-1',
            origenModulo: 'MANUAL',
        });

        const dto = mockNotificationClient.notifyByRoles.mock.calls[0][1];
        expect(dto.mensaje).toContain('sin responsable asignado');
    });

    it('con responsableNombre: el mensaje debe mencionarlo en vez de decir "sin responsable"', async () => {
        await service.notifyTerminoCreado({
            terminoId: 'term-1',
            nombreActuacion: 'Informe nuevo',
            numeroRadicado: 'RAD-1',
            origenModulo: 'MANUAL',
            responsableNombre: 'Juan Pérez',
        });

        const dto = mockNotificationClient.notifyByRoles.mock.calls[0][1];
        expect(dto.mensaje).toContain('asignado a Juan Pérez');
        expect(dto.mensaje).not.toContain('sin responsable asignado');
    });

    it('no debe propagar el error si notifyByRoles falla', async () => {
        mockNotificationClient.notifyByRoles.mockRejectedValue(new Error('DB caída'));

        await expect(service.notifyTerminoCreado({
            terminoId: 'term-1',
            nombreActuacion: 'Informe nuevo',
            origenModulo: 'MANUAL',
        })).resolves.toBeUndefined();
    });
});
