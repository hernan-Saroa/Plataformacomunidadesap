import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TravelExpensesController } from '../travel-expenses.controller';
import { TravelExpensesService } from '../travel-expenses.service';
import { DataSource } from 'typeorm';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';

describe('TravelExpensesController — Etapa 5 (RF-REC-002)', () => {
  let controller: TravelExpensesController;
  let service: TravelExpensesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelExpensesController],
      providers: [
        {
          provide: TravelExpensesService,
          useValue: {
            obtenerSolicitudesAsignadasAnalista: jest.fn(),
            verificarAuditoria: jest.fn(),
            devolverAnalista: jest.fn(),
            exportarSIIF: jest.fn(),
            obtenerSolicitudesSIIFRequested: jest.fn(),
            obtenerSolicitudControlViaticos: jest.fn(),
            verificarSegundaRevision: jest.fn(),
            devolverAAnalistaDesdeSegundaRevision: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TravelExpensesController>(TravelExpensesController);
    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('GET requests/analyst/inbox', () => {
    it('debe retornar las solicitudes asignadas al analista autenticado', async () => {
      const mockData = [
        {
          id: 'sol-001',
          consecutivoUnico: 'COM-2026-0001',
          estadoSolicitud: EstadoSolicitud.SOLICITADO,
          analistaAsignadoId: 'analista-001',
        },
        {
          id: 'sol-002',
          consecutivoUnico: 'COM-2026-0002',
          estadoSolicitud: EstadoSolicitud.SOLICITADO,
          analistaAsignadoId: 'analista-001',
        },
      ];

      jest
        .spyOn(service, 'obtenerSolicitudesAsignadasAnalista')
        .mockResolvedValue(mockData as any);

      const result = await controller.obtenerSolicitudesAsignadas({
        user: { userId: 'analista-001' },
      } as any);

      expect(result).toEqual({
        data: mockData,
        total: 2,
        timestamp: expect.any(String),
      });
      expect(service.obtenerSolicitudesAsignadasAnalista).toHaveBeenCalledWith(
        'analista-001',
      );
    });

    it('debe lanzar BadRequestException si no hay usuario autenticado', async () => {
      await expect(
        controller.obtenerSolicitudesAsignadas({} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST requests/:id/verify-audit', () => {
    it('debe llamar al servicio verificarAuditoria con los parametros correctos', async () => {
      const mockResult = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        consultaRutFacturador: true,
      };

      jest.spyOn(service, 'verificarAuditoria').mockResolvedValue(mockResult as any);

      const result = await controller.verificarAuditoria(
        'sol-001',
        {
          seguridadSocialVigente: true,
          consultaRutFacturador: true,
        },
        { user: { userId: 'analista-001', roles: ['ANALISTA'] } } as any,
      );

      expect(result).toEqual({
        success: true,
        data: mockResult,
        timestamp: expect.any(String),
      });
      expect(service.verificarAuditoria).toHaveBeenCalledWith(
        'sol-001',
        'analista-001',
        ['ANALISTA'],
        {
          seguridadSocialVigente: true,
          consultaRutFacturador: true,
        },
      );
    });

    it('debe lanzar BadRequestException si no hay usuario autenticado', async () => {
      await expect(
        controller.verificarAuditoria('sol-001', {}, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe resolver roles desde user.role cuando roles es undefined', async () => {
      const mockResult = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
      };

      jest.spyOn(service, 'verificarAuditoria').mockResolvedValue(mockResult as any);

      const result = await controller.verificarAuditoria(
        'sol-001',
        { seguridadSocialVigente: true },
        {
          user: {
            userId: 'analista-001',
            role: 'ANALISTA',
          },
        } as any,
      );

      expect(result.data).toEqual(mockResult);
      expect(service.verificarAuditoria).toHaveBeenCalledWith(
        'sol-001',
        'analista-001',
        ['ANALISTA'],
        { seguridadSocialVigente: true },
      );
    });
  });

  describe('POST requests/:id/devolver-analista', () => {
    it('debe llamar al servicio devolverAnalista con los parametros correctos', async () => {
      const mockResult = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.DEVUELTA,
        motivoDevolucion: 'Falta documento de soporte',
      };

      jest.spyOn(service, 'devolverAnalista').mockResolvedValue(mockResult as any);

      const result = await controller.devolverAnalista(
        'sol-001',
        { motivo: 'Falta documento de soporte' },
        { user: { userId: 'analista-001', roles: ['ANALISTA'] } } as any,
      );

      expect(result).toEqual({
        success: true,
        data: mockResult,
        timestamp: expect.any(String),
      });
      expect(service.devolverAnalista).toHaveBeenCalledWith(
        'sol-001',
        'analista-001',
        ['ANALISTA'],
        'Falta documento de soporte',
      );
    });

    it('debe lanzar BadRequestException si no hay usuario autenticado', async () => {
      await expect(
        controller.devolverAnalista('sol-001', { motivo: 'x' }, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe resolver roles desde user.role cuando roles es undefined', async () => {
      const mockResult = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.DEVUELTA,
      };

      jest.spyOn(service, 'devolverAnalista').mockResolvedValue(mockResult as any);

      const result = await controller.devolverAnalista(
        'sol-001',
        { motivo: 'Falta soporte' },
        {
          user: {
            userId: 'analista-001',
            role: 'ANALISTA',
          },
        } as any,
      );

      expect(service.devolverAnalista).toHaveBeenCalledWith(
        'sol-001',
        'analista-001',
        ['ANALISTA'],
        'Falta soporte',
      );
    });
  });

  describe('GET requests/:id/siif-export', () => {
    it('debe retornar CSV con los headers correctos cuando se llama al servicio', async () => {
      const mockExportResult = {
        csvContent: 'Cedula;Nombre;Objeto;ValorNeto;RubroPresupuestal\n123456;"Juan Pérez";"Comision";600000;"Rubro"\n',
        fileName: 'SIIF_COM-2026-0001_2026-09-08.csv',
        solicitud: {
          id: 'sol-001',
          estadoSolicitud: EstadoSolicitud.SOLICITADA_SIIF,
          siifExportado: true,
        },
      };

      jest.spyOn(service, 'exportarSIIF').mockResolvedValue(mockExportResult as any);

      const res = {
        set: jest.fn(),
        send: jest.fn(),
      } as any;

      await controller.exportarSIIF('sol-001', {
        user: { userId: 'analista-001', roles: ['ANALISTA'] },
      } as any, res);

      expect(service.exportarSIIF).toHaveBeenCalledWith(
        'sol-001',
        'analista-001',
        ['ANALISTA'],
      );
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="SIIF_COM-2026-0001_2026-09-08.csv"',
        'Content-Length': Buffer.byteLength(mockExportResult.csvContent, 'utf8'),
      });
      expect(res.send).toHaveBeenCalledWith(mockExportResult.csvContent);
    });
  });

  describe('GET requests/siif-requested', () => {
    it('debe retornar solicitudes en estado SOLICITADA_SIIF paginadas', async () => {
      const mockData = [
        {
          id: 'sol-001',
          consecutivoUnico: 'COM-2026-0001',
          estadoSolicitud: EstadoSolicitud.SOLICITADA_SIIF,
          analistaVerificadorNombre: 'María López',
          usuarioExportadorId: 'exp-001',
        },
        {
          id: 'sol-002',
          consecutivoUnico: 'COM-2026-0002',
          estadoSolicitud: EstadoSolicitud.SOLICITADA_SIIF,
          analistaVerificadorNombre: 'Carlos Ruiz',
          usuarioExportadorId: 'exp-001',
        },
      ];

      jest
        .spyOn(service, 'obtenerSolicitudesSIIFRequested')
        .mockResolvedValue({ data: mockData, total: 2, page: 1, limit: 20 } as any);

      const result = await controller.obtenerSolicitudesSIIFRequested('1', '20');

      expect(service.obtenerSolicitudesSIIFRequested).toHaveBeenCalledWith(1, 20);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('debe usar paginación por defecto cuando no se pasan query params', async () => {
      jest
        .spyOn(service, 'obtenerSolicitudesSIIFRequested')
        .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as any);

      const result = await controller.obtenerSolicitudesSIIFRequested(undefined, undefined);

      expect(service.obtenerSolicitudesSIIFRequested).toHaveBeenCalledWith(1, 20);
      expect(result.total).toBe(0);
    });
  });

  describe('GET requests/:id/control-viaticos', () => {
    it('debe retornar el detalle completo de la solicitud para Control Viáticos', async () => {
      const mockDetalle = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.SOLICITADA_SIIF,
        comisionado: { id: 'com-001', numeroDocumento: '1234567890', primerNombre: 'Juan', primerApellido: 'Pérez' },
        documentosSoporte: [{ id: 'doc-001', tipoDocumento: 'CDP' }],
        resumenPresupuestal: {
          totalGastado: 500000,
          cantidadSolicitudes: 1,
          limitePresupuesto: 10000000,
          porcentajeUso: 5,
          semaforo: 'VERDE',
        },
        analistaVerificadorNombre: 'María López',
        fechaVerificacionPrimerNivel: '2026-09-08T10:00:00.000Z',
      };

      jest
        .spyOn(service, 'obtenerSolicitudControlViaticos')
        .mockResolvedValue(mockDetalle as any);

      const result = await controller.obtenerSolicitudControlViaticos('sol-001');

      expect(service.obtenerSolicitudControlViaticos).toHaveBeenCalledWith('sol-001');
      expect(result).toEqual(mockDetalle);
    });

    it('debe propagar NotFoundException cuando la solicitud no existe', async () => {
      jest
        .spyOn(service, 'obtenerSolicitudControlViaticos')
        .mockRejectedValue(new NotFoundException('Solicitud no encontrada.'));

      await expect(
        controller.obtenerSolicitudControlViaticos('no-existe'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST requests/:id/verify-second-level', () => {
    it('debe aprobar la segunda revisión y retornar la solicitud verificada', async () => {
      const mockResult = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
        revisorControlId: 'revisor-001',
        fechaSegundaRevision: new Date(),
        observacionesSegundaRevision: 'Verificado correctamente',
      };

      jest
        .spyOn(service, 'verificarSegundaRevision')
        .mockResolvedValue(mockResult as any);

      const result = await controller.verificarSegundaRevision(
        'sol-001',
        { observaciones: 'Verificado correctamente' },
        { user: { userId: 'revisor-001', roles: ['CONTROL_VIATICOS'] } } as any,
      );

      expect(result).toEqual({
        success: true,
        data: mockResult,
        timestamp: expect.any(String),
      });
      expect(service.verificarSegundaRevision).toHaveBeenCalledWith(
        'sol-001',
        'revisor-001',
        ['CONTROL_VIATICOS'],
        { observaciones: 'Verificado correctamente' },
      );
    });

    it('debe resolver roles desde user.role cuando roles es undefined', async () => {
      const mockResult = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
      };

      jest
        .spyOn(service, 'verificarSegundaRevision')
        .mockResolvedValue(mockResult as any);

      await controller.verificarSegundaRevision(
        'sol-001',
        {},
        {
          user: {
            userId: 'revisor-001',
            role: 'CONTROL_VIATICOS',
          },
        } as any,
      );

      expect(service.verificarSegundaRevision).toHaveBeenCalledWith(
        'sol-001',
        'revisor-001',
        ['CONTROL_VIATICOS'],
        {},
      );
    });

    it('debe lanzar BadRequestException si no hay usuario autenticado', async () => {
      await expect(
        controller.verificarSegundaRevision(
          'sol-001',
          {},
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe propagar ForbiddenException por infracción SoD', async () => {
      jest
        .spyOn(service, 'verificarSegundaRevision')
        .mockRejectedValue(
          new ForbiddenException(
            'Violacion de Segregacion de Funciones: El revisor de segundo nivel debe ser diferente del comisionado, creador, analista verificador y exportador SIIF',
          ),
        );

      await expect(
        controller.verificarSegundaRevision(
          'sol-001',
          { observaciones: 'test' },
          { user: { userId: 'user-001', roles: ['CONTROL_VIATICOS'] } } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe propagar BadRequestException si el estado no es SOLICITADA_SIIF', async () => {
      jest
        .spyOn(service, 'verificarSegundaRevision')
        .mockRejectedValue(
          new BadRequestException(
            'Estado no válido para segunda revisión: VERIFICADA.',
          ),
        );

      await expect(
        controller.verificarSegundaRevision(
          'sol-001',
          {},
          { user: { userId: 'revisor-001', roles: ['CONTROL_VIATICOS'] } } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST requests/:id/return-to-analyst', () => {
    it('debe devolver la solicitud al analista y transicionar a EN_VERIFICACION', async () => {
      const mockResult = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.EN_VERIFICACION,
        revisorControlId: 'revisor-001',
        observacionesSegundaRevision: 'Faltan documentos',
      };

      jest
        .spyOn(service, 'devolverAAnalistaDesdeSegundaRevision')
        .mockResolvedValue(mockResult as any);

      const result = await controller.devolverAAnalista(
        'sol-001',
        { observaciones: 'Faltan documentos' },
        { user: { userId: 'revisor-001', roles: ['CONTROL_VIATICOS'] } } as any,
      );

      expect(result).toEqual({
        success: true,
        data: mockResult,
        timestamp: expect.any(String),
      });
      expect(service.devolverAAnalistaDesdeSegundaRevision).toHaveBeenCalledWith(
        'sol-001',
        'revisor-001',
        ['CONTROL_VIATICOS'],
        { observaciones: 'Faltan documentos' },
      );
    });

    it('debe resolver roles desde user.role cuando roles es undefined', async () => {
      const mockResult = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.EN_VERIFICACION,
      };

      jest
        .spyOn(service, 'devolverAAnalistaDesdeSegundaRevision')
        .mockResolvedValue(mockResult as any);

      await controller.devolverAAnalista(
        'sol-001',
        { observaciones: 'Faltan documentos' },
        {
          user: {
            userId: 'revisor-001',
            role: 'CONTROL_VIATICOS',
          },
        } as any,
      );

      expect(service.devolverAAnalistaDesdeSegundaRevision).toHaveBeenCalledWith(
        'sol-001',
        'revisor-001',
        ['CONTROL_VIATICOS'],
        { observaciones: 'Faltan documentos' },
      );
    });

    it('debe lanzar BadRequestException si no hay usuario autenticado', async () => {
      await expect(
        controller.devolverAAnalista('sol-001', { observaciones: 'x' }, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe propagar ForbiddenException por infracción SoD', async () => {
      jest
        .spyOn(service, 'devolverAAnalistaDesdeSegundaRevision')
        .mockRejectedValue(
          new ForbiddenException(
            'Violacion de Segregacion de Funciones',
          ),
        );

      await expect(
        controller.devolverAAnalista(
          'sol-001',
          { observaciones: 'Falta soporte' },
          { user: { userId: 'user-001', roles: ['CONTROL_VIATICOS'] } } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
