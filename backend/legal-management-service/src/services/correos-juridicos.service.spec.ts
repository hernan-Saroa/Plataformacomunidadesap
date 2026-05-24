import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdjuntoCorreo } from '../entities/adjunto-correo.entity';
import { CorreoJuridicoHistorial } from '../entities/correo-juridico-historial.entity';
import { CorreoJuridico } from '../entities/correo-juridico.entity';
import { CorreoTrackingToken } from '../entities/correo-tracking-token.entity';
import { ActuacionService } from './actuacion.service';
import { CorreosJuridicosService } from './correos-juridicos.service';
import { MicrosoftGraphService } from './microsoft-graph.service';
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
    let mockGraphService: any;
    let mockSmartService: any;
    let mockActuacionService: any;

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
        mockGraphService = {
            sendEmail: jest.fn(),
            getEmails: jest.fn(),
            getEmailsPage: jest.fn(),
            markAsRead: jest.fn(),
            getAttachment: jest.fn(),
            getAttachments: jest.fn(),
            downloadAttachment: jest.fn(),
        };
        mockSmartService = {
            classify: jest.fn(),
            analyzeUrgency: jest.fn().mockReturnValue(false),
            extractEntities: jest.fn().mockReturnValue({}),
        };
        mockActuacionService = { create: jest.fn(), registrarActuacion: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CorreosJuridicosService,
                { provide: getRepositoryToken(CorreoJuridico), useValue: mockCorreoRepo },
                { provide: getRepositoryToken(AdjuntoCorreo), useValue: mockAdjuntoRepo },
                { provide: getRepositoryToken(CorreoJuridicoHistorial), useValue: mockHistorialRepo },
                { provide: getRepositoryToken(CorreoTrackingToken), useValue: mockTrackingRepo },
                { provide: MicrosoftGraphService, useValue: mockGraphService },
                { provide: SmartClassificationService, useValue: mockSmartService },
                { provide: ActuacionService, useValue: mockActuacionService },
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

            const result = await service.sendEmail({ to: 'destino@test.com', subject: 'Asunto', body: '<p>Hola</p>' });

            expect(result.success).toBe(true);
            expect(mockCorreoRepo.save).toHaveBeenCalledWith(expect.objectContaining({ asunto: 'Asunto', direccion: 'ENVIADO' }));
            expect(mockGraphService.sendEmail).toHaveBeenCalledWith('destino@test.com', 'Asunto', expect.stringContaining('/correos/track/open/'), undefined, []);
        });

        it('debe inyectar pixel de tracking en el body HTML antes de enviar', async () => {
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-2', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            await service.sendEmail({ to: 'destino@test.com', subject: 'Tracking', body: '<p>Contenido</p>' });

            expect(mockGraphService.sendEmail.mock.calls[0][2]).toContain('<img src="https://test.esap.gov.co/services/legal/api/v1/correos/track/open/');
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

            await service.sendEmail({ to: 'destino@test.com', subject: 'URL', body: '<p>Hola</p>' });

            expect(mockGraphService.sendEmail.mock.calls[0][2]).toContain('https://test.esap.gov.co/services/legal/api/v1/correos/track/open/');
        });

        it('debe usar CORS_ORIGIN como fallback cuando TRACKING_PUBLIC_URL no está', async () => {
            delete process.env.TRACKING_PUBLIC_URL;
            process.env.CORS_ORIGIN = 'https://cors.test.esap.gov.co';
            mockCorreoRepo.save.mockImplementation(async (data) => ({ id: data.id || 'correo-6', ...data }));
            mockGraphService.sendEmail.mockResolvedValue(true);

            await service.sendEmail({ to: 'destino@test.com', subject: 'URL fallback', body: '<p>Hola</p>' });

            expect(mockGraphService.sendEmail.mock.calls[0][2]).toContain('https://cors.test.esap.gov.co/services/legal/api/v1/correos/track/open/');
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
});
