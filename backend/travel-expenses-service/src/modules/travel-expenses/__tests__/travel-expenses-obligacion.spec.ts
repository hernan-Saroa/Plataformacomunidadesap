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
import { CrearObligacionDto } from '../../../dto/crear-obligacion.dto';

describe('RF-PAG-001 — Etapa 8: Crear Obligación en SIIF Nación según Modalidad de Pago', () => {
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

  const mockSolicitudComprometidaAvance: Partial<SolicitudComisionEntity> = {
    id: 'sol-comp-001',
    consecutivoUnico: 'COM-2026-0089',
    estadoSolicitud: EstadoSolicitud.COMPROMETIDA,
    codigoRp: '2026-10-25_RP_48920',
    numeroRp: '48920',
    fechaRp: new Date('2026-10-25'),
    valorComprometido: 850000,
    rubroRp: 'VIATICOS_DOCENTES',
    modalidadPago: 'AVANCE',
    diasHabilesPrevios: 7,
    comisionado: mockComisionado as ComisionadoEntity,
    analistaAsignadoId: 'analista-001',
  };

  const mockSolicitudComprometidaPosterior: Partial<SolicitudComisionEntity> = {
    id: 'sol-comp-002',
    consecutivoUnico: 'COM-2026-0090',
    estadoSolicitud: EstadoSolicitud.COMPROMETIDA,
    codigoRp: '2026-10-28_RP_48921',
    numeroRp: '48921',
    fechaRp: new Date('2026-10-28'),
    valorComprometido: 450000,
    rubroRp: 'VIATICOS_ADMINISTRATIVOS',
    modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
    diasHabilesPrevios: 2,
    comisionado: mockComisionado as ComisionadoEntity,
    analistaAsignadoId: 'analista-001',
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
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<TravelExpensesService>(TravelExpensesService);
    controller = module.get<TravelExpensesController>(TravelExpensesController);
  });

  describe('Criterio 1: Crear obligación según modalidad definida en comisión comprometida', () => {
    it('debe registrar la obligación con modalidad AVANCE cuando la comisión comprometida tiene modalidad AVANCE', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({ ...mockSolicitudComprometidaAvance });

      const dto: CrearObligacionDto = {
        numeroObligacion: 'OBL-2026-00481',
        fechaObligacion: '2026-10-26',
        valorObligacion: 850000,
        modalidadPago: 'AVANCE',
        observacionesObligacion: 'Obligación creada en SIIF Nación por Analista para desembolso previo.',
      };

      const resultado = await service.crearObligacion(
        'sol-comp-001',
        'analista-001',
        ['ANALISTA'],
        dto,
      );

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.OBLIGADA);
      expect(resultado.numeroObligacion).toBe('OBL-2026-00481');
      expect(resultado.modalidadPago).toBe('AVANCE');
      expect(Number(resultado.valorObligacion)).toBe(850000);
      expect(resultado.obligadoPorId).toBe('analista-001');
      expect(resultado.observacionesObligacion).toContain('desembolso previo');

      // Verificación de historial de estados
      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estadoAnterior: EstadoSolicitud.COMPROMETIDA,
          estadoNuevo: EstadoSolicitud.OBLIGADA,
          usuarioId: 'analista-001',
          comentarios: expect.stringContaining('OBL-2026-00481'),
        }),
      );
    });

    it('debe registrar la obligación con modalidad RECONOCIMIENTO_POSTERIOR cuando la comisión es posterior', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({ ...mockSolicitudComprometidaPosterior });

      const dto: CrearObligacionDto = {
        numeroObligacion: 'OBL-2026-00482',
        fechaObligacion: '2026-10-29',
        valorObligacion: 450000,
        modalidadPago: 'RECONOCIMIENTO_POSTERIOR',
        observacionesObligacion: 'Obligación para liquidación posterior al viaje.',
      };

      const resultado = await service.crearObligacion(
        'sol-comp-002',
        'analista-001',
        ['ANALISTA'],
        dto,
      );

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.OBLIGADA);
      expect(resultado.numeroObligacion).toBe('OBL-2026-00482');
      expect(resultado.modalidadPago).toBe('RECONOCIMIENTO_POSTERIOR');
      expect(Number(resultado.valorObligacion)).toBe(450000);
    });
  });

  describe('Criterio 2: La comisión queda lista para el desembolso por Tesorería', () => {
    it('transiciona a estado OBLIGADA y notifica al usuario', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({ ...mockSolicitudComprometidaAvance });

      const dto: CrearObligacionDto = {
        numeroObligacion: 'OBL-2026-00999',
        fechaObligacion: '2026-10-26',
        valorObligacion: 850000,
      };

      const resultado = await service.crearObligacion(
        'sol-comp-001',
        'analista-001',
        ['ANALISTA'],
        dto,
      );

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.OBLIGADA);
      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo_notificacion: 'OBLIGACION_SIIF_REGISTRADA',
          mensaje: expect.stringContaining('OBL-2026-00999'),
        }),
      );
    });
  });

  describe('Validaciones de Negocio y Excepciones', () => {
    it('debe rechazar si la comisión no existe (NotFoundException)', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue(null);

      await expect(
        service.crearObligacion('sol-inexistente', 'analista-001', ['ANALISTA'], {
          numeroObligacion: 'OBL-001',
          fechaObligacion: '2026-10-26',
          valorObligacion: 500000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar si la comisión NO está en estado COMPROMETIDA (BadRequestException)', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({
        ...mockSolicitudComprometidaAvance,
        estadoSolicitud: EstadoSolicitud.AUTORIZADA,
      });

      await expect(
        service.crearObligacion('sol-comp-001', 'analista-001', ['ANALISTA'], {
          numeroObligacion: 'OBL-001',
          fechaObligacion: '2026-10-26',
          valorObligacion: 500000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si la comisión no tiene RP expedido (BadRequestException)', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({
        ...mockSolicitudComprometidaAvance,
        codigoRp: null,
        numeroRp: null,
      });

      await expect(
        service.crearObligacion('sol-comp-001', 'analista-001', ['ANALISTA'], {
          numeroObligacion: 'OBL-001',
          fechaObligacion: '2026-10-26',
          valorObligacion: 500000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si falta el número de obligación de SIIF (BadRequestException)', async () => {
      await expect(
        service.crearObligacion('sol-comp-001', 'analista-001', ['ANALISTA'], {
          numeroObligacion: '',
          fechaObligacion: '2026-10-26',
          valorObligacion: 500000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar si el valor de la obligación es menor o igual a cero', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({
        ...mockSolicitudComprometidaAvance,
        valorComprometido: 0,
      });

      await expect(
        service.crearObligacion('sol-comp-001', 'analista-001', ['ANALISTA'], {
          numeroObligacion: 'OBL-001',
          fechaObligacion: '2026-10-26',
          valorObligacion: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Controlador: Endpoint POST requests/:id/crear-obligacion', () => {
    it('debe procesar la creación de la obligación vía endpoint del controlador', async () => {
      mockSolicitudRepo.findOne.mockResolvedValue({ ...mockSolicitudComprometidaAvance });

      const dto: CrearObligacionDto = {
        numeroObligacion: 'OBL-SIIF-7744',
        fechaObligacion: '2026-10-26',
        valorObligacion: 850000,
        modalidadPago: 'AVANCE',
      };

      const reqMock = {
        user: { userId: 'analista-001', roles: ['ANALISTA'] },
      } as any;

      const res = await controller.crearObligacion('sol-comp-001', dto, reqMock);

      expect(res.success).toBe(true);
      expect(res.data.estadoSolicitud).toBe(EstadoSolicitud.OBLIGADA);
      expect(res.message).toContain('OBL-SIIF-7744');
      expect(res.message).toContain('OBLIGADA');
    });
  });
});
