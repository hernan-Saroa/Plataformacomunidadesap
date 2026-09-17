import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { FestivoColombiaEntity } from '../../../entities/festivo-colombia.entity';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { NotificationClientService } from '../../../common/notification-client.service';
import { ConfigService } from '../../config/config.service';
import { TravelExpensesService, DIAS_HABILES_MINIMOS_AVANCE_DEFAULT } from '../travel-expenses.service';
import { TravelExpensesController } from '../travel-expenses.controller';
import { IssueRpDto } from '../../../dto/issue-rp.dto';

describe('RF-PRE-003 — Etapa 7: Determinar Modalidad de Pago (AVANCE vs. RECONOCIMIENTO_POSTERIOR)', () => {
  let service: TravelExpensesService;
  let controller: TravelExpensesController;
  let mockSolicitudRepo: any;
  let mockHistorialRepo: any;
  let mockFestivoRepo: any;
  let mockDataSource: any;

  // Festivos de prueba para 2026 (Semana Santa, Reyes, Navidad, etc.)
  const festivosMock: FestivoColombiaEntity[] = [
    { id: 1, fecha: '2026-01-01', descripcion: 'Año Nuevo', creadoEn: new Date() },
    { id: 2, fecha: '2026-01-12', descripcion: 'Reyes Magos', creadoEn: new Date() },
    { id: 3, fecha: '2026-04-02', descripcion: 'Jueves Santo', creadoEn: new Date() },
    { id: 4, fecha: '2026-04-03', descripcion: 'Viernes Santo', creadoEn: new Date() },
    { id: 5, fecha: '2026-05-01', descripcion: 'Día del Trabajo', creadoEn: new Date() },
    { id: 6, fecha: '2026-07-20', descripcion: 'Día de la Independencia', creadoEn: new Date() },
    { id: 7, fecha: '2026-12-25', descripcion: 'Navidad', creadoEn: new Date() },
  ];

  beforeEach(async () => {
    mockSolicitudRepo = {
      findOne: jest.fn(),
      save: jest.fn((s) => Promise.resolve({ ...s })),
    };

    mockHistorialRepo = {
      save: jest.fn().mockResolvedValue({}),
    };

    mockFestivoRepo = {
      find: jest.fn().mockResolvedValue(festivosMock),
    };

    mockDataSource = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
        if (entity === FestivoColombiaEntity) return mockFestivoRepo;
        return mockSolicitudRepo;
      }),
      transaction: jest.fn((cb) =>
        cb({
          getRepository: jest.fn().mockImplementation((entity) => {
            if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
            if (entity === FestivoColombiaEntity) return mockFestivoRepo;
            return mockSolicitudRepo;
          }),
        }),
      ),
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
          useValue: { send: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<TravelExpensesService>(TravelExpensesService);
    controller = module.get<TravelExpensesController>(TravelExpensesController);
  });

  describe('1. Cómputo de Días Hábiles en Colombia (calcularDiasHabilesPrevios)', () => {
    it('debe retornar 0 si las fechas son nulas o inválidas', async () => {
      const result = await service.calcularDiasHabilesPrevios(null as any, null as any);
      expect(result).toBe(0);
    });

    it('debe retornar 0 si el viaje inicia en la misma fecha del RP o en el pasado', async () => {
      const resultMismoDia = await service.calcularDiasHabilesPrevios('2026-09-21', '2026-09-21');
      expect(resultMismoDia).toBe(0);

      const resultPasado = await service.calcularDiasHabilesPrevios('2026-09-25', '2026-09-20');
      expect(resultPasado).toBe(0);
    });

    it('debe contar días hábiles exactos entre semana excluyendo fines de semana', async () => {
      // De lunes 21 de septiembre a lunes 28 de septiembre de 2026 (sin festivos)
      // Días disponibles: Mar 22, Mié 23, Jue 24, Vie 25 -> 4 días hábiles
      const result = await service.calcularDiasHabilesPrevios('2026-09-21', '2026-09-28');
      expect(result).toBe(4);
    });

    it('debe excluir festivos oficiales de Colombia (Semana Santa: Jueves Santo y Viernes Santo)', async () => {
      // Del lunes 30 de marzo al lunes 6 de abril de 2026
      // Días calendario entre fechas:
      // Mar 31 marzo (Hábil 1)
      // Mié 1 abril (Hábil 2)
      // Jue 2 abril (Festivo - Jueves Santo -> NO HÁBIL)
      // Vie 3 abril (Festivo - Viernes Santo -> NO HÁBIL)
      // Sáb 4 y Dom 5 abril (Fin de semana -> NO HÁBIL)
      // Total días hábiles previos esperados = 2
      const result = await service.calcularDiasHabilesPrevios('2026-03-30', '2026-04-06');
      expect(result).toBe(2);
    });

    it('debe contar más de 5 días hábiles cuando hay tiempo suficiente', async () => {
      // Del lunes 14 de septiembre al lunes 28 de septiembre de 2026 (2 semanas sin festivos)
      // Semana 1: Mar 15, Mié 16, Jue 17, Vie 18 (4 días)
      // Semana 2: Lun 21, Mar 22, Mié 23, Jue 24, Vie 25 (5 días)
      // Total = 9 días hábiles
      const result = await service.calcularDiasHabilesPrevios('2026-09-14', '2026-09-28');
      expect(result).toBe(9);
    });
  });

  describe('2. Determinación de Modalidad de Pago (determinarModalidadPago)', () => {
    it(`debe clasificar como AVANCE si los días hábiles son mayores o iguales a ${DIAS_HABILES_MINIMOS_AVANCE_DEFAULT}`, () => {
      expect(service.determinarModalidadPago(5)).toBe('AVANCE');
      expect(service.determinarModalidadPago(10)).toBe('AVANCE');
    });

    it(`debe clasificar como RECONOCIMIENTO_POSTERIOR si los días hábiles son menores a ${DIAS_HABILES_MINIMOS_AVANCE_DEFAULT}`, () => {
      expect(service.determinarModalidadPago(4)).toBe('RECONOCIMIENTO_POSTERIOR');
      expect(service.determinarModalidadPago(1)).toBe('RECONOCIMIENTO_POSTERIOR');
      expect(service.determinarModalidadPago(0)).toBe('RECONOCIMIENTO_POSTERIOR');
    });
  });

  describe('3. Expedición de RP individual con RF-PRE-003 (registrarRP)', () => {
    it('debe asignar modalidad AVANCE cuando hay 6 días hábiles antes del viaje', async () => {
      const mockSolicitud: Partial<SolicitudComisionEntity> = {
        id: 'sol-avance-1',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
        fechaInicio: new Date('2026-09-29T00:00:00Z'), // Martes 29 sep
      };

      mockSolicitudRepo.findOne.mockResolvedValue(mockSolicitud);

      const dto: IssueRpDto = {
        numeroRp: '77701',
        fechaRp: '2026-09-21', // Lunes 21 sep -> Mar 22, Mié 23, Jue 24, Vie 25, Lun 28 = 5 días hábiles
        valorComprometido: 1200000,
        rubroPresupuestal: 'C-2101-01',
      };

      const resultado = await service.registrarRP('sol-avance-1', dto, 'usr-pres-001');

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.COMPROMETIDA);
      expect(resultado.diasHabilesPrevios).toBe(5);
      expect(resultado.modalidadPago).toBe('AVANCE');
      expect(resultado.fechaCalculoModalidad).toBeInstanceOf(Date);

      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estadoNuevo: EstadoSolicitud.COMPROMETIDA,
          motivo: expect.stringContaining('Modalidad: AVANCE (5 días hábiles previos)'),
        }),
      );
    });

    it('debe asignar modalidad RECONOCIMIENTO_POSTERIOR cuando hay menos de 5 días hábiles antes del viaje', async () => {
      const mockSolicitud: Partial<SolicitudComisionEntity> = {
        id: 'sol-reconocimiento-1',
        consecutivoUnico: 'COM-2026-0002',
        estadoSolicitud: EstadoSolicitud.AUTORIZADA,
        fechaInicio: new Date('2026-09-24T00:00:00Z'), // Jueves 24 sep
      };

      mockSolicitudRepo.findOne.mockResolvedValue(mockSolicitud);

      const dto: IssueRpDto = {
        numeroRp: '77702',
        fechaRp: '2026-09-21', // Lunes 21 sep -> Mar 22, Mié 23 = 2 días hábiles
        valorComprometido: 850000,
        rubroPresupuestal: 'C-2101-01',
      };

      const resultado = await service.registrarRP('sol-reconocimiento-1', dto, 'usr-pres-001');

      expect(resultado.estadoSolicitud).toBe(EstadoSolicitud.COMPROMETIDA);
      expect(resultado.diasHabilesPrevios).toBe(2);
      expect(resultado.modalidadPago).toBe('RECONOCIMIENTO_POSTERIOR');
      expect(resultado.fechaCalculoModalidad).toBeInstanceOf(Date);

      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estadoNuevo: EstadoSolicitud.COMPROMETIDA,
          motivo: expect.stringContaining('Modalidad: RECONOCIMIENTO_POSTERIOR (2 días hábiles previos)'),
        }),
      );
    });
  });

  describe('4. Carga Masiva de RPs con RF-PRE-003 (cargaMasivaRp)', () => {
    it('debe calcular proactivamente la modalidad para cada comisión procesada en lote', async () => {
      const sol1: Partial<SolicitudComisionEntity> = {
        id: 'sol-lote-1',
        consecutivoUnico: 'COM-2026-0100',
        estadoSolicitud: EstadoSolicitud.AUTORIZADA,
        fechaInicio: new Date('2026-10-15T00:00:00Z'), // Viaje a futuro con muchos días hábiles
      };

      const sol2: Partial<SolicitudComisionEntity> = {
        id: 'sol-lote-2',
        consecutivoUnico: 'COM-2026-0101',
        estadoSolicitud: EstadoSolicitud.EN_PRESUPUESTO,
        fechaInicio: new Date('2026-09-23T00:00:00Z'), // Viaje cercano
      };

      mockSolicitudRepo.findOne
        .mockResolvedValueOnce(sol1)
        .mockResolvedValueOnce(sol2);

      const items = [
        {
          solicitudId: 'sol-lote-1',
          numeroRp: '90001',
          fechaRp: '2026-09-21',
          valorComprometido: 1500000,
          rubro: 'C-2101-01',
        },
        {
          solicitudId: 'sol-lote-2',
          numeroRp: '90002',
          fechaRp: '2026-09-21',
          valorComprometido: 900000,
          rubro: 'C-2101-01',
        },
      ];

      const resultado = await service.cargaMasivaRp('usr-pres-001', ['GRUPO_PRESUPUESTO'], items as any);

      expect(resultado.exitosos).toBe(2);
      expect(resultado.procesados[0].modalidadPago).toBe('AVANCE');
      expect(resultado.procesados[0].diasHabilesPrevios).toBeGreaterThanOrEqual(5);

      expect(resultado.procesados[1].modalidadPago).toBe('RECONOCIMIENTO_POSTERIOR');
      expect(resultado.procesados[1].diasHabilesPrevios).toBeLessThan(5);
    });
  });

  describe('5. Controlador: Endpoint de Previsualización (GET requests/:id/modalidad-pago)', () => {
    it('debe retornar previsualización de modalidad y días hábiles', async () => {
      const mockSolicitud: Partial<SolicitudComisionEntity> = {
        id: 'sol-prev-1',
        consecutivoUnico: 'COM-2026-0999',
        fechaInicio: new Date('2026-09-30T00:00:00Z'),
      };
      mockSolicitudRepo.findOne.mockResolvedValue(mockSolicitud);

      const respuesta = await controller.previsualizarModalidadPago('sol-prev-1', '2026-09-21');

      expect(respuesta.success).toBe(true);
      expect(respuesta.data.solicitudId).toBe('sol-prev-1');
      expect(respuesta.data.consecutivoUnico).toBe('COM-2026-0999');
      expect(respuesta.data.modalidadPago).toBe('AVANCE');
      expect(respuesta.data.diasHabilesPrevios).toBe(6);
      expect(respuesta.data.umbralMinimoAvance).toBe(5);
    });
  });
});
