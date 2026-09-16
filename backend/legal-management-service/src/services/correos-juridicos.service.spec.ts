import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdjuntoCorreo } from '../entities/adjunto-correo.entity';
import { CorreoJuridicoHistorial } from '../entities/correo-juridico-historial.entity';
import { CorreoJuridico } from '../entities/correo-juridico.entity';
import { CorreoTrackingToken } from '../entities/correo-tracking-token.entity';
import { Documento } from '../entities/documento.entity';
import { DocumentoConsulta } from '../entities/documento-consulta.entity';
import { Expediente } from '../entities/expediente.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { ActuacionService } from './actuacion.service';
import { CorreosJuridicosService } from './correos-juridicos.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { NotificationClientService } from './notification-client.service';
import { SmartClassificationService } from './smart-classification.service';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('test')),
}));

describe('CorreosJuridicosService', () => {
    const originalEnv = process.env;
    let service: CorreosJuridicosService;
    let mockCorreoRepo: any;
    let mockAdjuntoRepo: any;
    let mockHistorialRepo: any;
    let mockTrackingRepo: any;
    let mockDocumentoRepo: any;
    let mockDocumentoConsultaRepo: any;
    let mockExpedienteRepo: any;
    let mockConsultaRepo: any;
    let mockGraphService: any;
    let mockSmartService: any;
    let mockActuacionService: any;
    let mockNotificationClient: any;

    beforeEach(async () => {
        process.env = {
            ...originalEnv,
            TRACKING_PUBLIC_URL: 'https://test.esap.gov.co',
            CORS_ORIGIN: 'https://test.esap.gov.co',
            PORT: '3008',
            API_GATEWAY_URL: 'https://gateway.test.esap.gov.co',
        };
        mockCorreoRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn((data) => Promise.resolve(data)),
            update: jest.fn(),
            delete: jest.fn(),
            create: jest.fn((data) => data),
            createQueryBuilder: jest.fn(),
        };
        mockAdjuntoRepo = {
            save: jest.fn((data) => Promise.resolve({ id: data.id || 'adj-1', ...data })),
            create: jest.fn((data) => data),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            count: jest.fn(),
            delete: jest.fn(),
        };
        mockHistorialRepo = {
            save: jest.fn((data) => Promise.resolve(data)),
            create: jest.fn((data) => data),
            createQueryBuilder: jest.fn(),
        };
        mockTrackingRepo = {
            save: jest.fn((data) => Promise.resolve({ id: 'track-1', ...data })),
            findOne: jest.fn(),
            create: jest.fn((data) => data),
            delete: jest.fn(),
        };
        mockDocumentoRepo = {
            save: jest.fn((data) => Promise.resolve({ id: 'doc-1', ...data })),
            create: jest.fn((data) => data),
        };
        mockDocumentoConsultaRepo = {
            save: jest.fn((data) => Promise.resolve({ id: 'doc-consulta-1', ...data })),
            create: jest.fn((data) => data),
        };
        mockExpedienteRepo = {
            update: jest.fn().mockResolvedValue({ affected: 1 }),
            query: jest.fn(),
        };
        mockConsultaRepo = {
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        mockGraphService = {
            sendEmail: jest.fn(),
            getEmails: jest.fn(),
            getEmailsPage: jest.fn(),
            markAsRead: jest.fn(),
            getAttachment: jest.fn(),
            getAttachments: jest.fn(),
            downloadAttachment: jest.fn(),
            resolveAccount: jest.fn().mockReturnValue('juridica@esap.gov.co'),
            isBuzonConfigured: jest.fn().mockReturnValue(true),
        };
        mockSmartService = {
            classify: jest.fn(),
            analyzeUrgency: jest.fn().mockReturnValue(false),
            extractEntities: jest.fn().mockReturnValue({}),
            resolveModuleForCategory: jest.fn().mockReturnValue('Buzón General'),
            train: jest.fn().mockResolvedValue(undefined),
        };
        mockActuacionService = { create: jest.fn(), registrarActuacion: jest.fn() };
        mockNotificationClient = { notifyByRoles: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CorreosJuridicosService,
                { provide: getRepositoryToken(CorreoJuridico), useValue: mockCorreoRepo },
                { provide: getRepositoryToken(AdjuntoCorreo), useValue: mockAdjuntoRepo },
                { provide: getRepositoryToken(CorreoJuridicoHistorial), useValue: mockHistorialRepo },
                { provide: getRepositoryToken(CorreoTrackingToken), useValue: mockTrackingRepo },
                { provide: getRepositoryToken(Documento), useValue: mockDocumentoRepo },
                { provide: getRepositoryToken(DocumentoConsulta), useValue: mockDocumentoConsultaRepo },
                { provide: getRepositoryToken(Expediente), useValue: mockExpedienteRepo },
                { provide: getRepositoryToken(ConsultaJuridica), useValue: mockConsultaRepo },
                { provide: MicrosoftGraphService, useValue: mockGraphService },
                { provide: SmartClassificationService, useValue: mockSmartService },
                { provide: ActuacionService, useValue: mockActuacionService },
                { provide: NotificationClientService, useValue: mockNotificationClient },
            ],
        }).compile();

        service = module.get<CorreosJuridicosService>(CorreosJuridicosService);
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    describe('sendEmail()', () => {
        it('debe guardar el correo en BD y llamar a MicrosoftGraphService.sendEmail', async () => {
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-1', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            const result = await service.sendEmail({ to: 'destino@test.com', subject: 'Asunto', body: '<p>Hola</p>', requestReadReceipt: true });

            expect(result.success).toBe(true);
            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ asunto: 'Asunto', direccion: 'ENVIADO' }));
            expect(mockGraphService.sendEmail).toHaveBeenCalledWith(
                'destino@test.com',
                'Asunto',
                expect.stringContaining('/correos/track/open/'),
                undefined,
                [],
                { requestReadReceipt: true, requestDeliveryReceipt: false },
                'juridica@esap.gov.co',
                undefined,
            );
        });

        it('debe inyectar pixel de tracking en el body HTML cuando se solicita confirmación de entrega/lectura', async () => {
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-2', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            await service.sendEmail({ to: 'destino@test.com', subject: 'Tracking', body: '<p>Contenido</p>', requestReadReceipt: true });

            expect(mockGraphService.sendEmail.mock.calls[0][2]).toContain('<img src="https://test.esap.gov.co/services/legal/api/v1/correos/track/open/');
            expect(mockTrackingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'OPEN_PIXEL' }));
        });

        it('no debe inyectar pixel de tracking cuando no se solicita confirmación de entrega/lectura', async () => {
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-2b', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            await service.sendEmail({ to: 'destino@test.com', subject: 'Sin tracking', body: '<p>Contenido</p>' });

            expect(mockGraphService.sendEmail.mock.calls[0][2]).not.toContain('<img src=');
            expect(mockTrackingRepo.save).not.toHaveBeenCalledWith(expect.objectContaining({ tipo: 'OPEN_PIXEL' }));
        });

        it('debe crear registros de AdjuntoCorreo por cada adjunto recibido', async () => {
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-3', ...data }));
            mockAdjuntoRepo.save
                .mockResolvedValueOnce({ id: 'adj-1', nombre: 'uno.pdf', tamanio: 4 })
                .mockResolvedValueOnce({ id: 'adj-2', nombre: 'dos.pdf', tamanio: 4 });
            mockGraphService.sendEmail.mockResolvedValue(true);

            await service.sendEmail({
                to: 'destino@test.com',
                subject: 'Adjuntos',
                body: '<p>Hola</p>',
                attachments: [
                    { name: 'uno.pdf', contentBytes: Buffer.from('uno').toString('base64'), contentType: 'application/pdf' },
                    { name: 'dos.pdf', contentBytes: Buffer.from('dos').toString('base64'), contentType: 'application/pdf' },
                ],
            });

            expect(mockAdjuntoRepo.create).toHaveBeenCalledTimes(2);
            expect(mockAdjuntoRepo.save).toHaveBeenCalledTimes(2);
        });

        it('debe hacer rollback en BD si MicrosoftGraphService.sendEmail falla', async () => {
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-4', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(false);

            const result = await service.sendEmail({ to: 'destino@test.com', subject: 'Falla', body: '<p>Hola</p>' });

            expect(result.success).toBe(false);
            expect(mockAdjuntoRepo.delete).toHaveBeenCalledWith({ correoId: 'correo-4' });
            expect(mockTrackingRepo.delete).toHaveBeenCalledWith({ correoId: 'correo-4' });
            expect(mockCorreoRepo.delete).toHaveBeenCalledWith('correo-4');
        });
    });

    describe('propagarEventoAEnviado()', () => {
        it('debe encontrar correo enviado por threadId exacto y registrar el evento', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ id: 'sent-1', direccion: 'ENVIADO' });

            await (service as any).propagarEventoAEnviado({ threadId: 'thread-1', asunto: 'RE: Tema' }, 'LEIDO', 'Leído');

            expect(mockCorreoRepo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { threadId: 'thread-1', direccion: 'ENVIADO' } }));
            expect(mockHistorialRepo.save).toHaveBeenCalledWith(expect.objectContaining({ correoJuridicoId: 'sent-1', tipoEvento: 'LEIDO' }));
        });

        it('debe usar búsqueda por asunto limpio como fallback si no hay threadId match', async () => {
            mockCorreoRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'sent-2', direccion: 'ENVIADO' });

            await (service as any).propagarEventoAEnviado({ threadId: 'thread-2', asunto: 'RE: Tema limpio' }, 'LEIDO', 'Leído');

            expect(mockCorreoRepo.findOne).toHaveBeenLastCalledWith(expect.objectContaining({
                where: [
                    { asunto: 'Tema limpio', direccion: 'ENVIADO' },
                    { asunto: 'RE: Tema limpio', direccion: 'ENVIADO' },
                    { asunto: 'RV: Tema limpio', direccion: 'ENVIADO' },
                ],
            }));
            expect(mockHistorialRepo.save).toHaveBeenCalledWith(expect.objectContaining({ correoJuridicoId: 'sent-2' }));
        });

        it('debe no hacer nada si no encuentra ningún correo enviado relacionado', async () => {
            mockCorreoRepo.findOne.mockResolvedValue(null);

            await (service as any).propagarEventoAEnviado({ threadId: 'thread-3', asunto: 'RE: Nada' }, 'LEIDO', 'Leído');

            expect(mockHistorialRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('getTrackingBaseUrl()', () => {
        it('debe usar TRACKING_PUBLIC_URL cuando está definida', async () => {
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-5', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            await service.sendEmail({ to: 'destino@test.com', subject: 'URL', body: '<p>Hola</p>', requestReadReceipt: true });

            expect(mockGraphService.sendEmail.mock.calls[0][2]).toContain('https://test.esap.gov.co/services/legal/api/v1/correos/track/open/');
        });

        it('debe usar CORS_ORIGIN como fallback cuando TRACKING_PUBLIC_URL no está', async () => {
            delete process.env.TRACKING_PUBLIC_URL;
            process.env.CORS_ORIGIN = 'https://cors.test.esap.gov.co';
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-6', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            await service.sendEmail({ to: 'destino@test.com', subject: 'URL fallback', body: '<p>Hola</p>', requestReadReceipt: true });

            expect(mockGraphService.sendEmail.mock.calls[0][2]).toContain('https://cors.test.esap.gov.co/services/legal/api/v1/correos/track/open/');
        });

        it('debe derivar el host público desde el Origin de la request (dinámico por ambiente)', async () => {
            // Sin TRACKING_PUBLIC_URL: el host debe salir de la request, no del env ni de localhost
            delete process.env.TRACKING_PUBLIC_URL;
            delete process.env.CORS_ORIGIN;
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-req', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            const req = { headers: { origin: 'http://172.16.202.222' } };
            await service.sendEmail({ to: 'destino@test.com', subject: 'Dinamico', body: '<p>Hola</p>', requestReadReceipt: true }, req);

            expect(mockGraphService.sendEmail.mock.calls[0][2]).toContain('http://172.16.202.222/services/legal/api/v1/correos/track/open/');
        });

        it('debe ignorar hosts internos de Docker y caer al fallback de configuración', async () => {
            // Un Host interno (api-gateway-pre:3000) no sirve para un destinatario externo:
            // se ignora y se usa CORS_ORIGIN como respaldo.
            delete process.env.TRACKING_PUBLIC_URL;
            process.env.CORS_ORIGIN = 'https://cors.test.esap.gov.co';
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-int', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            const req = { headers: { host: 'api-gateway-pre:3000' } };
            await service.sendEmail({ to: 'destino@test.com', subject: 'Interno', body: '<p>Hola</p>', requestReadReceipt: true }, req);

            expect(mockGraphService.sendEmail.mock.calls[0][2]).toContain('https://cors.test.esap.gov.co/services/legal/api/v1/correos/track/open/');
        });
    });

    describe('processTrackingPixel() - acuse de recibido automático', () => {
        it('debe notificar a JEFE_GESTION_LEGAL en la primera apertura del pixel', async () => {
            mockTrackingRepo.findOne.mockResolvedValue({
                id: 'track-1',
                correoId: 'correo-1',
                tipo: 'OPEN_PIXEL',
                abierto: false,
                destinatarioEmail: 'destino@test.com',
            });
            mockCorreoRepo.findOne.mockResolvedValue({
                id: 'correo-1',
                direccion: 'ENVIADO',
                asunto: 'Asunto de prueba',
                remitenteNombre: 'Oficina Jurídica',
                destinatariosTo: 'destino@test.com',
                fechaRecepcion: new Date(),
            });

            await service.processTrackingPixel('token-1', '127.0.0.1', 'jest-agent');
            // notificarAcuseDeRecibido() se dispara sin esperarse (fire-and-forget) — dejar drenar microtasks.
            await new Promise((resolve) => setImmediate(resolve));

            expect(mockTrackingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ abierto: true }));
            expect(mockHistorialRepo.save).toHaveBeenCalledWith(expect.objectContaining({ tipoEvento: 'CORREO_ABIERTO_EXTERNO' }));
            expect(mockNotificationClient.notifyByRoles).toHaveBeenCalledWith(
                ['JEFE_GESTION_LEGAL'],
                expect.objectContaining({ tipo_notificacion: 'ACUSE_RECIBIDO_CORREO' }),
                expect.objectContaining({ subject: expect.stringContaining('Acuse de recibido') }),
            );
        });

        it('no debe notificar de nuevo en aperturas posteriores del mismo correo', async () => {
            mockTrackingRepo.findOne.mockResolvedValue({
                id: 'track-2',
                correoId: 'correo-2',
                tipo: 'OPEN_PIXEL',
                abierto: true,
                destinatarioEmail: 'destino@test.com',
            });

            await service.processTrackingPixel('token-2', '127.0.0.1', 'jest-agent');
            await new Promise((resolve) => setImmediate(resolve));

            expect(mockHistorialRepo.save).not.toHaveBeenCalled();
            expect(mockNotificationClient.notifyByRoles).not.toHaveBeenCalled();
        });

        it('no debe hacer nada si no existe un token de tracking (correo enviado sin solicitar confirmación)', async () => {
            mockTrackingRepo.findOne.mockResolvedValue(null);

            await service.processTrackingPixel('token-inexistente', '127.0.0.1', 'jest-agent');
            await new Promise((resolve) => setImmediate(resolve));

            expect(mockTrackingRepo.save).not.toHaveBeenCalled();
            expect(mockNotificationClient.notifyByRoles).not.toHaveBeenCalled();
        });
    });

    describe('syncInbox() - rutas de error/fallback', () => {
        it('debe continuar el sync si un email individual falla', async () => {
            jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
            mockGraphService.getEmailsPage.mockResolvedValue({
                emails: [
                    { id: 'email-1', subject: 'Falla', from: { emailAddress: {} }, receivedDateTime: new Date(), isRead: false },
                    { id: 'email-2', subject: 'OK', from: { emailAddress: {} }, receivedDateTime: new Date(), isRead: false },
                ],
                nextLink: null,
            });
            mockCorreoRepo.findOne.mockResolvedValue(null);
            mockSmartService.classify
                .mockRejectedValueOnce(new Error('clasificador caído'))
                .mockResolvedValueOnce({ category: 'CORREO', module: 'CENTRO_COMUNICACIONES', confidence: 0.8 });
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: 'saved-1', ...data }));

            const result = await service.syncInbox();

            expect(result.synced).toBe(1);
            expect(result.errors).toBe(1);
        });

        it('debe contar errores y logar warning al final del sync si hay fallos parciales', async () => {
            jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
            mockGraphService.getEmailsPage.mockResolvedValue({
                emails: [{ id: 'email-1', subject: 'Falla', from: { emailAddress: {} }, receivedDateTime: new Date(), isRead: false }],
                nextLink: null,
            });
            mockCorreoRepo.findOne.mockRejectedValue(new Error('BD intermitente'));

            const result = await service.syncInbox();

            expect(result.errors).toBe(1);
            expect(result.total).toBe(1);
        });
    });

    describe('markAsRead()', () => {
        it('debe actualizar estado en BD aunque MicrosoftGraphService.markAsRead falle', async () => {
            const correo = { id: 'correo-read', graphMessageId: 'graph-1', leido: false, direccion: 'ENTRANTE', threadId: 'thread-1', asunto: 'Tema' };
            mockCorreoRepo.findOne.mockResolvedValueOnce(correo).mockResolvedValueOnce(null);
            mockGraphService.markAsRead.mockRejectedValue(new Error('sin permiso'));
            mockCorreoRepo.save.mockImplementation(async (data) => data);

            const result = await service.markAsRead('correo-read');

            expect(result.leido).toBe(true);
            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ leido: true }));
        });
    });

    describe('derivarANuevoProceso() — derivar comunicación a un proceso RECIÉN CREADO', () => {
        const correoBase = {
            id: 'correo-1',
            asunto: 'Solicitud de concepto',
            remitenteEmail: 'externo@test.com',
            remitenteNombre: 'Externo',
        };

        it('lanza BadRequestException si no se indica procesoId', async () => {
            await expect(service.derivarANuevoProceso('correo-1', '' as any, 'DEFENSA')).rejects.toThrow(BadRequestException);
            expect(mockCorreoRepo.findOne).not.toHaveBeenCalled();
        });

        it('lanza NotFoundException si el correo no existe', async () => {
            mockCorreoRepo.findOne.mockResolvedValue(null);
            await expect(service.derivarANuevoProceso('no-existe', 'proc-1', 'DEFENSA')).rejects.toThrow(NotFoundException);
        });

        it('DEFENSA: vincula el correo al expediente y copia todos los adjuntos (caso feliz)', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([
                { id: 'adj-1', nombre: 'oficio.pdf', contentType: 'application/pdf', tamanio: 100 },
            ]);
            jest.spyOn(service, 'downloadAttachment').mockResolvedValue({
                name: 'oficio.pdf', contentType: 'application/pdf', contentBytes: Buffer.from('x').toString('base64'), size: 1,
            });

            const result = await service.derivarANuevoProceso('correo-1', 'exp-1', 'DEFENSA');

            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ expedienteId: 'exp-1', moduloDestino: 'DEFENSA_JUDICIAL' }));
            expect(mockExpedienteRepo.update).toHaveBeenCalledWith({ id: 'exp-1' }, { origenComunicacionId: 'correo-1' });
            expect(mockConsultaRepo.update).not.toHaveBeenCalled();
            expect(mockDocumentoRepo.save).toHaveBeenCalledTimes(1);
            expect(mockDocumentoConsultaRepo.save).not.toHaveBeenCalled();
            expect(result).toEqual(expect.objectContaining({ vinculado: true, documentosCopiados: 1, documentosTotal: 1 }));
            expect(mockHistorialRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                tipoEvento: 'PROCESO_CREADO',
                descripcion: expect.stringContaining('1 documento(s) adjuntado(s)'),
            }));
        });

        it('DISCIPLINARIO: vincula el correo al expediente (comparte tabla con Defensa)', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([]);

            const result = await service.derivarANuevoProceso('correo-1', 'exp-disc-1', 'DISCIPLINARIO');

            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ expedienteId: 'exp-disc-1', moduloDestino: 'JUZGAMIENTO_DISCIPLINARIO' }));
            expect(mockExpedienteRepo.update).toHaveBeenCalledWith({ id: 'exp-disc-1' }, { origenComunicacionId: 'correo-1' });
            expect(result.documentosTotal).toBe(0);
            expect(result.documentosCopiados).toBe(0);
            expect(result.vinculado).toBe(true);
        });

        it('ASESORIA: vincula el correo a la consulta jurídica y copia adjuntos a documentos_consulta', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([
                { id: 'adj-1', nombre: 'derecho-peticion.pdf', contentType: 'application/pdf', tamanio: 50 },
            ]);
            jest.spyOn(service, 'downloadAttachment').mockResolvedValue({
                name: 'derecho-peticion.pdf', contentType: 'application/pdf', contentBytes: Buffer.from('y').toString('base64'), size: 1,
            });

            const result = await service.derivarANuevoProceso('correo-1', 'consulta-1', 'ASESORIA');

            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ consultaId: 'consulta-1', moduloDestino: 'ASESORIA_JURIDICA' }));
            expect(mockConsultaRepo.update).toHaveBeenCalledWith({ id: 'consulta-1' }, { origenComunicacionId: 'correo-1' });
            expect(mockExpedienteRepo.update).not.toHaveBeenCalled();
            expect(mockDocumentoConsultaRepo.save).toHaveBeenCalledTimes(1);
            expect(mockDocumentoRepo.save).not.toHaveBeenCalled();
            expect(result.documentosCopiados).toBe(1);
        });

        it('usa DEFENSA_JUDICIAL por defecto si targetModule es desconocido/no reconocido', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([]);

            await service.derivarANuevoProceso('correo-1', 'exp-x', 'algo-raro');

            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ expedienteId: 'exp-x', moduloDestino: 'DEFENSA_JUDICIAL' }));
        });

        it('BUG CORREGIDO: si falla la trazabilidad inversa (origen_comunicacion_id) el correo igual queda vinculado y la función no lanza', async () => {
            // Reproduce el bug reportado: el proceso se crea, pero antes la comunicación no
            // quedaba vinculada porque un fallo en la actualización del proceso (p. ej. una
            // migración de BD pendiente en el ambiente) abortaba todo antes de guardar el correo.
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([]);
            mockExpedienteRepo.update.mockRejectedValue(new Error('column "origen_comunicacion_id" does not exist'));
            jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

            const result = await service.derivarANuevoProceso('correo-1', 'exp-migracion-pendiente', 'DEFENSA');

            expect(result.vinculado).toBe(true);
            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ expedienteId: 'exp-migracion-pendiente' }));
        });

        it('copia parcial: si un adjunto falla al descargarse, los demás igual se copian y el correo queda vinculado', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([
                { id: 'adj-ok', nombre: 'ok.pdf', contentType: 'application/pdf', tamanio: 10 },
                { id: 'adj-falla', nombre: 'falla.pdf', contentType: 'application/pdf', tamanio: 10 },
            ]);
            jest.spyOn(service, 'downloadAttachment').mockImplementation(async (id: string) => {
                if (id === 'adj-falla') throw new Error('Graph API: mensaje ya no existe en el buzón');
                return { name: 'ok.pdf', contentType: 'application/pdf', contentBytes: Buffer.from('z').toString('base64'), size: 1 };
            });
            jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);

            const result = await service.derivarANuevoProceso('correo-1', 'exp-1', 'DEFENSA');

            expect(result.vinculado).toBe(true);
            expect(result.documentosCopiados).toBe(1);
            expect(result.documentosTotal).toBe(2);
            expect(mockHistorialRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                descripcion: expect.stringContaining('1/2 documento(s) adjuntado(s)'),
            }));
        });

        it('todos los adjuntos fallan: la comunicación igual queda vinculada, sin lanzar excepción', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([
                { id: 'adj-1', nombre: 'a.pdf', contentType: 'application/pdf', tamanio: 10 },
                { id: 'adj-2', nombre: 'b.pdf', contentType: 'application/pdf', tamanio: 10 },
            ]);
            jest.spyOn(service, 'downloadAttachment').mockRejectedValue(new Error('token expirado'));
            jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);

            const result = await service.derivarANuevoProceso('correo-1', 'exp-1', 'DEFENSA');

            expect(result.vinculado).toBe(true);
            expect(result.documentosCopiados).toBe(0);
            expect(result.documentosTotal).toBe(2);
            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ expedienteId: 'exp-1' }));
        });

        it('sin adjuntos: queda vinculado y el mensaje de historial no menciona documentos', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([]);

            const result = await service.derivarANuevoProceso('correo-1', 'exp-1', 'DEFENSA');

            expect(result.documentosTotal).toBe(0);
            expect(mockHistorialRepo.save).toHaveBeenCalledWith(expect.objectContaining({
                descripcion: 'Proceso creado a partir de esta comunicación (DEFENSA_JUDICIAL)',
            }));
        });

        it('propaga la excepción si el guardado del vínculo (correoRepo.save) falla, sin intentar copiar adjuntos', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ ...correoBase });
            mockCorreoRepo.save.mockRejectedValue(new Error('FK violation: expediente no existe'));

            await expect(service.derivarANuevoProceso('correo-1', 'exp-inexistente', 'DEFENSA')).rejects.toThrow('FK violation');
            expect(mockAdjuntoRepo.find).not.toHaveBeenCalled();
        });
    });

    describe('linkToProcess() — asociar comunicación a un proceso EXISTENTE', () => {
        it('lanza NotFoundException si el correo no existe', async () => {
            mockCorreoRepo.findOne.mockResolvedValue(null);
            await expect(service.linkToProcess('no-existe', 'proc-1', 'DEFENSA')).rejects.toThrow(NotFoundException);
        });

        it('ASESORIA: asocia el correo a la consulta y no lanza aunque falle la copia de un adjunto', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ id: 'correo-2', asunto: 'Consulta' });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([{ id: 'adj-1', nombre: 'x.pdf', contentType: 'application/pdf', tamanio: 5 }]);
            jest.spyOn(service, 'downloadAttachment').mockRejectedValue(new Error('sin acceso'));
            jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
            jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

            const result = await service.linkToProcess('correo-2', 'consulta-9', 'ASESORIA');

            expect(result).toEqual(expect.objectContaining({ consultaId: 'consulta-9', moduloDestino: 'ASESORIA_JURIDICA' }));
            expect(mockDocumentoConsultaRepo.save).not.toHaveBeenCalled();
        });

        it('DEFENSA: asocia al expediente y crea Actuación con el primer adjunto', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ id: 'correo-3', asunto: 'Demanda', remitenteNombre: 'Juzgado', fechaRecepcion: new Date() });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([{ id: 'adj-9', nombre: 'demanda.pdf' }]);

            const result = await service.linkToProcess('correo-3', 'exp-9', 'DEFENSA');

            expect(result).toEqual(expect.objectContaining({ expedienteId: 'exp-9', moduloDestino: 'DEFENSA_JUDICIAL' }));
            expect(mockActuacionService.registrarActuacion).toHaveBeenCalledWith('exp-9', expect.objectContaining({
                tipoActuacion: 'OFICIO',
                documentoNombre: 'demanda.pdf',
            }));
        });

        it('no lanza si registrarActuacion falla (la Actuación es complementaria, no bloqueante)', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ id: 'correo-4', asunto: 'Demanda', fechaRecepcion: new Date() });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockAdjuntoRepo.find.mockResolvedValue([]);
            mockActuacionService.registrarActuacion.mockRejectedValue(new Error('actuacion service caído'));
            jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);

            await expect(service.linkToProcess('correo-4', 'exp-10', 'DISCIPLINARIO'))
                .resolves.toEqual(expect.objectContaining({ expedienteId: 'exp-10' }));
        });
    });

    describe('updateClassification() — corrección manual de categoría', () => {
        it('lanza NotFoundException si el correo no existe', async () => {
            mockCorreoRepo.findOne.mockResolvedValue(null);
            await expect(service.updateClassification('no-existe', 'OFICIO')).rejects.toThrow(NotFoundException);
        });

        it('BUG CORREGIDO: al corregir la categoría, moduloSugerido queda sincronizado (antes se quedaba con el valor viejo)', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({
                id: 'correo-5', asunto: 'Solicitud', cuerpoTexto: 'texto', categoria: 'CORREO', moduloSugerido: 'Buzón General', isTrained: false,
            });
            mockCorreoRepo.save.mockImplementation(async (data) => data);
            mockSmartService.resolveModuleForCategory.mockReturnValue('MOD-03: Asesoría Jurídica');

            const result = await service.updateClassification('correo-5', 'CONSULTA');

            expect(mockSmartService.resolveModuleForCategory).toHaveBeenCalledWith('CONSULTA', 'Solicitud', 'texto');
            expect(result.moduloSugerido).toBe('MOD-03: Asesoría Jurídica');
            expect(result.categoria).toBe('CONSULTA');
            expect(result.isTrained).toBe(true);
        });

        it('marca isTrained y reentrena el clasificador con el texto corregido', async () => {
            mockCorreoRepo.findOne.mockResolvedValue({ id: 'correo-6', asunto: 'Oficio recibido', cuerpoTexto: 'cuerpo', categoria: 'CORREO' });
            mockCorreoRepo.save.mockImplementation(async (data) => data);

            await service.updateClassification('correo-6', 'OFICIO');

            expect(mockSmartService.train).toHaveBeenCalledWith('Oficio recibido cuerpo', 'OFICIO');
            const saved = mockCorreoRepo.save.mock.calls[0][0];
            expect(saved.tipo).toBe('OFICIO');
        });
    });

    describe('Integración con Control Interno Disciplinario (Expediente Electrónico)', () => {
        it('registrarTransferenciaDisciplinaria: debe registrar correo y adjuntos desde transferencia directa', async () => {
            mockCorreoRepo.findOne.mockResolvedValue(null);
            mockCorreoRepo.create.mockImplementation((d: any) => d);
            mockCorreoRepo.save.mockImplementation(async (d: any) => ({ id: 'correo-transf-1', ...d }));
            mockAdjuntoRepo.find
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([
                    { id: 'adj-1', nombre: 'Prueba_Documental.pdf', contentType: 'application/pdf' },
                ]);

            const dto = {
                processId: 'proc-123',
                radicado: 'RAD-DISC-2026-001',
                asunto: '[PLIEGO DE CARGOS] Proceso RAD-DISC-2026-001 - Traslado a Oficina Jurídica',
                remitente: {
                    nombre: 'Radicador Disciplinario',
                    email: 'radicador@esap.edu.co',
                },
                documentos: [
                    {
                        id: 'ev-1',
                        nombre: 'Prueba_Documental.pdf',
                        tipo: 'EVIDENCIA',
                        url: 'uploads/expedientes/2026/Prueba_Documental.pdf',
                        contentType: 'application/pdf',
                        tamano: 1024,
                    },
                ],
            };

            const result = await service.registrarTransferenciaDisciplinaria(dto);

            expect(result.correo).toBeDefined();
            expect(result.correo.asunto).toContain('RAD-DISC-2026-001');
            expect(result.adjuntos.length).toBe(1);
            expect(mockAdjuntoRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    nombre: 'Prueba_Documental.pdf',
                    contentType: 'application/pdf',
                }),
            );
        });

        it('sincronizarDocumentosExpedienteDisciplinario: debe hidratar adjuntos consultando schema disciplinario', async () => {
            const correoMock = {
                id: 'correo-disc-1',
                asunto: '[PLIEGO DE CARGOS] Proceso RAD-2026-099 - Traslado a Oficina Jurídica',
                cuerpoTexto: 'Contenido del correo',
            };
            mockCorreoRepo.findOne.mockResolvedValue(correoMock);
            mockAdjuntoRepo.find
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([
                    { id: 'adj-1', nombre: 'Queja.pdf' },
                    { id: 'adj-2', nombre: 'Auto-001.pdf' },
                ]);

            mockExpedienteRepo.query
                .mockResolvedValueOnce([{ id: 'proc-99', radicadoProceso: 'RAD-2026-099', newsId: 'news-99' }])
                .mockResolvedValueOnce([
                    { id: 'ev-99', nombreDocumento: 'Queja.pdf', archivoUrl: 'uploads/Queja.pdf', fileType: 'application/pdf' },
                ])
                .mockResolvedValueOnce([
                    { id: 'auto-99', tipo: 'PLIEGO_CARGOS', numero: '001', firmaUrl: 'uploads/Auto.pdf', documentType: 'application/pdf' },
                ])
                .mockResolvedValueOnce([]);

            const result = await service.sincronizarDocumentosExpedienteDisciplinario('correo-disc-1');

            expect(result.length).toBe(2);
            expect(mockAdjuntoRepo.save).toHaveBeenCalled();
        });

        it('getAttachments: debe invocar sincronizarDocumentosExpedienteDisciplinario si adjuntos está vacío y es correo disciplinario', async () => {
            const correoMock = {
                id: 'correo-disc-auto',
                asunto: '[PLIEGO DE CARGOS] Proceso RAD-2026-888',
                cuerpoTexto: '',
            };
            mockCorreoRepo.findOne.mockResolvedValue(correoMock);
            mockAdjuntoRepo.find
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([
                    { id: 'adj-auto-1', name: 'Auto_Pliego.pdf', isDisciplinarioDoc: true },
                ]);

            mockExpedienteRepo.query
                .mockResolvedValueOnce([{ id: 'proc-888', radicado: 'RAD-2026-888' }])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ id: 'auto-888', tipo: 'PLIEGO_CARGOS', numero: '888', contenido: '<p>Auto</p>' }])
                .mockResolvedValueOnce([]);

            const attachments = await service.getAttachments('correo-disc-auto');

            expect(mockExpedienteRepo.query).toHaveBeenCalled();
            expect(attachments.length).toBe(1);
        });
    });
});
