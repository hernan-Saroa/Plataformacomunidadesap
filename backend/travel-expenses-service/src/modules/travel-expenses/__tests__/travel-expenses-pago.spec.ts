import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { FestivoColombiaEntity } from '../../../entities/festivo-colombia.entity';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { NotificationClientService } from '../../../common/notification-client.service';
import { ConfigService } from '../../config/config.service';
import { TravelExpensesService } from '../travel-expenses.service';
import { TravelExpensesController } from '../travel-expenses.controller';
import { ProcesarPagoDto } from '../../../dto/procesar-pago.dto';

describe('RF-PAG-003 — Etapa 8: Procesar Desembolso y Pago de Comisión por Tesorería', () => {
  let service: TravelExpensesService;
  let controller: TravelExpensesController;
  let mockSolicitudRepo: any;
  let mockHistorialRepo: any;
  let mockDataSource: any;
  let mockNotificationService: any;

  const mockComisionado: Partial<ComisionadoEntity> = {
    id: 'com-001',
    numeroDocumento: '1098765432',
    primerNombre: 'Carlos',
    primerApellido: 'Gómez',
    cargo: 'Docente Ocasional',
  };

  const mockSolicitudObligadaAvance: Partial<SolicitudComisionEntity> = {
    id: 'sol-obli-001',
    consecutivoUnico: 'COM-2026-0089',
    estadoSolicitud: EstadoSolicitud.OBLIGADA,
    codigoRp: '2026-10-25_RP_48920',
    numeroRp: '48920',
    fechaRp: new Date('2026-10-25'),
    valorComprometido: 850000,
    numeroObligacion: 'OBL-2026-00481',
    fechaObligacion: new Date('2026-10-25'),
    valorObligacion: 850000,
    modalidadPago: 'AVANCE',
    comisionado: mockComisionado as ComisionadoEntity,
    analistaAsignadoId: 'analista-001',
    creadoPorUsuarioId: 'enlace-001',
  };

  const mockSolicitudObligadaPosterior: Partial<SolicitudComisionEntity> = {
    id: 'sol-obli-002',
    consecutivoUnico: 'COM-2026-0090',
    estadoSolicitud: EstadoSolicitud.OBLIGADA,
    codigoRp: '2026-10-28_RP_48921',
    numeroRp: '48921',
    fechaRp: new Date('2026-10-28'),
    valorComprometido: 450000,
    numeroObligacion: 'OBL-2026-00482',
    fechaObligacion: new Date('2026-10-28'),
    valorObligacion: 450000,
    modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
    comisionado: mockComisionado as ComisionadoEntity,
    analistaAsignadoId: 'analista-001',
    creadoPorUsuarioId: 'enlace-001',
  };

  beforeEach(async () => {
    mockSolicitudRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn((s) => Promise.resolve({ ...s })),
    };

    mockHistorialRepo = {
      save: jest.fn().mockResolvedValue({}),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
        return mockSolicitudRepo;
      }),
      transaction: jest.fn((cb) =>
        cb({
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
            return mockSolicitudRepo;
          }),
        }),
      ),
    };

    mockNotificationService = {
      send: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelExpensesController],
      providers: [
        TravelExpensesService,
        { provide: getRepositoryToken(SolicitudComisionEntity), useValue: mockSolicitudRepo },
        { provide: getRepositoryToken(ComisionadoEntity), useValue: {} },
        { provide: getRepositoryToken(DocumentoSoporteEntity), useValue: {} },
        { provide: getRepositoryToken(SolicitudHistorialEstadoEntity), useValue: mockHistorialRepo },
        { provide: getRepositoryToken(FestivoColombiaEntity), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: NotificationClientService, useValue: mockNotificationService },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('mock-value') } },
      ],
    }).compile();

    service = module.get<TravelExpensesService>(TravelExpensesService);
    controller = module.get<TravelExpensesController>(TravelExpensesController);
  });

  describe('Criterio 1: Transición al estado PAGADA y respeto de la modalidad', () => {
    it('debe procesar el desembolso y transicionar a PAGADA respetando modalidad AVANCE', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({ ...mockSolicitudObligadaAvance });

      const dto: ProcesarPagoDto = {
        fechaPago: '2026-10-26',
        valorPagado: 850000,
        numeroOrdenPago: 'OP-SIIF-2026-98124',
        soportePagoPath: 'uploads/pagos/2026/comprobante-8920.pdf',
        observacionesPago: 'Desembolso bancario realizado a cuenta de nómina',
        modalidadPago: 'AVANCE',
      };

      const resultado = await service.procesarPago(
        'sol-obli-001',
        'tesorero-001',
        ['TESORERIA'],
        dto,
      );

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.PAGADA);
      expect(resultado.valorPagado).toBe(850000);
      expect(resultado.numeroOrdenPago).toBe('OP-SIIF-2026-98124');
      expect(resultado.soportePagoPath).toBe('uploads/pagos/2026/comprobante-8920.pdf');
      expect(resultado.pagadoPorId).toBe('tesorero-001');
      expect(resultado.modalidadPago).toBe('AVANCE');
      expect(resultado.fechaRegistroPago).toBeDefined();

      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-obli-001',
          estadoAnterior: EstadoSolicitud.OBLIGADA,
          estadoNuevo: EstadoSolicitud.PAGADA,
          usuarioId: 'tesorero-001',
        }),
      );
    });

    it('debe procesar el desembolso y transicionar a PAGADA respetando modalidad RECONOCIMIENTO_POSTERIOR', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({ ...mockSolicitudObligadaPosterior });

      const dto: ProcesarPagoDto = {
        fechaPago: '2026-10-29',
        valorPagado: 450000,
        numeroOrdenPago: 'OP-SIIF-2026-98125',
        soporteDesembolsoPath: 'uploads/pagos/2026/soporte-egreso-8921.pdf',
        modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
      };

      const resultado = await service.procesarPago(
        'sol-obli-002',
        'tesorero-001',
        ['TESORERIA'],
        dto,
      );

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.PAGADA);
      expect(resultado.valorPagado).toBe(450000);
      expect(resultado.numeroOrdenPago).toBe('OP-SIIF-2026-98125');
      expect(resultado.soportePagoPath).toBe('uploads/pagos/2026/soporte-egreso-8921.pdf');
      expect(resultado.modalidadPago).toBe('RECONOCIMIENTO_POSTERIOR');
    });
  });

  describe('Criterio 2: Trazabilidad, soporte, fecha y notificaciones', () => {
    it('debe registrar el soporte y fecha en la trazabilidad y notificar al enlace y analista', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({ ...mockSolicitudObligadaAvance });

      const dto: ProcesarPagoDto = {
        fechaPago: '2026-10-26',
        valorPagado: 850000,
        numeroOrdenPago: 'OP-SIIF-2026-98124',
        soportePagoPath: 'uploads/pagos/2026/comprobante-8920.pdf',
      };

      const resultado = await service.procesarPago(
        'sol-obli-001',
        'tesorero-001',
        ['TESORERIA'],
        dto,
      );

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.PAGADA);
      expect(mockNotificationService.send).toHaveBeenCalled();
      const notifCalls = mockNotificationService.send.mock.calls;
      expect(notifCalls.some((call: any) => call[0].tipo_notificacion === 'COMISION_PAGADA')).toBe(true);
    });
  });

  describe('Validaciones de Negocio y Excepciones', () => {
    it('debe rechazar si la comisión no existe (NotFoundException)', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue(null);

      await expect(
        service.procesarPago('sol-inexistente', 'tesorero-001', ['TESORERIA'], {
          fechaPago: '2026-10-26',
          valorPagado: 850000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar si la comisión NO está en estado OBLIGADA (BadRequestException)', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({
        ...mockSolicitudObligadaAvance,
        estadoSolicitud: EstadoSolicitud.COMPROMETIDA,
      });

      await expect(
        service.procesarPago('sol-obli-001', 'tesorero-001', ['TESORERIA'], {
          fechaPago: '2026-10-26',
          valorPagado: 850000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si la comisión no tiene número de obligación en SIIF (BadRequestException)', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({
        ...mockSolicitudObligadaAvance,
        numeroObligacion: null,
      });

      await expect(
        service.procesarPago('sol-obli-001', 'tesorero-001', ['TESORERIA'], {
          fechaPago: '2026-10-26',
          valorPagado: 850000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si falta la fecha de pago (BadRequestException)', async () => {
      await expect(
        service.procesarPago('sol-obli-001', 'tesorero-001', ['TESORERIA'], {
          fechaPago: '',
          valorPagado: 850000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si el valor pagado es menor o igual a cero (BadRequestException)', async () => {
      await expect(
        service.procesarPago('sol-obli-001', 'tesorero-001', ['TESORERIA'], {
          fechaPago: '2026-10-26',
          valorPagado: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Controlador: Endpoint POST requests/:id/procesar-pago', () => {
    it('debe procesar el desembolso vía endpoint del controlador y retornar respuesta exitosa', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({ ...mockSolicitudObligadaAvance });

      const dto: ProcesarPagoDto = {
        fechaPago: '2026-10-26',
        valorPagado: 850000,
        numeroOrdenPago: 'OP-SIIF-2026-98124',
        soportePagoPath: 'uploads/pagos/2026/comprobante-8920.pdf',
      };

      const reqMock: any = {
        user: {
          userId: 'tesorero-001',
          roles: ['TESORERIA'],
        },
      };

      const res = await controller.procesarPago('sol-obli-001', dto, reqMock);

      expect(res.success).toBe(true);
      expect(res.data.estadoSolicitud).toBe(EstadoSolicitud.PAGADA);
      expect(res.message).toContain('PAGADA');
      expect(res.timestamp).toBeDefined();
    });

    it('debe subir el archivo de soporte de pago y retornar la ruta de repositorio', async () => {
      const mockFile: any = {
        originalname: 'comprobante_bancario_8920.pdf',
        filename: 'pago_1726665600000_comprobante_bancario_8920.pdf',
        size: 1048576,
        mimetype: 'application/pdf',
      };

      const res = await controller.subirSoportePago('sol-obli-001', mockFile);

      expect(res.success).toBe(true);
      expect(res.data.urlRepositorio).toBe('/uploads/sol-obli-001/pago_1726665600000_comprobante_bancario_8920.pdf');
      expect(res.data.nombreArchivo).toBe('comprobante_bancario_8920.pdf');
      expect(res.message).toContain('exitosamente');
    });

    it('debe rechazar la subida de soporte de pago si no se envía archivo', async () => {
      await expect(
        controller.subirSoportePago('sol-obli-001', null as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

