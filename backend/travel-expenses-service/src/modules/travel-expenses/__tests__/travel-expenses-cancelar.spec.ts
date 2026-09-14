import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TravelExpensesController } from '../travel-expenses.controller';
import { TravelExpensesService } from '../travel-expenses.service';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { ConfigService } from '../../config/config.service';
import { NotificationClientService } from '../../../common/notification-client.service';
import { LiquidationService } from '../../liquidation/liquidation.service';
import { TicketsService } from '../../tickets/tickets.service';
import { CancelarComisionDto } from '../../../dto/cancelar-comision.dto';

describe('RF-AUT-003 — Etapa 6: Cancelar Comisión con Trazabilidad (CANCELADA)', () => {
  let controller: TravelExpensesController;
  let service: TravelExpensesService;

  const mockService = {
    cancelarComision: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelExpensesController],
      providers: [
        {
          provide: TravelExpensesService,
          useValue: mockService,
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TravelExpensesController>(TravelExpensesController);
    service = module.get<TravelExpensesService>(TravelExpensesService);
    jest.clearAllMocks();
  });

  describe('Controlador: Endpoint POST requests/:id/cancel', () => {
    it('debe registrar la cancelación y retornar respuesta exitosa con trazabilidad', async () => {
      const mockResult = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-001',
        estadoSolicitud: EstadoSolicitud.CANCELADA,
        motivoCancelacion: 'Postergación del evento académico territorial',
        responsableCancelacion: 'Subdirección Académica',
        fechaCancelacion: new Date(),
        pendienteReintegro: false,
      };

      mockService.cancelarComision.mockResolvedValue(mockResult);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Postergación del evento académico territorial',
        responsableCancelacion: 'Subdirección Académica',
      };

      const req: any = {
        user: {
          userId: 'user-enlace-01',
          roles: ['ENLACE_DEPENDENCIA'],
        },
      };

      const response = await controller.cancelarComision('sol-001', dto, req);

      expect(mockService.cancelarComision).toHaveBeenCalledWith(
        'sol-001',
        'user-enlace-01',
        ['ENLACE_DEPENDENCIA'],
        dto,
      );
      expect(response.success).toBe(true);
      expect(response.data.estadoSolicitud).toBe(EstadoSolicitud.CANCELADA);
      expect(response.message).toContain('Comisión cancelada exitosamente');
    });

    it('debe lanzar BadRequestException si el usuario no está autenticado', async () => {
      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Cancelación solicitada',
      };
      const req: any = {};

      await expect(controller.cancelarComision('sol-001', dto, req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Servicio: Reglas de Negocio y Criterios de Aceptación (Gherkin)', () => {
    let serviceInstance: TravelExpensesService;
    let mockDataSource: any;
    let mockManager: any;
    let mockNotificationClient: any;
    let mockSolicitudRepo: any;
    let mockHistorialRepo: any;
    let mockTicketsService: any;

    beforeEach(async () => {
      mockSolicitudRepo = {
        createQueryBuilder: jest.fn(),
        save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
        findOne: jest.fn(),
      };

      mockHistorialRepo = {
        save: jest.fn().mockImplementation((hist) => Promise.resolve(hist)),
      };

      mockTicketsService = {
        liberarSaldo: jest.fn().mockResolvedValue({}),
      };

      mockManager = {
        getRepository: jest.fn().mockImplementation((entity) => {
          if (entity === SolicitudComisionEntity) return mockSolicitudRepo;
          if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
          return {};
        }),
      };

      mockDataSource = {
        transaction: jest.fn().mockImplementation(async (callback) => {
          return await callback(mockManager);
        }),
      };

      mockNotificationClient = {
        send: jest.fn().mockResolvedValue({}),
        notifyByRole: jest.fn().mockResolvedValue({}),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TravelExpensesService,
          {
            provide: getRepositoryToken(SolicitudComisionEntity),
            useValue: mockSolicitudRepo,
          },
          {
            provide: getRepositoryToken(ComisionadoEntity),
            useValue: {},
          },
          {
            provide: getRepositoryToken(DocumentoSoporteEntity),
            useValue: {},
          },
          {
            provide: getRepositoryToken(SolicitudHistorialEstadoEntity),
            useValue: mockHistorialRepo,
          },
          {
            provide: getDataSourceToken(),
            useValue: mockDataSource,
          },
          {
            provide: ConfigService,
            useValue: {},
          },
          {
            provide: NotificationClientService,
            useValue: mockNotificationClient,
          },
          {
            provide: LiquidationService,
            useValue: {},
          },
          {
            provide: TicketsService,
            useValue: mockTicketsService,
          },
        ],
      }).compile();

      serviceInstance = module.get<TravelExpensesService>(TravelExpensesService);
    });

    it('Criterio 1 & 2: Permite registrar cancelación con motivo y responsable, pasa a CANCELADA, libera cupo de tiquetes y genera historial', async () => {
      const solicitudExistente: any = {
        id: 'sol-curso-1',
        consecutivoUnico: 'COM-2026-042',
        estadoSolicitud: EstadoSolicitud.EN_VERIFICACION,
        siifExportado: false,
        creadoPorUsuarioId: 'user-enlace-99',
        requiereTiquetes: true,
        costoEstimadoTiquete: 850000,
        idDependencia: 3,
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudExistente),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Comisión suspendida por contingencia climática en destino',
        responsableCancelacion: 'Dirección Territorial Antioquia',
      };

      const result = await serviceInstance.cancelarComision(
        'sol-curso-1',
        'user-analista-01',
        ['ANALISTA_VIATICOS'],
        dto,
      );

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.CANCELADA);
      expect(result.motivoCancelacion).toBe(dto.motivoCancelacion);
      expect(result.responsableCancelacion).toBe('Dirección Territorial Antioquia');
      expect(result.canceladoPorUsuarioId).toBe('user-analista-01');
      expect(result.pendienteReintegro).toBe(false);

      // Verificación de liberación de saldo de tiquetes presupuestal
      expect(mockTicketsService.liberarSaldo).toHaveBeenCalledWith({
        dependenciaId: '3',
        solicitudId: 'sol-curso-1',
        montoEstimadoTiquete: 850000,
      });

      // Verificación de trazabilidad append-only en historial
      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-curso-1',
          estadoAnterior: EstadoSolicitud.EN_VERIFICACION,
          estadoNuevo: EstadoSolicitud.CANCELADA,
          usuarioId: 'user-analista-01',
          comentarios: expect.stringContaining(
            'Cancelada por Dirección Territorial Antioquia: Comisión suspendida',
          ),
        }),
      );

      // Verificación de notificación al creador
      expect(mockNotificationClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          id_usuario_destinatario: 'user-enlace-99',
          tipo_notificacion: 'VIATICOS_COMISION_CANCELADA',
        }),
      );
    });

    it('Criterio 3: Con recursos ya comprometidos (siifExportado=true), marca pendiente de reintegro (Etapa 8)', async () => {
      const solicitudConSIIF: any = {
        id: 'sol-siif-1',
        consecutivoUnico: 'COM-2026-SIIF-01',
        estadoSolicitud: EstadoSolicitud.SOLICITADA_SIIF,
        siifExportado: true,
        creadoPorUsuarioId: 'user-enlace-88',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudConSIIF),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Cancelación posterior al trámite presupuestal de CDP',
        responsableCancelacion: 'Grupo de Viáticos',
      };

      const result = await serviceInstance.cancelarComision(
        'sol-siif-1',
        'user-control-01',
        ['CONTROL_VIATICOS'],
        dto,
      );

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.CANCELADA);
      expect(result.pendienteReintegro).toBe(true);

      // Verificación de que el historial refleja la necesidad de reintegro en Etapa 8 / RF-PAG-004
      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          comentarios: expect.stringContaining(
            '[RECURSOS COMPROMETIDOS: Requiere reintegro / liberación presupuestal en SIIF Nación - Etapa 8 / RF-PAG-004]',
          ),
        }),
      );

      // Verificación de alerta a Tesorería, Presupuesto y Control de Viáticos para gestión de reintegro y anulación RP
      expect(mockNotificationClient.notifyByRole).toHaveBeenCalledWith(
        'TESORERIA',
        expect.objectContaining({
          tipo_notificacion: 'VIATICOS_REINTEGRO_LIBERACION_RECURSOS',
          datos_adicionales: expect.objectContaining({
            pendienteReintegro: true,
            novedad: 'RF-PAG-004',
          }),
        }),
      );
      expect(mockNotificationClient.notifyByRole).toHaveBeenCalledWith(
        'PRESUPUESTO',
        expect.objectContaining({
          tipo_notificacion: 'VIATICOS_REINTEGRO_LIBERACION_RECURSOS',
        }),
      );
      expect(mockNotificationClient.notifyByRole).toHaveBeenCalledWith(
        'CONTROL_VIATICOS',
        expect.objectContaining({
          tipo_notificacion: 'VIATICOS_REINTEGRO_LIBERACION_RECURSOS',
        }),
      );
    });

    it('Criterio 3: Con tiquetes comprados o estado avanzado, marca automáticamente pendienteReintegro=true', async () => {
      const solicitudTiquetes: any = {
        id: 'sol-tiq-1',
        consecutivoUnico: 'COM-2026-TIQ-01',
        estadoSolicitud: EstadoSolicitud.TIQUETES_COMPRADOS,
        siifExportado: false,
        creadoPorUsuarioId: 'user-enlace-77',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudTiquetes),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Comisionado presentó incapacidad médica de urgencia',
      };

      const result = await serviceInstance.cancelarComision(
        'sol-tiq-1',
        'user-admin-01',
        ['ADMINISTRADOR_SISTEMA'],
        dto,
      );

      expect(result.pendienteReintegro).toBe(true);
    });

    it('Criterio 3: Si dto.recursosComprometidos es true explícito, marca pendienteReintegro=true aunque esté en etapa temprana', async () => {
      const solicitudTemprana: any = {
        id: 'sol-temp-1',
        consecutivoUnico: 'COM-2026-TEMP-01',
        estadoSolicitud: EstadoSolicitud.RADICADA,
        siifExportado: false,
        creadoPorUsuarioId: 'user-enlace-66',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudTemprana),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Cancelación con anticipo ya desembolsado por caja menor',
        recursosComprometidos: true,
      };

      const result = await serviceInstance.cancelarComision(
        'sol-temp-1',
        'user-enlace-66',
        ['ENLACE_DEPENDENCIA'],
        dto,
      );

      expect(result.pendienteReintegro).toBe(true);
    });

    it('debe rechazar la cancelación si la comisión ya está en estado LEGALIZADO', async () => {
      const solicitudLegalizada: any = {
        id: 'sol-leg-1',
        consecutivoUnico: 'COM-2026-LEG-01',
        estadoSolicitud: EstadoSolicitud.LEGALIZADO,
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudLegalizada),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Intento de cancelar una comisión ya legalizada',
      };

      await expect(
        serviceInstance.cancelarComision('sol-leg-1', 'user-01', [], dto),
      ).rejects.toThrow('No es posible cancelar una comisión que ya ha sido legalizada.');
    });

    it('debe rechazar si la comisión ya se encuentra en estado CANCELADA', async () => {
      const solicitudCancelada: any = {
        id: 'sol-canc-1',
        consecutivoUnico: 'COM-2026-CANC-01',
        estadoSolicitud: EstadoSolicitud.CANCELADA,
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudCancelada),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Intento de cancelar comisión ya cancelada previamente',
      };

      await expect(
        serviceInstance.cancelarComision('sol-canc-1', 'user-01', [], dto),
      ).rejects.toThrow('La comisión ya se encuentra cancelada.');
    });

    it('debe rechazar si el motivo de cancelación está vacío o tiene menos de 5 caracteres', async () => {
      const dto: CancelarComisionDto = {
        motivoCancelacion: 'abcd',
      };

      await expect(
        serviceInstance.cancelarComision('sol-01', 'user-01', [], dto),
      ).rejects.toThrow('El motivo de cancelación es obligatorio (mínimo 5 caracteres).');
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Motivo válido de cancelación de prueba',
      };

      await expect(
        serviceInstance.cancelarComision('sol-inexistente', 'user-01', [], dto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
