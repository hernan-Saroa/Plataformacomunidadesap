import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConsultaJuridicaHistorial } from '../entities/consulta-juridica-historial.entity';
import { ConsultaJuridica } from '../entities/consulta-juridica.entity';
import { ConsultasJuridicasService } from './consultas-juridicas.service';
import { DiasHabilesService } from './dias-habiles.service';
import { DocumentosConsultaService } from './documentos-consulta.service';
import { LegalNotificationsService } from './legal-notifications.service';
import { NotificationClientService } from './notification-client.service';
import { TerminosService } from './terminos.service';

describe('ConsultasJuridicasService', () => {
    let service: ConsultasJuridicasService;
    let mockConsultaRepo: any;
    let mockHistorialRepo: any;
    let mockTerminosService: any;
    let mockDiasHabilesService: any;
    let mockDocumentosService: any;
    let mockNotificationClient: any;
    let mockLegalNotifications: any;

    beforeEach(async () => {
        mockConsultaRepo = {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn((data) => Promise.resolve(data)),
            update: jest.fn(),
            remove: jest.fn(),
            create: jest.fn((data) => data),
            createQueryBuilder: jest.fn(),
        };
        mockHistorialRepo = {
            query: jest.fn().mockResolvedValue([]),
            save: jest.fn((data) => Promise.resolve(data)),
            find: jest.fn(),
            create: jest.fn((data) => data),
        };
        mockTerminosService = { createAutomatico: jest.fn() };
        mockDiasHabilesService = {
            obtenerTerminoLegal: jest.fn().mockReturnValue(30),
            agregarDiasHabiles: jest.fn().mockReturnValue(new Date('2026-06-30T00:00:00.000Z')),
            calcularDiasHabiles: jest.fn(),
        };
        mockDocumentosService = { create: jest.fn() };
        mockNotificationClient = {
            notifyByRoles: jest.fn(),
            notifyUserById: jest.fn(),
            getUserDetailsById: jest.fn().mockResolvedValue(null),
            sendEmail: jest.fn(),
        };
        mockLegalNotifications = { notifyProcesoCreado: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ConsultasJuridicasService,
                { provide: getRepositoryToken(ConsultaJuridica), useValue: mockConsultaRepo },
                { provide: getRepositoryToken(ConsultaJuridicaHistorial), useValue: mockHistorialRepo },
                { provide: TerminosService, useValue: mockTerminosService },
                { provide: DiasHabilesService, useValue: mockDiasHabilesService },
                { provide: DocumentosConsultaService, useValue: mockDocumentosService },
                { provide: NotificationClientService, useValue: mockNotificationClient },
                { provide: LegalNotificationsService, useValue: mockLegalNotifications },
            ],
        }).compile();

        service = module.get<ConsultasJuridicasService>(ConsultasJuridicasService);
    });

    afterEach(() => jest.clearAllMocks());

    // aprobarRespuesta()/devolverRespuesta() disparan la notificación al abogado sin
    // esperarla (fire-and-forget) para no bloquear la respuesta HTTP. Este helper deja
    // correr la cola de microtareas para que la notificación ya se haya enviado antes
    // de las aserciones.
    const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

    describe('create()', () => {
        it('debe generar numeroRadicado con formato CJ-{YEAR}-{SEQUENCIAL:4d}', async () => {
            const year = new Date().getFullYear();
            mockConsultaRepo.find.mockResolvedValue([{ numeroRadicado: `CJ-${year}-0009` }]);
            mockConsultaRepo.save.mockImplementation(async (data) => ({ id: 'consulta-1', ...data }));

            const result = await service.create({ tipoSolicitud: 'consulta', nombreSolicitante: 'Solicitante' });

            expect(result.numeroRadicado).toBe(`CJ-${year}-0010`);
        });

        it('debe calcular fechaMaximaRespuesta en días hábiles', async () => {
            mockConsultaRepo.find.mockResolvedValue([]);
            mockConsultaRepo.save.mockImplementation(async (data) => ({ id: 'consulta-2', ...data }));

            const result = await service.create({ tipoSolicitud: 'concepto_juridico' });

            expect(mockDiasHabilesService.obtenerTerminoLegal).toHaveBeenCalledWith('concepto_juridico');
            expect(mockDiasHabilesService.agregarDiasHabiles).toHaveBeenCalledWith(expect.any(Date), 30);
            expect(result.fechaMaximaRespuesta).toEqual(new Date('2026-06-30T00:00:00.000Z'));
        });

        it('debe llamar terminosService.createAutomatico() tras crear la consulta', async () => {
            mockConsultaRepo.find.mockResolvedValue([]);
            mockConsultaRepo.save.mockImplementation(async (data) => ({ id: 'consulta-3', ...data }));

            await service.create({ tipoSolicitud: 'consulta', terminoLegalDias: 15, abogadoAsignadoId: '11111111-1111-1111-1111-111111111111' });

            expect(mockTerminosService.createAutomatico).toHaveBeenCalledWith(
                'ASESORIA',
                'consulta-3',
                expect.stringMatching(/^CJ-\d{4}-0001$/),
                'consulta',
                expect.any(Date),
                15,
                '11111111-1111-1111-1111-111111111111',
            );
        });

        it('debe llamar notifyProcesoCreado() con el módulo ASESORIA_JURIDICA', async () => {
            mockConsultaRepo.find.mockResolvedValue([]);
            mockConsultaRepo.save.mockImplementation(async (data) => ({ id: 'consulta-4', ...data }));

            await service.create({ nombreSolicitante: 'María' });

            expect(mockLegalNotifications.notifyProcesoCreado).toHaveBeenCalledWith(expect.objectContaining({
                modulo: 'ASESORIA_JURIDICA',
                procesoId: 'consulta-4',
                creadoPor: 'María',
            }));
        });
    });

    describe('responder()', () => {
        it("debe cambiar estado a 'respondido' y registrar evento RESPUESTA en historial", async () => {
            const consulta = { id: 'consulta-5', estado: 'asignado' } as ConsultaJuridica;
            mockConsultaRepo.findOne.mockResolvedValue(consulta);

            const result = await service.responder('consulta-5', { tipoRespuesta: 'favorable', numeroOficioRespuesta: 'OFI-1' }, 'Abogado');

            expect(result.estado).toBe('respondido');
            expect(mockHistorialRepo.save).toHaveBeenCalledWith(expect.objectContaining({ tipoEvento: 'RESPUESTA', consultaId: 'consulta-5' }));
        });

        it('debe lanzar NotFoundException si la consulta no existe', async () => {
            mockConsultaRepo.findOne.mockResolvedValue(null);

            await expect(service.responder('missing', { tipoRespuesta: 'favorable' })).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('aprobarRespuesta()', () => {
        it('debe cambiar estado a respondido y notificar (in-app + correo) al abogado asignado', async () => {
            const consulta = {
                id: 'consulta-6',
                numeroRadicado: 'CJ-2026-0006',
                estado: 'pendiente_revision_jefe',
                abogadoAsignadoId: 'abogado-1',
            } as ConsultaJuridica;
            mockConsultaRepo.findOne.mockResolvedValue(consulta);
            mockNotificationClient.getUserDetailsById.mockResolvedValue({ id_user: 'abogado-1', email: 'abogado@esap.edu.co' });

            const result = await service.aprobarRespuesta('consulta-6', 'Jefe');
            await flushPromises();

            expect(result.estado).toBe('respondido');
            expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
                'abogado-1',
                expect.objectContaining({ tipo_notificacion: 'RESPUESTA_APROBADA' }),
            );
            expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
                'abogado@esap.edu.co',
                expect.stringContaining('CJ-2026-0006'),
                expect.any(String),
            );
        });

        it('no debe intentar notificar si la consulta no tiene abogado asignado', async () => {
            const consulta = { id: 'consulta-7', estado: 'pendiente_revision_jefe' } as ConsultaJuridica;
            mockConsultaRepo.findOne.mockResolvedValue(consulta);

            await service.aprobarRespuesta('consulta-7', 'Jefe');
            await flushPromises();

            expect(mockNotificationClient.notifyUserById).not.toHaveBeenCalled();
            expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
        });
    });

    describe('devolverRespuesta()', () => {
        it('debe cambiar estado a devuelta_por_jefe y notificar (in-app + correo) al abogado con el motivo', async () => {
            const consulta = {
                id: 'consulta-8',
                numeroRadicado: 'CJ-2026-0008',
                estado: 'pendiente_revision_jefe',
                abogadoAsignadoId: 'abogado-2',
            } as ConsultaJuridica;
            mockConsultaRepo.findOne.mockResolvedValue(consulta);
            mockNotificationClient.getUserDetailsById.mockResolvedValue({ id_user: 'abogado-2', email: 'abogado2@esap.edu.co' });

            const result = await service.devolverRespuesta('consulta-8', 'Falta el oficio', 'Jefe');
            await flushPromises();

            expect(result.estado).toBe('devuelta_por_jefe');
            expect(result.comentarioDevolucionJefe).toBe('Falta el oficio');
            expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
                'abogado-2',
                expect.objectContaining({
                    tipo_notificacion: 'RESPUESTA_DEVUELTA',
                    mensaje: expect.stringContaining('Falta el oficio'),
                }),
            );
            expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
                'abogado2@esap.edu.co',
                expect.stringContaining('CJ-2026-0008'),
                expect.any(String),
            );
        });

        it('no debe enviar correo si el abogado asignado no tiene email registrado', async () => {
            const consulta = {
                id: 'consulta-9',
                numeroRadicado: 'CJ-2026-0009',
                estado: 'pendiente_revision_jefe',
                abogadoAsignadoId: 'abogado-3',
            } as ConsultaJuridica;
            mockConsultaRepo.findOne.mockResolvedValue(consulta);
            mockNotificationClient.getUserDetailsById.mockResolvedValue({ id_user: 'abogado-3', email: null });

            await service.devolverRespuesta('consulta-9', 'Motivo', 'Jefe');
            await flushPromises();

            expect(mockNotificationClient.notifyUserById).toHaveBeenCalled();
            expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
        });
    });

    describe('calcularDiasRestantes()', () => {
        it('debe retornar días hábiles correctos entre hoy y fechaMaximaRespuesta', () => {
            mockDiasHabilesService.calcularDiasHabiles.mockReturnValue(6);

            expect(service.calcularDiasRestantes(new Date('2026-05-29T00:00:00.000Z'))).toBe(6);
        });

        it('debe retornar valor no positivo si la consulta ya venció', () => {
            mockDiasHabilesService.calcularDiasHabiles.mockReturnValue(4);

            expect(service.calcularDiasRestantes(new Date('2026-05-01T00:00:00.000Z'))).toBeLessThanOrEqual(0);
        });
    });

    describe('onModuleInit() fallback', () => {
        it('debe completar la inicialización aunque historialRepository.query() falle', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => undefined);
            mockHistorialRepo.query.mockRejectedValue(new Error('DDL no disponible'));

            await expect(service.onModuleInit()).resolves.toBeUndefined();
        });
    });

    describe('calcularPrioridadAutomatica()', () => {
        it('debe retornar ALTA si días restantes <= 3, MEDIA si <= 7, BAJA en otro caso', () => {
            expect(service.calcularPrioridadAutomatica(3)).toBe('alta');
            expect(service.calcularPrioridadAutomatica(7)).toBe('media');
            expect(service.calcularPrioridadAutomatica(8)).toBe('baja');
        });
    });
});
