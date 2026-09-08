import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsController } from '../assignments.controller';
import { AssignmentsService } from '../assignments.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';
import { BadRequestException } from '@nestjs/common';

describe('AssignmentsController — RF-REC-002', () => {
  let controller: AssignmentsController;
  let service: AssignmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        {
          provide: AssignmentsService,
          useValue: {
            obtenerCargaAnalistas: jest.fn(),
            obtenerSolicitudesAsignadas: jest.fn(),
            asignarAnalista: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
    service = module.get<AssignmentsService>(AssignmentsService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /assignments/workload', () => {
    it('debe retornar el tablero de carga sin solicitudId', async () => {
      const mockData = [
        {
          usuarioId: 'user-1',
          nombreCompleto: 'Ana Gómez',
          username: 'ana.gomez',
          identificacion: '123456',
          asignacionesActivas: 1,
          altas: 1,
          medias: 0,
          bajas: 0,
          puntajeTotal: 3,
          colorSemaforo: 'VERDE',
        },
      ];

      jest.spyOn(service, 'obtenerCargaAnalistas').mockResolvedValue(mockData);

      const result = await controller.obtenerCargaAnalistas(
        { user: { userId: 'secretario-1' } } as any,
        undefined,
      );

      expect(result).toEqual({
        data: mockData,
        total: 1,
        timestamp: expect.any(String),
      });
      expect(service.obtenerCargaAnalistas).toHaveBeenCalledWith(undefined);
    });

    it('debe retornar el tablero de carga con solicitudId', async () => {
      const mockData = [
        {
          usuarioId: 'user-1',
          nombreCompleto: 'Ana Gómez',
          username: 'ana.gomez',
          identificacion: '123456',
          asignacionesActivas: 0,
          altas: 0,
          medias: 0,
          bajas: 0,
          puntajeTotal: 0,
          colorSemaforo: 'VERDE',
        },
      ];

      jest.spyOn(service, 'obtenerCargaAnalistas').mockResolvedValue(mockData);

      const result = await controller.obtenerCargaAnalistas(
        { user: { userId: 'secretario-1' } } as any,
        'sol-001',
      );

      expect(result).toEqual({
        data: mockData,
        total: 1,
        timestamp: expect.any(String),
      });
      expect(service.obtenerCargaAnalistas).toHaveBeenCalledWith('sol-001');
    });
  });

  describe('GET /assignments/my-requests', () => {
    it('debe retornar las solicitudes asignadas al analista autenticado', async () => {
      const mockData = [
        {
          id: 'sol-001',
          consecutivoUnico: 'COM-2026-0001',
          estadoSolicitud: 'SOLICITADO',
          analistaAsignadoId: 'user-1',
        },
      ];

      jest.spyOn(service, 'obtenerSolicitudesAsignadas').mockResolvedValue(mockData as any);

      const result = await controller.obtenerMisSolicitudes({
        user: { userId: 'user-1' },
      } as any);

      expect(result).toEqual({
        data: mockData,
        total: 1,
        timestamp: expect.any(String),
      });
      expect(service.obtenerSolicitudesAsignadas).toHaveBeenCalledWith('user-1');
    });

    it('debe lanzar 400 si no hay usuario autenticado', async () => {
      await expect(
        controller.obtenerMisSolicitudes({} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /assignments/assign', () => {
    it('debe asignar la solicitud al analista correctamente', async () => {
      const mockResult = {
        solicitud: {
          id: 'sol-001',
          estadoSolicitud: 'EN_VERIFICACION',
          analistaAsignadoId: 'user-1',
        },
        historial: { id: 'hist-001' },
      };

      jest.spyOn(service, 'asignarAnalista').mockResolvedValue(mockResult as any);

      const result = await controller.asignarAnalista(
        { user: { userId: 'secretario-1' } } as any,
        { solicitudId: 'sol-001', analistaId: 'user-1' },
      );

      expect(result).toEqual({
        success: true,
        message: 'Solicitud asignada exitosamente.',
        data: {
          solicitudId: 'sol-001',
          estadoSolicitud: 'EN_VERIFICACION',
          analistaAsignadoId: 'user-1',
          historialId: 'hist-001',
        },
      });
      expect(service.asignarAnalista).toHaveBeenCalledWith('sol-001', 'user-1', 'secretario-1');
    });

    it('debe lanzar 400 si faltan campos en el body', async () => {
      await expect(
        controller.asignarAnalista(
          { user: { userId: 'secretario-1' } } as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 400 si no hay usuario autenticado', async () => {
      await expect(
        controller.asignarAnalista(
          {} as any,
          { solicitudId: 'sol-001', analistaId: 'user-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
