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

// Cobertura de notifyProfesionalAsignado(): es el método que se dispara cuando se asigna/
// reasigna un abogado (rol RESUELVE_GESTION_LEGAL) a un proceso de Defensa Judicial. Cubre
// el bug reportado de que el usuario RESUELVE no recibía ni notificación in-app ni correo.
describe('LegalNotificationsService — notifyProfesionalAsignado()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            notifyByRole: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'abogado-1', email: 'abogado@esap.edu.co' }),
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
        modulo: 'DEFENSA_JUDICIAL' as const,
        radicado: 'RAD-200',
        procesoId: 'proc-1',
        abogadoId: 'abogado-1',
        asignadoPor: 'Jefe Jurídico',
    };

    it('debe notificar in-app al abogado (categoria "gestion-legal") con tipo_notificacion PROCESO_ASIGNADO', async () => {
        await service.notifyProfesionalAsignado(baseParams);

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'abogado-1',
            expect.objectContaining({ tipo_notificacion: 'PROCESO_ASIGNADO', categoria: 'gestion-legal' }),
        );
    });

    it('debe notificar in-app al rol JEFE_GESTION_LEGAL además de al abogado', async () => {
        await service.notifyProfesionalAsignado(baseParams);

        expect(mockNotificationClient.notifyByRole).toHaveBeenCalledWith(
            'JEFE_GESTION_LEGAL',
            expect.objectContaining({ tipo_notificacion: 'PROCESO_ASIGNADO' }),
        );
    });

    it('debe enviar también un correo al abogado asignado cuando tiene email registrado', async () => {
        await service.notifyProfesionalAsignado(baseParams);

        expect(mockNotificationClient.getUserDetailsById).toHaveBeenCalledWith('abogado-1');
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'abogado@esap.edu.co',
            expect.stringContaining('RAD-200'),
            expect.stringContaining('RAD-200'),
        );
    });

    it('NO debe enviar correo si el abogado no tiene email registrado (pero sí debe notificar in-app)', async () => {
        mockNotificationClient.getUserDetailsById.mockResolvedValue({ id_user: 'abogado-1', email: null });

        await service.notifyProfesionalAsignado(baseParams);

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalled();
        expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
    });

    it('debe usar tipo_notificacion PROCESO_REASIGNADO y el texto "reasignado" cuando esReasignacion=true', async () => {
        await service.notifyProfesionalAsignado({ ...baseParams, esReasignacion: true });

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'abogado-1',
            expect.objectContaining({ tipo_notificacion: 'PROCESO_REASIGNADO' }),
        );
        const emailHtml = mockNotificationClient.sendEmail.mock.calls[0][2];
        expect(emailHtml).toContain('Reasignado');
    });

    it('no debe mencionar a "asignadoPor" en el mensaje/correo cuando asignadoPor es el mismo abogado', async () => {
        await service.notifyProfesionalAsignado({ ...baseParams, asignadoPor: 'abogado-1' });

        const dto = mockNotificationClient.notifyUserById.mock.calls[0][1];
        expect(dto.mensaje).not.toContain('por abogado-1');
    });

    it('no debe propagar el error si notifyUserById falla (no debe romper el flujo de asignación)', async () => {
        mockNotificationClient.notifyUserById.mockRejectedValue(new Error('notifications-service caído'));

        await expect(service.notifyProfesionalAsignado(baseParams)).resolves.toBeUndefined();
    });

    it('no debe propagar el error si falla el envío del correo al abogado', async () => {
        mockNotificationClient.sendEmail.mockRejectedValue(new Error('SMTP caído'));

        await expect(service.notifyProfesionalAsignado(baseParams)).resolves.toBeUndefined();
        expect(mockNotificationClient.notifyByRole).not.toHaveBeenCalled();
    });
});

// Auditoría de cobertura completa: además de los dos bugs reportados (asignación de proceso
// y de tarea), se revisaron el resto de notificaciones directas a un usuario en el módulo de
// Gestión Legal (no las de broadcast a un rol, que por convención del código son solo in-app)
// y se les agregó el correo faltante siguiendo el mismo patrón. Cada bloque de abajo prueba
// que ahora sí llega el correo al RESUELVE/abogado afectado.
describe('LegalNotificationsService — notifyEtapaAvanzada() [abogado]', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            notifyByRole: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'abogado-1', email: 'abogado@esap.edu.co' }),
            getUsersDetailsByRole: jest.fn().mockResolvedValue([]),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [LegalNotificationsService, { provide: NotificationClientService, useValue: mockNotificationClient }],
        }).compile();
        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('debe notificar in-app y por correo al abogado del proceso que avanzó de etapa', async () => {
        await service.notifyEtapaAvanzada({
            modulo: 'DEFENSA_JUDICIAL',
            radicado: 'RAD-300',
            procesoId: 'proc-1',
            etapaNombre: 'Contestación',
            abogadoId: 'abogado-1',
        });

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'abogado-1',
            expect.objectContaining({ tipo_notificacion: 'EXPEDIENTE_ETAPA_AVANZADA' }),
        );
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'abogado@esap.edu.co',
            expect.stringContaining('RAD-300'),
            expect.stringContaining('Contestación'),
        );
    });

    it('sin abogadoId: no debe intentar resolver correo (nada que notificar)', async () => {
        await service.notifyEtapaAvanzada({
            modulo: 'DEFENSA_JUDICIAL',
            radicado: 'RAD-300',
            procesoId: 'proc-1',
            etapaNombre: 'Contestación',
        });

        expect(mockNotificationClient.getUserDetailsById).not.toHaveBeenCalled();
        expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
    });
});

describe('LegalNotificationsService — notifyObservacionAgregada()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'abogado-1', email: 'abogado@esap.edu.co' }),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [LegalNotificationsService, { provide: NotificationClientService, useValue: mockNotificationClient }],
        }).compile();
        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('debe notificar in-app y por correo al abogado cuando se agrega una observación a su proceso', async () => {
        await service.notifyObservacionAgregada({
            radicado: 'RAD-400',
            procesoId: 'proc-1',
            abogadoId: 'abogado-1',
            autorNombre: 'Jefe Jurídico',
        });

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'abogado-1',
            expect.objectContaining({ tipo_notificacion: 'OBSERVACION_PROCESO' }),
        );
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'abogado@esap.edu.co',
            expect.stringContaining('RAD-400'),
            expect.stringContaining('Jefe Jurídico'),
        );
    });

    it('NO debe enviar correo si el abogado no tiene email registrado', async () => {
        mockNotificationClient.getUserDetailsById.mockResolvedValue({ id_user: 'abogado-1', email: null });

        await service.notifyObservacionAgregada({
            radicado: 'RAD-400',
            procesoId: 'proc-1',
            abogadoId: 'abogado-1',
            autorNombre: 'Jefe Jurídico',
        });

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalled();
        expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
    });
});

describe('LegalNotificationsService — notifyProfesionalesProcesoAnexado()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn((id: string) => Promise.resolve({ id_user: id, email: `${id}@esap.edu.co` })),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [LegalNotificationsService, { provide: NotificationClientService, useValue: mockNotificationClient }],
        }).compile();
        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    const baseParams = {
        modulo: 'DEFENSA_JUDICIAL' as const,
        radicadoAnexado: 'RAD-ANEX',
        radicadoPrincipal: 'RAD-PRIN',
        procesoPrincipalId: 'proc-prin',
        procesoAnexadoId: 'proc-anex',
        anexadoPor: 'Jefe Jurídico',
    };

    it('debe notificar in-app y por correo al abogado principal y al abogado anexado cuando son distintos', async () => {
        await service.notifyProfesionalesProcesoAnexado({
            ...baseParams,
            abogadoPrincipalId: 'abogado-principal',
            abogadoAnexadoId: 'abogado-anexado',
        });

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith('abogado-principal', expect.any(Object));
        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith('abogado-anexado', expect.any(Object));
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'abogado-principal@esap.edu.co',
            expect.any(String),
            expect.any(String),
        );
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'abogado-anexado@esap.edu.co',
            expect.any(String),
            expect.any(String),
        );
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledTimes(2);
    });

    it('NO debe duplicar notificación/correo cuando el abogado principal y el anexado son el mismo', async () => {
        await service.notifyProfesionalesProcesoAnexado({
            ...baseParams,
            abogadoPrincipalId: 'abogado-1',
            abogadoAnexadoId: 'abogado-1',
        });

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledTimes(1);
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('no debe propagar el error si falla la notificación de uno de los abogados', async () => {
        mockNotificationClient.notifyUserById.mockRejectedValue(new Error('notifications-service caído'));

        await expect(service.notifyProfesionalesProcesoAnexado({
            ...baseParams,
            abogadoPrincipalId: 'abogado-principal',
        })).resolves.toBeUndefined();
    });
});

describe('LegalNotificationsService — notifyRiesgoAsignado()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            notifyByRole: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'abogado-1', email: 'abogado@esap.edu.co' }),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [LegalNotificationsService, { provide: NotificationClientService, useValue: mockNotificationClient }],
        }).compile();
        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    const baseParams = {
        riesgoId: 'riesgo-1',
        codigo: 'R-001',
        nombreRiesgo: 'Pérdida de proceso',
        abogadoId: 'abogado-1',
        asignadoPor: 'Jefe Jurídico',
    };

    it('debe notificar in-app y por correo al abogado responsable del riesgo', async () => {
        await service.notifyRiesgoAsignado(baseParams);

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'abogado-1',
            expect.objectContaining({ tipo_notificacion: 'RIESGO_ASIGNADO' }),
        );
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'abogado@esap.edu.co',
            expect.stringContaining('R-001'),
            expect.stringContaining('Pérdida de proceso'),
        );
    });

    it('también debe notificar in-app al rol JEFE_GESTION_LEGAL', async () => {
        await service.notifyRiesgoAsignado(baseParams);

        expect(mockNotificationClient.notifyByRole).toHaveBeenCalledWith(
            'JEFE_GESTION_LEGAL',
            expect.objectContaining({ tipo_notificacion: 'RIESGO_ASIGNADO' }),
        );
    });

    it('usa tipo_notificacion RIESGO_REASIGNADO cuando esReasignacion=true', async () => {
        await service.notifyRiesgoAsignado({ ...baseParams, esReasignacion: true });

        const dto = mockNotificationClient.notifyUserById.mock.calls[0][1];
        expect(dto.tipo_notificacion).toBe('RIESGO_REASIGNADO');
    });
});

describe('LegalNotificationsService — notifyRiesgoZonaCritica()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            notifyByRole: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'abogado-1', email: 'abogado@esap.edu.co' }),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [LegalNotificationsService, { provide: NotificationClientService, useValue: mockNotificationClient }],
        }).compile();
        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('debe notificar in-app y por correo al responsable cuando el riesgo entra en zona crítica', async () => {
        await service.notifyRiesgoZonaCritica({
            riesgoId: 'riesgo-1',
            codigo: 'R-001',
            nombreRiesgo: 'Pérdida de proceso',
            zonaResidual: 'EXTREMO',
            abogadoId: 'abogado-1',
            modificadoPor: 'Jefe Jurídico',
        });

        expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
            'abogado-1',
            expect.objectContaining({ tipo_notificacion: 'RIESGO_ZONA_CRITICA' }),
        );
        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'abogado@esap.edu.co',
            expect.stringContaining('R-001'),
            expect.stringContaining('EXTREMO'),
        );
    });

    it('sin abogadoId: no debe intentar resolver ni enviar correo, pero sí debe notificar a jefatura', async () => {
        await service.notifyRiesgoZonaCritica({
            riesgoId: 'riesgo-1',
            codigo: 'R-001',
            nombreRiesgo: 'Pérdida de proceso',
            zonaResidual: 'ALTO',
            abogadoId: undefined as any,
            modificadoPor: 'Jefe Jurídico',
        });

        expect(mockNotificationClient.getUserDetailsById).not.toHaveBeenCalled();
        expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
        expect(mockNotificationClient.notifyByRole).toHaveBeenCalled();
    });
});

describe('LegalNotificationsService — notifyRiesgoProvisionModificada()', () => {
    let service: LegalNotificationsService;
    let mockNotificationClient: any;

    beforeEach(async () => {
        mockNotificationClient = {
            notifyUserById: jest.fn().mockResolvedValue(undefined),
            notifyByRole: jest.fn().mockResolvedValue(undefined),
            getUserDetailsById: jest.fn().mockResolvedValue({ id_user: 'abogado-1', email: 'abogado@esap.edu.co' }),
            sendEmail: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [LegalNotificationsService, { provide: NotificationClientService, useValue: mockNotificationClient }],
        }).compile();
        service = module.get<LegalNotificationsService>(LegalNotificationsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('debe notificar in-app y por correo al abogado cuando cambia la provisión contable del riesgo', async () => {
        await service.notifyRiesgoProvisionModificada({
            riesgoId: 'riesgo-1',
            codigo: 'R-001',
            nombreRiesgo: 'Pérdida de proceso',
            provisionAnterior: 1000000,
            provisionNueva: 5000000,
            abogadoId: 'abogado-1',
            modificadoPor: 'Jefe Jurídico',
        });

        expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
            'abogado@esap.edu.co',
            expect.stringContaining('R-001'),
            expect.stringContaining('aumentado'),
        );
    });
});
