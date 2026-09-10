import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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

    it('debe lanzar BadRequestException si no hay usuario autenticado', async () => {
      await expect(
        controller.exportarSIIF('sol-001', {} as any, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe resolver roles desde user.role cuando roles es undefined', async () => {
      const mockExportResult = {
        csvContent: 'Cedula;Nombre;Objeto;ValorNeto;RubroPresupuestal\n',
        fileName: 'SIIF_COM-2026-0001_2026-09-08.csv',
        solicitud: {
          id: 'sol-001',
          estadoSolicitud: EstadoSolicitud.SOLICITADA_SIIF,
        },
      };

      jest.spyOn(service, 'exportarSIIF').mockResolvedValue(mockExportResult as any);

      const res = {
        set: jest.fn(),
        send: jest.fn(),
      } as any;

      await controller.exportarSIIF('sol-001', {
        user: {
          userId: 'analista-001',
          role: 'ANALISTA',
        },
      } as any, res);

      expect(service.exportarSIIF).toHaveBeenCalledWith(
        'sol-001',
        'analista-001',
        ['ANALISTA'],
      );
    });
  });
});
