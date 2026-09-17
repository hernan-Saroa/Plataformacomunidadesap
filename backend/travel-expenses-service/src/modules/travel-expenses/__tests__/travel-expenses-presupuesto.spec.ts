import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { NotificationClientService } from '../../../common/notification-client.service';
import { ConfigService } from '../../config/config.service';
import { LiquidationService } from '../../liquidation/liquidation.service';
import { TicketsService } from '../../tickets/tickets.service';
import { TravelExpensesService } from '../travel-expenses.service';
import { TravelExpensesController } from '../travel-expenses.controller';
import { ExpedirRpDto } from '../../../dto/expedir-rp.dto';

describe('RF-PRE-001 — Etapa 7: Expedir RP en SIIF Nación (COMPROMETIDA)', () => {
  let controller: TravelExpensesController;
  let serviceMock: any;
  let serviceInstance: TravelExpensesService;

  let mockSolicitudRepo: any;
  let mockHistorialRepo: any;
  let mockNotificationClient: any;
  let mockDataSource: any;

  beforeEach(async () => {
    serviceMock = {
      enviarPaquetePresupuesto: jest.fn(),
      obtenerBandejaPresupuesto: jest.fn(),
      expedirRp: jest.fn(),
      cargaMasivaRp: jest.fn(),
    };

    mockSolicitudRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((s) => Promise.resolve({ ...s })),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockHistorialRepo = {
      save: jest.fn().mockResolvedValue({}),
    };

    mockNotificationClient = {
      send: jest.fn().mockResolvedValue({}),
      notifyByRole: jest.fn().mockResolvedValue({}),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
        return mockSolicitudRepo;
      }),
      transaction: jest.fn((cb) => cb({ getRepository: () => mockSolicitudRepo })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelExpensesController],
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
          useValue: {},
        },
      ],
    }).compile();

    serviceInstance = module.get<TravelExpensesService>(TravelExpensesService);
    controller = module.get<TravelExpensesController>(TravelExpensesController);
  });

  // ==========================================================================
  // 1. Pruebas de Controlador
  // ==========================================================================
  describe('Controlador: Endpoints Etapa 7 (Presupuesto y RP)', () => {
    it('POST requests/:id/send-to-budget debe enviar paquete y retornar éxito', async () => {
      jest.spyOn(serviceInstance, 'enviarPaquetePresupuesto').mockResolvedValue({
        id: 'sol-1',
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
      } as any);

      const req: any = { user: { userId: 'analista-1', roles: ['ANALISTA_VIATICOS'] } };
      const res = await controller.enviarPaquetePresupuesto('sol-1', { observaciones: 'Ok' }, req);

      expect(res.success).toBe(true);
      expect(res.message).toContain('enviado exitosamente a la bandeja del Grupo de Presupuesto');
      expect(serviceInstance.enviarPaquetePresupuesto).toHaveBeenCalledWith(
        'sol-1',
        'analista-1',
        ['ANALISTA_VIATICOS'],
        { observaciones: 'Ok' },
      );
    });

    it('GET requests/budget/inbox debe retornar la bandeja con KPIs', async () => {
      jest.spyOn(serviceInstance, 'obtenerBandejaPresupuesto').mockResolvedValue({
        data: [{ id: 'sol-1' }],
        total: 1,
        page: 1,
        limit: 20,
        kpis: { pendientesRp: 1, comprometidas: 0, totalComprometido: 0 },
      });

      const res = await controller.obtenerBandejaPresupuesto('1', '20', 'COM-2026', 'EN_PRESUPUESTO');

      expect(res.success).toBe(true);
      expect(res.total).toBe(1);
      expect(res.kpis.pendientesRp).toBe(1);
      expect(serviceInstance.obtenerBandejaPresupuesto).toHaveBeenCalledWith(1, 20, 'COM-2026', 'EN_PRESUPUESTO');
    });

    it('POST requests/:id/register-rp debe expedir RP individualmente', async () => {
      jest.spyOn(serviceInstance, 'expedirRp').mockResolvedValue({
        id: 'sol-1',
        estadoSolicitud: EstadoSolicitud.COMPROMETIDA,
        codigoRp: '2026-09-16_RP_12345',
      } as any);

      const req: any = { user: { userId: 'presupuesto-1', roles: ['PRESUPUESTO'] } };
      const dto: ExpedirRpDto = {
        numeroRp: '12345',
        fechaRp: '2026-09-16',
        valorComprometido: 1800000,
        rubro: 'C-2101-01',
      };

      const res = await controller.expedirRp('sol-1', dto, req);

      expect(res.success).toBe(true);
      expect(res.message).toContain('2026-09-16_RP_12345');
      expect(res.message).toContain('COMPROMETIDA');
    });

    it('POST requests/budget/batch-rp debe procesar carga masiva de RPs', async () => {
      jest.spyOn(serviceInstance, 'cargaMasivaRp').mockResolvedValue({
        total: 2,
        exitosos: 2,
        fallidos: 0,
        procesados: [],
        errores: [],
      });

      const req: any = { user: { userId: 'presupuesto-1', roles: ['PRESUPUESTO'] } };
      const dto = {
        items: [
          {
            consecutivoUnico: 'COM-2026-0001',
            numeroRp: '101',
            fechaRp: '2026-09-16',
            valorComprometido: 1000000,
            rubro: 'C-01',
          },
        ],
      };

      const res = await controller.cargaMasivaRp(dto as any, req);

      expect(res.success).toBe(true);
      expect(res.message).toContain('2 de 2 comisiones comprometidas con éxito');
    });

    it('debe lanzar BadRequestException si el usuario no está autenticado', async () => {
      const req: any = { user: null };
      await expect(controller.enviarPaquetePresupuesto('sol-1', {}, req)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.expedirRp('sol-1', {} as any, req)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.cargaMasivaRp({ items: [] }, req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==========================================================================
  // 2. Pruebas de Servicio — Criterios de Aceptación (Gherkin)
  // ==========================================================================
  describe('Servicio: Reglas de Negocio y Criterios Gherkin', () => {
    const solicitudAutorizadaBase = {
      id: 'sol-aut-1',
      consecutivoUnico: 'COM-2026-0042',
      estadoSolicitud: EstadoSolicitud.AUTORIZADA,
      creadoPorUsuarioId: 'enlace-1',
      analistaAsignadoId: 'analista-1',
      destinoCiudad: 'Cali',
      destinoDepartamento: 'Valle del Cauca',
      montoViaticos: 1500000,
      montoGastosViaje: 200000,
      rubroPresupuestal: 'C-2101-01',
      comisionado: {
        primerNombre: 'Carlos',
        primerApellido: 'Gómez',
        numeroDocumento: '79123456',
      },
    };

    it('Criterio 1: Dada una comisión AUTORIZADA, Cuando el analista envía el paquete a Presupuesto, Entonces pasa a EN_PRESUPUESTO y notifica a Presupuesto', async () => {
      mockSolicitudRepo.findOne.mockResolvedValueOnce({ ...solicitudAutorizadaBase });

      const resultado = await serviceInstance.enviarPaquetePresupuesto(
        'sol-aut-1',
        'analista-1',
        ['ANALISTA_VIATICOS'],
        { observaciones: 'Expediente verificado y autorizaciones en firme.' },
      );

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.EN_PRESUPUESTO);
      expect(resultado.enviadoPresupuesto).toBe(true);
      expect(resultado.enviadoPresupuestoPorId).toBe('analista-1');
      expect(resultado.fechaEnvioPresupuesto).toBeInstanceOf(Date);
      expect(resultado.observacionesEnvioPresupuesto).toBe(
        'Expediente verificado y autorizaciones en firme.',
      );

      // Trazabilidad de historial
      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-aut-1',
          estadoAnterior: EstadoSolicitud.AUTORIZADA,
          estadoNuevo: EstadoSolicitud.EN_PRESUPUESTO,
          usuarioId: 'analista-1',
          motivo: expect.stringContaining('[RF-PRE-001] Paquete de comisión enviado a Grupo de Presupuesto'),
        }),
      );

      // Notificación al rol PRESUPUESTO
      expect(mockNotificationClient.notifyByRole).toHaveBeenCalledWith(
        'PRESUPUESTO',
        expect.objectContaining({
          tipo_notificacion: 'VIATICOS_COMISION_EN_PRESUPUESTO',
          titulo: expect.stringContaining('COM-2026-0042'),
        }),
      );
    });

    it('Criterio 1 (validación): Rechaza enviar a Presupuesto si la comisión NO está en estado AUTORIZADA', async () => {
      mockSolicitudRepo.findOne.mockResolvedValueOnce({
        ...solicitudAutorizadaBase,
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
      });

      await expect(
        serviceInstance.enviarPaquetePresupuesto('sol-aut-1', 'analista-1', ['ANALISTA_VIATICOS']),
      ).rejects.toThrow(
        /Solo las comisiones en estado AUTORIZADA pueden ser enviadas al Grupo de Presupuesto/,
      );
    });

    it('Criterio 2: Dada una comisión en Presupuesto, Cuando se expide el RP en SIIF Nación, Entonces pasa a COMPROMETIDA', async () => {
      const solicitudEnPresupuesto = {
        ...solicitudAutorizadaBase,
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
        enviadoPresupuesto: true,
      };
      mockSolicitudRepo.findOne.mockResolvedValueOnce(solicitudEnPresupuesto);

      const dto: ExpedirRpDto = {
        numeroRp: '77889',
        fechaRp: '2026-09-16',
        valorComprometido: 1700000,
        rubro: 'C-2101-01',
        observaciones: 'Expedido en SIIF Nación sin contratiempos.',
      };

      const resultado = await serviceInstance.expedirRp(
        'sol-aut-1',
        'presupuesto-user-1',
        ['PRESUPUESTO'],
        dto,
      );

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.COMPROMETIDA);
      expect(resultado.numeroRp).toBe('77889');
      expect(resultado.valorComprometido).toBe(1700000);
      expect(resultado.rubroRp).toBe('C-2101-01');
      expect(resultado.codigoRp).toBe('2026-09-16_RP_77889'); // Nomenclatura Fecha_RP_Número generada
      expect(resultado.expedidoRpPorId).toBe('presupuesto-user-1');
      expect(resultado.fechaExpedicionRp).toBeInstanceOf(Date);

      // Trazabilidad
      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estadoAnterior: EstadoSolicitud.EN_PRESUPUESTO,
          estadoNuevo: EstadoSolicitud.COMPROMETIDA,
          motivo: expect.stringContaining('2026-09-16_RP_77889'),
        }),
      );

      // Notificación al enlace y analista
      expect(mockNotificationClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_notificacion: 'VIATICOS_RP_EXPEDIDO',
          titulo: expect.stringContaining('COM-2026-0042'),
          mensaje: expect.stringContaining('COMPROMETIDA'),
        }),
      );
    });

    it('Criterio 2 (validación): Rechaza expedición si la comisión no está en Presupuesto', async () => {
      mockSolicitudRepo.findOne.mockResolvedValueOnce({
        ...solicitudAutorizadaBase,
        estadoSolicitud: EstadoSolicitud.EN_VERIFICACION,
        enviadoPresupuesto: false,
      });

      const dto: ExpedirRpDto = {
        numeroRp: '123',
        fechaRp: '2026-09-16',
        valorComprometido: 500000,
        rubro: 'C-01',
      };

      await expect(serviceInstance.expedirRp('sol-1', 'user-1', [], dto)).rejects.toThrow(
        /La comisión debe estar en la bandeja de Presupuesto para expedir su RP/,
      );
    });

    it('Criterio 2 (validación): Rechaza si el valor comprometido es menor o igual a cero', async () => {
      mockSolicitudRepo.findOne.mockResolvedValueOnce({
        ...solicitudAutorizadaBase,
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
      });

      const dto: ExpedirRpDto = {
        numeroRp: '123',
        fechaRp: '2026-09-16',
        valorComprometido: 0,
        rubro: 'C-01',
      };

      await expect(serviceInstance.expedirRp('sol-1', 'user-1', [], dto)).rejects.toThrow(
        /El valor comprometido debe ser un monto positivo mayor a 0/,
      );
    });

    it('Criterio 3: Validador de nomenclatura Fecha_RP_Número', () => {
      // Formato estándar autogenerado
      expect(serviceInstance.validarYFormatearNomenclaturaRp('2026-09-16', '54321')).toBe(
        '2026-09-16_RP_54321',
      );

      // Formato con guiones válido suministrado
      expect(
        serviceInstance.validarYFormatearNomenclaturaRp('2026-09-16', '54321', '2026-09-16_RP_54321'),
      ).toBe('2026-09-16_RP_54321');

      // Formato compacto válido suministrado
      expect(
        serviceInstance.validarYFormatearNomenclaturaRp('2026-09-16', '54321', '20260916_RP_54321'),
      ).toBe('20260916_RP_54321');

      // Formato inválido que no respeta Fecha_RP_Número
      expect(() =>
        serviceInstance.validarYFormatearNomenclaturaRp('2026-09-16', '54321', 'INVALID_RP_123'),
      ).toThrow(/La nomenclatura 'INVALID_RP_123' es inválida. Debe respetar el formato Fecha_RP_Número/);

      expect(() =>
        serviceInstance.validarYFormatearNomenclaturaRp('2026-09-16', '54321', '2026-09-16-RP-54321'),
      ).toThrow(/La nomenclatura/);
    });

    it('Criterio 3: Carga masiva procesa múltiples comisiones a estado COMPROMETIDA y reporta inconsistencias', async () => {
      const sol1 = {
        id: 'sol-batch-1',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
        enviadoPresupuesto: true,
      };

      const sol2 = {
        id: 'sol-batch-2',
        consecutivoUnico: 'COM-2026-0002',
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
        enviadoPresupuesto: true,
      };

      // Mock para findOne por consecutivo o id
      mockSolicitudRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.consecutivoUnico === 'COM-2026-0001' || where?.id === 'sol-batch-1') {
          return Promise.resolve({ ...sol1 });
        }
        if (where?.consecutivoUnico === 'COM-2026-0002' || where?.id === 'sol-batch-2') {
          return Promise.resolve({ ...sol2 });
        }
        return Promise.resolve(null);
      });

      const items = [
        {
          consecutivoUnico: 'COM-2026-0001',
          numeroRp: 'RP-01',
          fechaRp: '2026-09-16',
          valorComprometido: 1000000,
          rubro: 'C-01',
        },
        {
          consecutivoUnico: 'COM-2026-0002',
          numeroRp: 'RP-02',
          fechaRp: '2026-09-16',
          valorComprometido: 2000000,
          rubro: 'C-02',
          codigoRp: '2026-09-16_RP_RP-02',
        },
        {
          consecutivoUnico: 'COM-2026-9999', // Inexistente
          numeroRp: 'RP-99',
          fechaRp: '2026-09-16',
          valorComprometido: 3000000,
          rubro: 'C-03',
        },
      ];

      const resultado = await serviceInstance.cargaMasivaRp('user-presupuesto', ['PRESUPUESTO'], items);

      expect(resultado.total).toBe(3);
      expect(resultado.exitosos).toBe(2);
      expect(resultado.fallidos).toBe(1);
      expect(resultado.procesados.length).toBe(2);
      expect(resultado.procesados[0].estado).toBe(EstadoSolicitud.COMPROMETIDA);
      expect(resultado.procesados[0].codigoRp).toBe('2026-09-16_RP_RP-01');
      expect(resultado.errores.length).toBe(1);
      expect(resultado.errores[0].identificador).toBe('COM-2026-9999');
      expect(resultado.errores[0].error).toContain('Comisión no encontrada');
    });

    it('Carga masiva rechaza arreglo vacío', async () => {
      await expect(serviceInstance.cargaMasivaRp('user-1', [], [])).rejects.toThrow(
        /El archivo o listado de carga masiva está vacío/,
      );
    });
  });
});
