import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Actuacion } from '../entities/actuacion.entity';
import { ActuacionService } from './actuacion.service';
import { ConfigurationsService } from './configurations.service';
import { ExpedienteService } from './expediente.service';
import { NotificationClientService } from './notification-client.service';
import { TerminosService } from './terminos.service';

describe('ActuacionService', () => {
    let service: ActuacionService;
    let mockActuacionRepo: any;
    let mockExpedienteService: any;
    let mockTerminosService: any;
    let mockConfigService: any;
    let mockNotificationClient: any;
    let mockDataSource: any;
    let mockDocumentoRepo: any;

    // Documento PDF firmado, tal como lo dejaría el flujo de firma individual en el visor.
    const documentoFirmado = (id = 'doc-1', nombre = 'contrato.pdf') => ({
        id,
        nombre,
        descripcion: JSON.stringify({ firmado: true }),
    });

    const expedienteBase = {
        id: 'expediente-1',
        radicado: 'RAD-001',
        jurisdiccion: 'JUDICIAL',
        tipoProceso: 'ORDINARIO',
        etapaProcesal: 'etapa-2',
        abogadoSustanciador: 'abogado-1',
    };

    // Varias notificaciones se disparan sin esperarlas (fire-and-forget) para no bloquear
    // la respuesta HTTP. Este helper deja correr la cola de microtareas antes de las
    // aserciones.
    const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

    beforeEach(async () => {
        mockActuacionRepo = {
            create: jest.fn((data) => data),
            save: jest.fn((data) => Promise.resolve({ id: 'actuacion-1', ...data })),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
        };
        mockExpedienteService = {
            findOne: jest.fn().mockResolvedValue(expedienteBase),
            findOneByRadicado: jest.fn(),
            updateExpediente: jest.fn(),
        };
        mockTerminosService = { createAutomatico: jest.fn() };
        mockConfigService = {
            getEstadosForExpediente: jest.fn().mockResolvedValue([]),
            findEstado: jest.fn(),
            findEstadoIndex: jest.fn().mockReturnValue(-1),
        };
        mockNotificationClient = {
            notifyUserById: jest.fn(),
            notifyByRole: jest.fn(),
            notifyByRoles: jest.fn(),
            sendEmail: jest.fn(),
            getUsersDetailsByRole: jest.fn().mockResolvedValue([]),
            getUserDetailsById: jest.fn().mockResolvedValue(null),
        };
        mockDocumentoRepo = { find: jest.fn().mockResolvedValue([]) };
        mockDataSource = {
            query: jest.fn().mockResolvedValue([]),
            getRepository: jest.fn().mockReturnValue(mockDocumentoRepo),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActuacionService,
                { provide: getRepositoryToken(Actuacion), useValue: mockActuacionRepo },
                { provide: ExpedienteService, useValue: mockExpedienteService },
                { provide: TerminosService, useValue: mockTerminosService },
                { provide: ConfigurationsService, useValue: mockConfigService },
                { provide: NotificationClientService, useValue: mockNotificationClient },
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<ActuacionService>(ActuacionService);
    });

    afterEach(() => jest.clearAllMocks());

    describe('registrarActuacion()', () => {
        it('debe notificar (in-app + correo) al responsable asignado cuando se registra con responsableId', async () => {
            mockDataSource.query.mockResolvedValue([{ id_user: 'resp-1', email: 'resp@esap.edu.co', fullName: 'Responsable Uno' }]);

            await service.registrarActuacion('expediente-1', {
                tipoActuacion: 'Memorial',
                descripcion: 'Test',
                responsableId: 'resp-1',
            } as any);
            await flushPromises();

            expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
                'resp-1',
                expect.objectContaining({ tipo_notificacion: 'ACTUACION_ASIGNADA' }),
            );
            expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
                'resp@esap.edu.co',
                expect.any(String),
                expect.any(String),
            );
        });

        it('no debe notificar a nadie si la actuación no trae responsableId', async () => {
            await service.registrarActuacion('expediente-1', {
                tipoActuacion: 'Memorial',
                descripcion: 'Test',
            } as any);
            await flushPromises();

            expect(mockNotificationClient.notifyUserById).not.toHaveBeenCalled();
        });
    });

    describe('finalizarAutorizacion() (vía autorizarPorDocumentosFirmados)', () => {
        it('debe notificar al abogado sustanciador (in-app + correo) y al secretariado por rol al firmar', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-2',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { documentosAsociados: ['doc-1'] },
            });
            mockDocumentoRepo.find.mockResolvedValue([documentoFirmado()]);
            mockDataSource.query.mockResolvedValue([{ id_user: 'abogado-1', email: 'abogado@esap.edu.co', fullName: 'Abogado Uno' }]);

            await service.autorizarPorDocumentosFirmados('actuacion-2', 'firmante@esap.edu.co', 'Firmante');

            expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
                'abogado-1',
                expect.objectContaining({ tipo_notificacion: 'ACTUACION_AUTORIZADA' }),
            );
            expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
                'abogado@esap.edu.co',
                expect.any(String),
                expect.any(String),
            );
            expect(mockNotificationClient.notifyByRoles).toHaveBeenCalledWith(
                ['SECRETARIADO_GESTION_LEGAL'],
                expect.objectContaining({ tipo_notificacion: 'ACTUACION_AUTORIZADA' }),
                expect.objectContaining({ subject: expect.any(String), html: expect.any(String) }),
            );
        });

        it('debe notificar al secretariado incluso si el expediente no tiene abogado sustanciador asignado', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-2b',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { documentosAsociados: ['doc-1'] },
            });
            mockDocumentoRepo.find.mockResolvedValue([documentoFirmado()]);
            mockExpedienteService.findOne.mockResolvedValue({ ...expedienteBase, abogadoSustanciador: null });

            await service.autorizarPorDocumentosFirmados('actuacion-2b', 'firmante@esap.edu.co', 'Firmante');

            expect(mockNotificationClient.notifyUserById).not.toHaveBeenCalled();
            expect(mockNotificationClient.notifyByRoles).toHaveBeenCalledWith(
                ['SECRETARIADO_GESTION_LEGAL'],
                expect.objectContaining({ tipo_notificacion: 'ACTUACION_AUTORIZADA' }),
                expect.any(Object),
            );
        });
    });

    // BUG 1461: en QA, un usuario con el rol configurado como aprobador entró a la pestaña
    // de Actuaciones y la actuación se autorizó sola (avanzando de etapa) sin firma ni token
    // de ningún tipo, porque una actuación SIN documentos asociados pasaba la validación de
    // "documentos firmados" por vacuidad (.every() sobre un array vacío es true). Estos casos
    // cubren la corrección: revalidación de rol/usuario en el servidor y exigencia de al
    // menos un documento firmable realmente firmado.
    describe('autorizarPorDocumentosFirmados() - validaciones de seguridad (BUG 1461)', () => {
        it('rechaza autorizar una actuación sin documentos asociados, aunque el llamante tenga el rol configurado', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-sin-docs',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            });

            await expect(
                service.autorizarPorDocumentosFirmados('actuacion-sin-docs', 'jefe@esap.edu.co', 'Jefe', ['JEFE_GESTION_LEGAL'], 'jefe-1'),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(mockActuacionRepo.save).not.toHaveBeenCalled();
            expect(mockNotificationClient.notifyUserById).not.toHaveBeenCalled();
        });

        it('rechaza autorizar cuando los documentos asociados no requieren firma (p. ej. Excel)', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-doc-no-firmable',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { documentosAsociados: ['doc-1'], aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            });
            mockDocumentoRepo.find.mockResolvedValue([{ id: 'doc-1', nombre: 'anexo.xlsx', descripcion: null }]);

            await expect(
                service.autorizarPorDocumentosFirmados('actuacion-doc-no-firmable', 'jefe@esap.edu.co', 'Jefe', ['JEFE_GESTION_LEGAL']),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(mockActuacionRepo.save).not.toHaveBeenCalled();
        });

        it('rechaza autorizar cuando el documento firmable asociado aún no está firmado', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-doc-sin-firmar',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { documentosAsociados: ['doc-1'], aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            });
            mockDocumentoRepo.find.mockResolvedValue([{ id: 'doc-1', nombre: 'contrato.pdf', descripcion: null }]);

            await expect(
                service.autorizarPorDocumentosFirmados('actuacion-doc-sin-firmar', 'jefe@esap.edu.co', 'Jefe', ['JEFE_GESTION_LEGAL']),
            ).rejects.toBeInstanceOf(BadRequestException);

            expect(mockActuacionRepo.save).not.toHaveBeenCalled();
        });

        it('rechaza (Forbidden) cuando el rol del llamante no coincide con el rol configurado como aprobador', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-rol-incorrecto',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { documentosAsociados: ['doc-1'], aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            });
            mockDocumentoRepo.find.mockResolvedValue([documentoFirmado()]);

            await expect(
                service.autorizarPorDocumentosFirmados('actuacion-rol-incorrecto', 'otro@esap.edu.co', 'Otro', ['RESUELVE_GESTION_LEGAL'], 'user-2'),
            ).rejects.toBeInstanceOf(ForbiddenException);

            expect(mockActuacionRepo.save).not.toHaveBeenCalled();
        });

        it('rechaza (Forbidden) cuando la etapa exige un usuario aprobador específico y el llamante es otro', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-usuario-incorrecto',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { documentosAsociados: ['doc-1'], aprobacionTipo: 'usuario', aprobacionUsuario: 'usuario-aprobador' },
            });
            mockDocumentoRepo.find.mockResolvedValue([documentoFirmado()]);

            await expect(
                service.autorizarPorDocumentosFirmados('actuacion-usuario-incorrecto', 'otro@esap.edu.co', 'Otro', [], 'otro-usuario-id'),
            ).rejects.toBeInstanceOf(ForbiddenException);

            expect(mockActuacionRepo.save).not.toHaveBeenCalled();
        });

        it('autoriza cuando el rol del llamante coincide con el rol configurado y los documentos están firmados', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-rol-correcto',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { documentosAsociados: ['doc-1'], aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            });
            mockDocumentoRepo.find.mockResolvedValue([documentoFirmado()]);

            const resultado = await service.autorizarPorDocumentosFirmados(
                'actuacion-rol-correcto', 'jefe@esap.edu.co', 'Jefe', ['JEFE_GESTION_LEGAL'], 'jefe-1',
            );

            expect(resultado.metadata.estadoAutorizacion).toBe('AUTORIZADO');
            expect(mockActuacionRepo.save).toHaveBeenCalled();
        });

        it('un SUPER_ADMIN puede autorizar sin cumplir el rol configurado, siempre que los documentos estén firmados', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-superadmin',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { documentosAsociados: ['doc-1'], aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            });
            mockDocumentoRepo.find.mockResolvedValue([documentoFirmado()]);

            const resultado = await service.autorizarPorDocumentosFirmados(
                'actuacion-superadmin', 'admin@esap.edu.co', 'Admin', ['SUPER_ADMIN'], 'admin-1',
            );

            expect(resultado.metadata.estadoAutorizacion).toBe('AUTORIZADO');
        });

        it('es idempotente: si ya estaba AUTORIZADO, no vuelve a validar ni a guardar', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-ya-autorizada',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: { estadoAutorizacion: 'AUTORIZADO', aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' },
            });

            const resultado = await service.autorizarPorDocumentosFirmados(
                'actuacion-ya-autorizada', 'cualquiera@esap.edu.co', 'Cualquiera', [], undefined,
            );

            expect(resultado.metadata.estadoAutorizacion).toBe('AUTORIZADO');
            expect(mockActuacionRepo.save).not.toHaveBeenCalled();
            expect(mockDocumentoRepo.find).not.toHaveBeenCalled();
        });
    });

    describe('devolverActuacion()', () => {
        it('debe notificar (in-app + correo) al abogado sustanciador al devolver la actuación', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-3',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: {},
            });
            mockDataSource.query.mockResolvedValue([{ id_user: 'abogado-1', email: 'abogado@esap.edu.co', fullName: 'Abogado Uno' }]);

            await service.devolverActuacion('actuacion-3', 'Falta firma', 'jefe@esap.edu.co', 'Jefe');

            expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
                'abogado-1',
                expect.objectContaining({ tipo_notificacion: 'ACTUACION_DEVUELTA' }),
            );
            expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
                'abogado@esap.edu.co',
                expect.any(String),
                expect.any(String),
            );
        });

        it('debe notificar (in-app + correo) al aprobador por rol de la etapa anterior cuando esta lo requiere', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-4',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: {},
            });
            mockDataSource.query.mockResolvedValue([{ id_user: 'abogado-1', email: 'abogado@esap.edu.co', fullName: 'Abogado Uno' }]);

            const estadoAnterior = { id: 'etapa-1', nombre: 'Revisión', orden: 1, activo: true, aprobacionTipo: 'rol', aprobacionRol: 'JEFE_GESTION_LEGAL' };
            const estadoActual = { id: 'etapa-2', nombre: 'Firma', orden: 2, activo: true };
            mockConfigService.getEstadosForExpediente.mockResolvedValue([estadoAnterior, estadoActual]);
            mockConfigService.findEstadoIndex.mockReturnValue(1);

            await service.devolverActuacion('actuacion-4', 'Falta firma', 'jefe@esap.edu.co', 'Jefe');

            expect(mockNotificationClient.notifyByRoles).toHaveBeenCalledWith(
                ['JEFE_GESTION_LEGAL'],
                expect.objectContaining({ tipo_notificacion: 'EXPEDIENTE_DEVUELTO_ETAPA' }),
                expect.objectContaining({ subject: expect.any(String), html: expect.any(String) }),
            );
        });

        it('debe notificar (in-app + correo) al aprobador por usuario de la etapa anterior cuando esta lo requiere', async () => {
            mockActuacionRepo.findOne.mockResolvedValue({
                id: 'actuacion-5',
                expedienteId: 'expediente-1',
                tipoActuacion: 'Auto',
                metadata: {},
            });
            mockDataSource.query.mockResolvedValue([{ id_user: 'usuario-aprobador', email: 'aprobador@esap.edu.co', fullName: 'Aprobador Uno' }]);

            const estadoAnterior = { id: 'etapa-1', nombre: 'Revisión', orden: 1, activo: true, aprobacionTipo: 'usuario', aprobacionUsuario: 'usuario-aprobador' };
            const estadoActual = { id: 'etapa-2', nombre: 'Firma', orden: 2, activo: true };
            mockConfigService.getEstadosForExpediente.mockResolvedValue([estadoAnterior, estadoActual]);
            mockConfigService.findEstadoIndex.mockReturnValue(1);

            await service.devolverActuacion('actuacion-5', 'Falta firma', 'jefe@esap.edu.co', 'Jefe');

            expect(mockNotificationClient.notifyUserById).toHaveBeenCalledWith(
                'usuario-aprobador',
                expect.objectContaining({ tipo_notificacion: 'EXPEDIENTE_DEVUELTO_ETAPA' }),
            );
            expect(mockNotificationClient.sendEmail).toHaveBeenCalledWith(
                'aprobador@esap.edu.co',
                expect.stringContaining('Revisión'),
                expect.any(String),
            );
        });
    });
});
