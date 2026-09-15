import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TravelExpensesController } from '../travel-expenses.controller';
import { TravelExpensesService } from '../travel-expenses.service';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { ConfigService } from '../../config/config.service';
import { NotificationClientService } from '../../../common/notification-client.service';
import { LiquidationService } from '../../liquidation/liquidation.service';
import { TicketsService } from '../../tickets/tickets.service';

describe('RF-AUT-002 — Etapa 6: Autorizar Comisiones Extemporáneas (Dirección Nacional)', () => {
  let controller: TravelExpensesController;
  let service: TravelExpensesService;

  const mockService = {
    obtenerBandejaDireccionNacional: jest.fn(),
    autorizarComisionExtemporanea: jest.fn(),
    rechazarComisionExtemporanea: jest.fn(),
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

  describe('Controlador: Endpoints de Dirección Nacional', () => {
    describe('GET requests/extemporaneous-authorization/inbox', () => {
      it('debe retornar la bandeja de comisiones extemporáneas paginada', async () => {
        const mockResponse = {
          data: [
            {
              id: 'sol-ext-001',
              consecutivoUnico: 'COM-2026-EXT-001',
              extemporanea: true,
              estadoSolicitud: EstadoSolicitud.AUTORIZACION_DIRECCION,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        };

        mockService.obtenerBandejaDireccionNacional.mockResolvedValue(mockResponse);

        const result = await controller.obtenerBandejaDireccionNacional('1', '20', 'COM-2026', 'AUTORIZACION_DIRECCION');

        expect(service.obtenerBandejaDireccionNacional).toHaveBeenCalledWith(
          1,
          20,
          'COM-2026',
          'AUTORIZACION_DIRECCION',
        );
        expect(result).toEqual({
          success: true,
          ...mockResponse,
          timestamp: expect.any(String),
        });
      });
    });

    describe('POST requests/:id/authorize-extemporaneous', () => {
      it('debe autorizar la comisión extemporánea y enrutarla a Subdirección (EN_AUTORIZACION)', async () => {
        const mockResult = {
          id: 'sol-ext-001',
          estadoSolicitud: EstadoSolicitud.EN_AUTORIZACION,
          extemporanea: true,
          autorizadorDireccionId: 'dir-nac-001',
          decisionDireccion: 'AUTORIZADA',
          justificacionDireccion: 'Se autoriza por estricta necesidad territorial',
          esDelegadoDireccion: true,
        };

        mockService.autorizarComisionExtemporanea.mockResolvedValue(mockResult);

        const result = await controller.autorizarComisionExtemporanea(
          'sol-ext-001',
          {
            justificacion: 'Se autoriza por estricta necesidad territorial',
            esDelegado: true,
          },
          {
            user: {
              userId: 'dir-nac-001',
              roles: ['DIRECCION_NACIONAL'],
            },
          } as any,
        );

        expect(service.autorizarComisionExtemporanea).toHaveBeenCalledWith(
          'sol-ext-001',
          'dir-nac-001',
          ['DIRECCION_NACIONAL'],
          {
            justificacion: 'Se autoriza por estricta necesidad territorial',
            esDelegado: true,
          },
        );
        expect(result).toEqual({
          success: true,
          data: mockResult,
          message: expect.stringContaining('Comisión extemporánea autorizada exitosamente'),
          timestamp: expect.any(String),
        });
      });

      it('debe lanzar BadRequestException si no hay usuario autenticado', async () => {
        await expect(
          controller.autorizarComisionExtemporanea('sol-ext-001', {}, {} as any),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('POST requests/:id/reject-extemporaneous', () => {
      it('debe rechazar la comisión extemporánea con justificación registrada', async () => {
        const mockResult = {
          id: 'sol-ext-001',
          estadoSolicitud: EstadoSolicitud.RECHAZADO,
          extemporanea: true,
          autorizadorDireccionId: 'dir-nac-001',
          decisionDireccion: 'RECHAZADA',
          justificacionDireccion: 'No se acredita caso fortuito o fuerza mayor para radicación tardía.',
          motivoDevolucion: 'No se acredita caso fortuito o fuerza mayor para radicación tardía.',
        };

        mockService.rechazarComisionExtemporanea.mockResolvedValue(mockResult);

        const result = await controller.rechazarComisionExtemporanea(
          'sol-ext-001',
          {
            justificacion: 'No se acredita caso fortuito o fuerza mayor para radicación tardía.',
          },
          {
            user: {
              userId: 'dir-nac-001',
              roles: ['DIRECCION_NACIONAL'],
            },
          } as any,
        );

        expect(service.rechazarComisionExtemporanea).toHaveBeenCalledWith(
          'sol-ext-001',
          'dir-nac-001',
          ['DIRECCION_NACIONAL'],
          {
            justificacion: 'No se acredita caso fortuito o fuerza mayor para radicación tardía.',
          },
        );
        expect(result).toEqual({
          success: true,
          data: mockResult,
          message: expect.stringContaining('Comisión extemporánea rechazada'),
          timestamp: expect.any(String),
        });
      });

      it('debe lanzar BadRequestException si no hay usuario autenticado', async () => {
        await expect(
          controller.rechazarComisionExtemporanea(
            'sol-ext-001',
            { justificacion: 'Motivo de rechazo' },
            {} as any,
          ),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Servicio: Reglas de Negocio y Criterios de Aceptación (Gherkin)', () => {
    let serviceInstance: TravelExpensesService;
    let repoMock: any;
    let dataSourceMock: any;
    let notificationClientMock: any;

    beforeEach(async () => {
      repoMock = {
        find: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(),
        save: jest.fn(),
      };

      dataSourceMock = {
        transaction: jest.fn(),
        query: jest.fn(),
      };

      notificationClientMock = {
        send: jest.fn().mockResolvedValue(true),
        sendToRole: jest.fn().mockResolvedValue(true),
        sendEmail: jest.fn().mockResolvedValue(true),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TravelExpensesService,
          {
            provide: getRepositoryToken(SolicitudComisionEntity),
            useValue: repoMock,
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
            useValue: {},
          },
          {
            provide: getDataSourceToken(),
            useValue: dataSourceMock,
          },
          {
            provide: ConfigService,
            useValue: {},
          },
          {
            provide: NotificationClientService,
            useValue: notificationClientMock,
          },
          {
            provide: LiquidationService,
            useValue: {},
          },
          {
            provide: TicketsService,
            useValue: {},
          },
        ],
      }).compile();

      serviceInstance = module.get<TravelExpensesService>(TravelExpensesService);
    });

    it('Criterio 1: debe enrutar solicitudes extemporáneas en VERIFICADA a AUTORIZACION_DIRECCION', async () => {
      const mockExtemporanea = {
        id: 'sol-ext-1',
        consecutivoUnico: 'COM-2026-001',
        extemporanea: true,
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
        revisorControlId: 'rev-01',
      };

      repoMock.find.mockResolvedValue([mockExtemporanea]);

      const managerMock = {
        getRepository: jest.fn().mockReturnValue({
          save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
        }),
      };

      dataSourceMock.transaction.mockImplementation(async (cb: any) => {
        return cb(managerMock);
      });

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockExtemporanea]),
        getCount: jest.fn().mockResolvedValue(1),
      };
      repoMock.createQueryBuilder.mockReturnValue(qbMock);

      const res = await serviceInstance.obtenerBandejaDireccionNacional(1, 20);

      expect(mockExtemporanea.estadoSolicitud).toBe(EstadoSolicitud.AUTORIZACION_DIRECCION);
      expect(res.total).toBe(1);
    });

    it('Criterio 2: cuando Dirección Nacional autoriza, continúa al flujo corporativo ordinario (EN_AUTORIZACION)', async () => {
      const mockSolicitud = {
        id: 'sol-ext-2',
        consecutivoUnico: 'COM-2026-002',
        extemporanea: true,
        estadoSolicitud: EstadoSolicitud.AUTORIZACION_DIRECCION,
        comisionadoId: 'pasajero-1',
        creadoPorUsuarioId: 'enlace-1',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitud),
      };

      const managerMock = {
        getRepository: jest.fn().mockImplementation((entity) => ({
          createQueryBuilder: () => qbMock,
          save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
        })),
      };

      dataSourceMock.transaction.mockImplementation(async (cb: any) => {
        return cb(managerMock);
      });

      const res = await serviceInstance.autorizarComisionExtemporanea(
        'sol-ext-2',
        'dir-nac-10',
        ['DIRECCION_NACIONAL'],
        {
          justificacion: 'Se avala la pertinencia institucional',
          esDelegado: true,
        },
      );

      expect(res.estadoSolicitud).toBe(EstadoSolicitud.EN_AUTORIZACION);
      expect(res.decisionDireccion).toBe('AUTORIZADA');
      expect(res.autorizadorDireccionId).toBe('dir-nac-10');
      expect(res.esDelegadoDireccion).toBe(true);
    });

    it('Criterio 3: cuando Dirección Nacional niega, se rechaza con justificación registrada (RECHAZADO)', async () => {
      const mockSolicitud = {
        id: 'sol-ext-3',
        consecutivoUnico: 'COM-2026-003',
        extemporanea: true,
        estadoSolicitud: EstadoSolicitud.AUTORIZACION_DIRECCION,
        comisionadoId: 'pasajero-1',
        creadoPorUsuarioId: 'enlace-1',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitud),
      };

      const managerMock = {
        getRepository: jest.fn().mockImplementation((entity) => ({
          createQueryBuilder: () => qbMock,
          save: jest.fn().mockImplementation((val) => Promise.resolve(val)),
        })),
      };

      dataSourceMock.transaction.mockImplementation(async (cb: any) => {
        return cb(managerMock);
      });

      const res = await serviceInstance.rechazarComisionExtemporanea(
        'sol-ext-3',
        'dir-nac-10',
        ['DIRECCION_NACIONAL'],
        {
          justificacion: 'No cumple justificación de fuerza mayor',
          esDelegado: false,
        },
      );

      expect(res.estadoSolicitud).toBe(EstadoSolicitud.RECHAZADO);
      expect(res.decisionDireccion).toBe('RECHAZADA');
      expect(res.motivoDevolucion).toBe('No cumple justificación de fuerza mayor');
      expect(res.justificacionDireccion).toBe('No cumple justificación de fuerza mayor');
    });

    it('SoD: debe lanzar ForbiddenException si el autorizador es el comisionado', async () => {
      const mockSolicitud = {
        id: 'sol-ext-4',
        extemporanea: true,
        estadoSolicitud: EstadoSolicitud.AUTORIZACION_DIRECCION,
        comisionadoId: 'usuario-mismo',
        creadoPorUsuarioId: 'otro-enlace',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitud),
      };

      const managerMock = {
        getRepository: jest.fn().mockImplementation(() => ({
          createQueryBuilder: () => qbMock,
        })),
      };

      dataSourceMock.transaction.mockImplementation(async (cb: any) => {
        return cb(managerMock);
      });

      await expect(
        serviceInstance.autorizarComisionExtemporanea(
          'sol-ext-4',
          'usuario-mismo',
          ['DIRECCION_NACIONAL'],
          { justificacion: 'Auto aval' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar BadRequestException si la comisión no es extemporánea', async () => {
      const mockSolicitud = {
        id: 'sol-regular',
        extemporanea: false,
        estadoSolicitud: EstadoSolicitud.AUTORIZACION_DIRECCION,
        comisionadoId: 'pasajero-1',
        creadoPorUsuarioId: 'enlace-1',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitud),
      };

      const managerMock = {
        getRepository: jest.fn().mockImplementation(() => ({
          createQueryBuilder: () => qbMock,
        })),
      };

      dataSourceMock.transaction.mockImplementation(async (cb: any) => {
        return cb(managerMock);
      });

      await expect(
        serviceInstance.autorizarComisionExtemporanea(
          'sol-regular',
          'dir-10',
          ['DIRECCION_NACIONAL'],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si la justificación de rechazo tiene menos de 5 caracteres', async () => {
      await expect(
        serviceInstance.rechazarComisionExtemporanea(
          'sol-1',
          'dir-10',
          ['DIRECCION_NACIONAL'],
          { justificacion: 'No' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Subdirección NO puede autorizar una comisión extemporánea sin visto bueno previo de Dirección Nacional', async () => {
      const mockSolicitudExtemporanea = {
        id: 'sol-ext-sin-aval',
        extemporanea: true,
        estadoSolicitud: EstadoSolicitud.EN_AUTORIZACION,
        decisionDireccion: null,
        autorizadorDireccionId: null,
        fechaAutorizacionDireccion: null,
        comisionadoId: 'pasajero-1',
        creadoPorUsuarioId: 'enlace-1',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitudExtemporanea),
      };

      const managerMock = {
        getRepository: jest.fn().mockImplementation(() => ({
          createQueryBuilder: () => qbMock,
        })),
      };

      dataSourceMock.transaction.mockImplementation(async (cb: any) => {
        return cb(managerMock);
      });

      await expect(
        serviceInstance.autorizarComision(
          'sol-ext-sin-aval',
          'subdirector-1',
          ['SUBDIRECCION_GESTION_CORPORATIVA'],
          { observaciones: 'Visto bueno' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Subdirección NO puede devolver una comisión extemporánea si no ha sido aprobada por Dirección Nacional', async () => {
      const mockSolicitudExtemporanea = {
        id: 'sol-ext-sin-aval-2',
        extemporanea: true,
        estadoSolicitud: EstadoSolicitud.EN_AUTORIZACION,
        decisionDireccion: null,
        autorizadorDireccionId: null,
        comisionadoId: 'pasajero-1',
        creadoPorUsuarioId: 'enlace-1',
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSolicitudExtemporanea),
      };

      const managerMock = {
        getRepository: jest.fn().mockImplementation(() => ({
          createQueryBuilder: () => qbMock,
        })),
      };

      dataSourceMock.transaction.mockImplementation(async (cb: any) => {
        return cb(managerMock);
      });

      await expect(
        serviceInstance.devolverComisionAutorizacion(
          'sol-ext-sin-aval-2',
          'subdirector-1',
          ['SUBDIRECCION_GESTION_CORPORATIVA'],
          'Faltan documentos',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
