import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
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
import {
  RegistrarRevocatoriaSiifDto,
  AplicarReduccionRpDto,
} from '../../../dto/revocatoria.dto';

describe('Proceso de Revocatoria de Comisión Autorizada en SIIF Nación (RF-REV-001 / RF-REV-002)', () => {
  let service: TravelExpensesService;
  let mockDataSource: any;
  let mockManager: any;
  let mockSolicitudRepo: any;
  let mockHistorialRepo: any;
  let mockDocumentoRepo: any;
  let mockTicketsService: any;
  let mockNotificationClient: any;

  beforeEach(async () => {
    mockSolicitudRepo = {
      createQueryBuilder: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };

    mockHistorialRepo = {
      save: jest.fn().mockResolvedValue({ id: 'hist-rev-01' }),
    };

    mockDocumentoRepo = {
      create: jest.fn((data) => ({ id: 'doc-soporte-uuid', ...data })),
      save: jest.fn((data) => Promise.resolve({ id: 'doc-soporte-uuid', ...data })),
    };

    mockManager = {
      getRepository: jest.fn((entity) => {
        if (entity === SolicitudComisionEntity) return mockSolicitudRepo;
        if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
        if (entity === DocumentoSoporteEntity) return mockDocumentoRepo;
        return { save: jest.fn((e) => Promise.resolve(e)) };
      }),
    };

    mockDataSource = {
      transaction: jest.fn(async (cb) => cb(mockManager)),
    };

    mockTicketsService = {
      liberarSaldo: jest.fn().mockResolvedValue(true),
    };

    mockNotificationClient = {
      notifyByPermission: jest.fn().mockResolvedValue(true),
      notifyUser: jest.fn().mockResolvedValue(true),
      sendEmail: jest.fn().mockResolvedValue(true),
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
          useValue: mockDocumentoRepo,
        },
        {
          provide: getRepositoryToken(SolicitudHistorialEstadoEntity),
          useValue: mockHistorialRepo,
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
        { provide: ConfigService, useValue: {} },
        { provide: NotificationClientService, useValue: mockNotificationClient },
        { provide: LiquidationService, useValue: {} },
        { provide: TicketsService, useValue: mockTicketsService },
      ],
    }).compile();

    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  describe('Fase 1: Disparo de Revocatoria al Cancelar Comisión AUTORIZADA', () => {
    it('cuando una comisión AUTORIZADA sin RP es cancelada por el Jefe, entra a EN_REVOCATORIA y fase PENDIENTE_REGISTRO_ORDENADOR', async () => {
      const solicitudAutorizada: any = {
        id: 'sol-aut-01',
        consecutivoUnico: 'COM-2026-AUT-01',
        estadoSolicitud: EstadoSolicitud.AUTORIZADA,
        comisionadoId: 'com-01',
        creadoPorUsuarioId: 'user-enlace-01',
        numeroRp: null,
        codigoRp: null,
        valorComprometido: null,
        camposAdicionales: {},
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudAutorizada),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Cancelación solicitada por motivo de fuerza mayor institucional',
        responsableCancelacion: 'Jefe Dependencia Asuntos Territoriales',
      };

      const result = await service.cancelarComision(
        'sol-aut-01',
        'jefe-user-01',
        ['JEFE_DEPENDENCIA'],
        dto,
      );

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.EN_REVOCATORIA);
      expect(result.camposAdicionales.procesoRevocatoria).toMatchObject({
        fase: 'PENDIENTE_REGISTRO_ORDENADOR',
        tieneRp: false,
        solicitadoPor: expect.objectContaining({
          usuarioId: 'jefe-user-01',
          nombre: 'Jefe Dependencia Asuntos Territoriales',
        }),
      });

      // Notifica al Ordenador del Gasto
      expect(mockNotificationClient.notifyByPermission).toHaveBeenCalledWith(
        'travel_expenses.general.es_subdireccion_corporativa',
        expect.objectContaining({
          tipo_notificacion: 'VIATICOS_REVOCATORIA_INICIADA',
        }),
        undefined,
        'SUBDIRECCION',
      );
    });

    it('cuando una comisión COMPROMETIDA (con RP) es cancelada por el Jefe, entra a EN_REVOCATORIA con tieneRp = true', async () => {
      const solicitudConRp: any = {
        id: 'sol-rp-01',
        consecutivoUnico: 'COM-2026-RP-01',
        estadoSolicitud: EstadoSolicitud.COMPROMETIDA,
        numeroRp: '2026-RP-12345',
        codigoRp: '20260916_RP_12345',
        valorComprometido: 1250000,
        camposAdicionales: {},
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudConRp),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: CancelarComisionDto = {
        motivoCancelacion: 'Cancelación de agenda por reorganización presupuestal',
      };

      const result = await service.cancelarComision(
        'sol-rp-01',
        'jefe-user-01',
        ['JEFE_DEPENDENCIA'],
        dto,
      );

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.EN_REVOCATORIA);
      expect(result.camposAdicionales.procesoRevocatoria.tieneRp).toBe(true);
      expect(result.camposAdicionales.procesoRevocatoria.numeroRp).toBe('2026-RP-12345');
      expect(result.pendienteReintegro).toBe(true);
    });
  });

  describe('Fase 2: Registro de Revocatoria en SIIF Nación por Ordenador del Gasto', () => {
    it('debe registrar el acto en SIIF, guardar el PDF del reporte y si NO tiene RP, finalizar en REVOCADA', async () => {
      const solicitudEnRevocatoriaSinRp: any = {
        id: 'sol-rev-sin-rp',
        consecutivoUnico: 'COM-2026-REV-01',
        estadoSolicitud: EstadoSolicitud.EN_REVOCATORIA,
        numeroRp: null,
        codigoRp: null,
        camposAdicionales: {
          procesoRevocatoria: {
            fase: 'PENDIENTE_REGISTRO_ORDENADOR',
            tieneRp: false,
          },
        },
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudEnRevocatoriaSinRp),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: RegistrarRevocatoriaSiifDto = {
        numeroActoRevocatoria: 'ACTO-REV-2026-0045',
        fechaActoRevocatoria: '2026-10-19',
        justificacion: 'Se formaliza la revocatoria en SIIF Nación según causal acreditada.',
        reporteRevocatoriaPdfBase64: 'data:application/pdf;base64,JVBERi0xLjQK...',
        nombreArchivoPdf: 'Reporte_Revocatoria_SIIF_0045.pdf',
      };

      const result = await service.registrarRevocatoriaSiif(
        'sol-rev-sin-rp',
        'ordenador-01',
        ['SUBDIRECCION_GESTION_CORPORATIVA'],
        dto,
      );

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.REVOCADA);
      expect(result.camposAdicionales.procesoRevocatoria.fase).toBe('REVOCADA');
      expect(result.camposAdicionales.procesoRevocatoria.registroSiif.numeroActo).toBe('ACTO-REV-2026-0045');

      // Verifica almacenamiento del PDF del reporte de SIIF Nación
      expect(mockDocumentoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoDocumento: 'REPORTE_REVOCATORIA_SIIF',
          nombreArchivoOriginal: 'Reporte_Revocatoria_SIIF_0045.pdf',
        }),
      );

      // Historial inmutable registrado
      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-rev-sin-rp',
          estadoNuevo: EstadoSolicitud.REVOCADA,
          comentarios: expect.stringContaining('Revocatoria formalizada en SIIF Nación por el Ordenador del Gasto (Sin RP)'),
        }),
      );
    });

    it('cuando SÍ tiene RP, el registro del Ordenador pasa a PENDIENTE_REDUCCION_PRESUPUESTO y notifica a Presupuesto', async () => {
      const solicitudConRpEnRevocatoria: any = {
        id: 'sol-rev-con-rp',
        consecutivoUnico: 'COM-2026-REV-02',
        estadoSolicitud: EstadoSolicitud.EN_REVOCATORIA,
        numeroRp: '2026-RP-8877',
        codigoRp: '20261019_RP_8877',
        valorComprometido: 950000,
        camposAdicionales: {
          procesoRevocatoria: {
            fase: 'PENDIENTE_REGISTRO_ORDENADOR',
            tieneRp: true,
          },
        },
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudConRpEnRevocatoria),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: RegistrarRevocatoriaSiifDto = {
        numeroActoRevocatoria: 'ACTO-REV-2026-0099',
        fechaActoRevocatoria: '2026-10-19',
        justificacion: 'Revocatoria autorizada; procede reducción de saldo presupuestal en SIIF Nación.',
        reporteRevocatoriaPdfBase64: 'data:application/pdf;base64,JVBERi0xLjQK...',
      };

      const result = await service.registrarRevocatoriaSiif(
        'sol-rev-con-rp',
        'ordenador-01',
        ['ORDENADOR_DEL_GASTO'],
        dto,
      );

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.EN_REVOCATORIA);
      expect(result.camposAdicionales.procesoRevocatoria.fase).toBe('PENDIENTE_REDUCCION_PRESUPUESTO');

      // Notifica al Grupo de Presupuesto con reporte de SIIF Nación
      expect(mockNotificationClient.notifyByPermission).toHaveBeenCalledWith(
        'travel_expenses.general.es_presupuesto',
        expect.objectContaining({
          tipo_notificacion: 'VIATICOS_REDUCCION_RP_REVOCATORIA',
          datos_adicionales: expect.objectContaining({
            numeroActo: 'ACTO-REV-2026-0099',
            fase: 'PENDIENTE_REDUCCION_PRESUPUESTO',
          }),
        }),
        undefined,
        'PRESUPUESTO',
      );
    });

    it('debe rechazar con ForbiddenException si el usuario no es Ordenador del Gasto', async () => {
      const dto: RegistrarRevocatoriaSiifDto = {
        numeroActoRevocatoria: 'ACTO-REV-01',
        fechaActoRevocatoria: '2026-10-19',
        justificacion: 'Intento de registro no autorizado',
        reporteRevocatoriaPdfBase64: 'data:application/pdf;base64,JVBERi0xLjQK...',
      };

      await expect(
        service.registrarRevocatoriaSiif('sol-01', 'user-enlace', ['ANALISTA_VIATICOS'], dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar con BadRequestException si no se adjunta el PDF del reporte de SIIF Nación', async () => {
      const dto: any = {
        numeroActoRevocatoria: 'ACTO-REV-01',
        fechaActoRevocatoria: '2026-10-19',
        justificacion: 'Falta adjuntar el archivo PDF de SIIF',
        reporteRevocatoriaPdfBase64: '',
      };

      await expect(
        service.registrarRevocatoriaSiif('sol-01', 'dir-01', ['SUBDIRECCION_GESTION_CORPORATIVA'], dto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Fase 3: Reducción Presupuestal de RP por Grupo de Presupuesto', () => {
    it('Presupuesto aplica la reducción de RP en SIIF Nación y transiciona a REVOCADA', async () => {
      const solicitudPendienteReduccion: any = {
        id: 'sol-rev-rp-03',
        consecutivoUnico: 'COM-2026-REV-03',
        estadoSolicitud: EstadoSolicitud.EN_REVOCATORIA,
        numeroRp: '2026-RP-4455',
        codigoRp: '20261019_RP_4455',
        valorComprometido: 850000,
        camposAdicionales: {
          procesoRevocatoria: {
            fase: 'PENDIENTE_REDUCCION_PRESUPUESTO',
            tieneRp: true,
            registroSiif: {
              numeroActo: 'ACTO-REV-2026-0099',
            },
          },
        },
      };

      const qbMock: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(solicitudPendienteReduccion),
      };
      mockSolicitudRepo.createQueryBuilder.mockReturnValue(qbMock);

      const dto: AplicarReduccionRpDto = {
        numeroOperacionReduccion: 'RED-SIIF-2026-9901',
        fechaReduccion: '2026-10-19',
        valorReducido: 850000,
        observaciones: 'Reducción total aplicada en SIIF Nación según acto de revocatoria.',
        soporteReduccionPdfBase64: 'data:application/pdf;base64,JVBERi0xLjQK...',
      };

      const result = await service.aplicarReduccionRpRevocatoria(
        'sol-rev-rp-03',
        'presupuesto-user-01',
        ['ANALISTA_PRESUPUESTO'],
        dto,
      );

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.REVOCADA);
      expect(result.camposAdicionales.procesoRevocatoria.fase).toBe('REVOCADA');
      expect(result.camposAdicionales.procesoRevocatoria.reduccionPresupuesto).toMatchObject({
        numeroOperacionReduccion: 'RED-SIIF-2026-9901',
        valorReducido: 850000,
      });
      expect(result.valorComprometido).toBe(0);

      // Historial inmutable registrado
      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-rev-rp-03',
          estadoNuevo: EstadoSolicitud.REVOCADA,
          comentarios: expect.stringContaining('Reducción presupuestal de RP aplicada en SIIF Nación por Presupuesto'),
        }),
      );
    });

    it('debe rechazar con ForbiddenException si el usuario no es del Grupo de Presupuesto', async () => {
      const dto: AplicarReduccionRpDto = {
        numeroOperacionReduccion: 'RED-01',
        fechaReduccion: '2026-10-19',
        valorReducido: 500000,
      };

      await expect(
        service.aplicarReduccionRpRevocatoria('sol-01', 'user-comisionado', ['COMISIONADO'], dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar con BadRequestException si el valor reducido es menor o igual a cero', async () => {
      const dto: AplicarReduccionRpDto = {
        numeroOperacionReduccion: 'RED-01',
        fechaReduccion: '2026-10-19',
        valorReducido: 0,
      };

      await expect(
        service.aplicarReduccionRpRevocatoria('sol-01', 'user-presupuesto', ['PRESUPUESTO'], dto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
