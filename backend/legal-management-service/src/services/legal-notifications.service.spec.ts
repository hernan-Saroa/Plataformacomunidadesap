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
