import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SstNotificationService } from '../sst-notification.service';
import { SstNotificationController } from '../sst-notification.controller';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { NotificationClientService } from '../../../common/notification-client.service';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';

describe('RF-PAG-002 — Etapa 8: Notificar Automáticamente a SST (Bandeja In-App y Correo por Rol)', () => {
  let service: SstNotificationService;
  let controller: SstNotificationController;
  let mockSolicitudRepo: any;
  let mockHistorialRepo: any;
  let mockDataSource: any;
  let mockNotificationClient: any;

  const mockComisionado = {
    id: 'com-001',
    numeroDocumento: '1098765432',
    primerNombre: 'Ana',
    segundoNombre: 'María',
    primerApellido: 'López',
    segundoApellido: 'Pérez',
    cargo: 'Profesional Especializado',
  };

  const mockSolicitud: Partial<SolicitudComisionEntity> = {
    id: 'sol-001',
    consecutivoUnico: 'COM-2026-0150',
    comisionadoId: 'com-001',
    comisionado: mockComisionado as any,
    destinoCiudad: 'Medellín',
    destinoDepartamento: 'Antioquia',
    fechaInicio: new Date('2026-11-10T08:00:00Z'),
    fechaFin: new Date('2026-11-12T18:00:00Z'),
    objetoComision: 'Capacitación presencial en gestión pública territorial y formulación de proyectos',
    estadoSolicitud: EstadoSolicitud.COMPROMETIDA,
    notificadoSst: false,
    montoViaticos: 950000,
  };

  beforeEach(async () => {
    mockSolicitudRepo = {
      findOne: jest.fn().mockResolvedValue({ ...mockSolicitud }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockHistorialRepo = {
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'hist-uuid-1', ...entity })),
      find: jest.fn().mockResolvedValue([
        {
          id: 'hist-1',
          solicitudId: 'sol-001',
          comentarios: 'Notificación automática despachada a Seguridad y Salud en el Trabajo (SST) [In-App bandeja + Correo a: sst@esap.edu.co]',
          creadoEn: new Date(),
        },
      ]),
    };

    mockNotificationClient = {
      notifyByRole: jest.fn().mockResolvedValue(undefined),
      getEmailsByRole: jest.fn().mockResolvedValue(['lider.sst@esap.edu.co']),
      getUsersByRole: jest.fn().mockResolvedValue(['user-sst-1']),
      sendEmail: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ valor: 'sst@esap.edu.co' }]),
      transaction: jest.fn().mockImplementation(async (callback) => {
        const mockManager = {
          getRepository: (entity: any) => {
            if (entity === SolicitudComisionEntity) return mockSolicitudRepo;
            if (entity === SolicitudHistorialEstadoEntity) return mockHistorialRepo;
            return null;
          },
        };
        return await callback(mockManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SstNotificationController],
      providers: [
        SstNotificationService,
        {
          provide: getRepositoryToken(SolicitudComisionEntity),
          useValue: mockSolicitudRepo,
        },
        {
          provide: getRepositoryToken(SolicitudHistorialEstadoEntity),
          useValue: mockHistorialRepo,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: NotificationClientService,
          useValue: mockNotificationClient,
        },
      ],
    }).compile();

    service = module.get<SstNotificationService>(SstNotificationService);
    controller = module.get<SstNotificationController>(SstNotificationController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Criterio 1: Despacho automático a la bandeja in-app y correos de usuarios del rol SST', () => {
    it('notifica a la bandeja in-app del rol SST, despacha correos a los usuarios del rol y marca notificado_sst como true', async () => {
      await service.handleDisbursementReady({
        solicitudId: 'sol-001',
        estadoNuevo: EstadoSolicitud.COMPROMETIDA,
        usuarioId: 'user-001',
      });

      // 1. In-App: Se notifica a la bandeja de notificaciones para los roles de SST
      expect(mockNotificationClient.notifyByRole).toHaveBeenCalledWith(
        'SST',
        expect.objectContaining({
          tipo_notificacion: 'NOTIFICACION_SST',
          titulo: expect.stringContaining('COM-2026-0150'),
          icono: 'HeartPulse',
          categoria: 'VIATICOS',
        }),
      );

      // 2. Correo: Se envían correos a los destinatarios (usuarios del rol + buzón institucional)
      expect(mockNotificationClient.sendEmail).toHaveBeenCalled();
      const sendEmailCalls = mockNotificationClient.sendEmail.mock.calls;
      const correosEnviados = sendEmailCalls.map((c: any) => c[0].to);
      expect(correosEnviados).toContain('lider.sst@esap.edu.co');
      expect(correosEnviados).toContain('sst@esap.edu.co');

      // 3. Base de Datos: Se marca notificado_sst como true
      expect(mockSolicitudRepo.update).toHaveBeenCalledWith('sol-001', {
        notificadoSst: true,
      });

      // 4. Auditoría: Se registra en el timeline del expediente
      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-001',
          comentarios: expect.stringContaining('Notificación automática despachada a Seguridad y Salud en el Trabajo (SST)'),
        }),
      );
    });

    it('no duplica el despacho si la comisión ya fue notificada previamente y forzar=false', async () => {
      mockSolicitudRepo.findOne.mockResolvedValueOnce({
        ...mockSolicitud,
        notificadoSst: true,
      });

      await service.handleDisbursementReady({
        solicitudId: 'sol-001',
        estadoNuevo: EstadoSolicitud.OBLIGADA,
      });

      // No debe despachar correos ni reescribir la BD
      expect(mockNotificationClient.notifyByRole).not.toHaveBeenCalled();
      expect(mockNotificationClient.sendEmail).not.toHaveBeenCalled();
      expect(mockSolicitudRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('Criterio 2: Registro inmutable en la trazabilidad del expediente (sin tabla local)', () => {
    it('registra en solicitudes_historial_estados el evento de auditoría formal para SST', async () => {
      await service.notificarComisionSst('sol-001', { usuarioId: 'admin-001' });

      expect(mockHistorialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-001',
          usuarioId: 'admin-001',
          comentarios: expect.stringContaining('In-App bandeja + Correo a:'),
        }),
      );
    });

    it('permite consultar el estado y la trazabilidad de SST a través del endpoint GET /api/v1/notifications/sst/:solicitudId/status', async () => {
      const res = await controller.obtenerLogsSst('sol-001');

      expect(res.success).toBe(true);
      expect(res.data).toBeDefined();
      expect(res.data.solicitudId).toBe('sol-001');
      expect(res.data.historialTrazabilidad).toHaveLength(1);
    });
  });

  describe('Criterio 3: Reintento manual exitoso en caso de contingencia', () => {
    it('permite reintentar forzadamente mediante POST /api/v1/notifications/sst/:solicitudId/resend', async () => {
      mockSolicitudRepo.findOne.mockResolvedValueOnce({
        ...mockSolicitud,
        notificadoSst: true,
      });

      const req = { user: { userId: 'tesorero-001' } };
      const res = await controller.reenviarNotificacionSst('sol-001', req as any);

      expect(res.success).toBe(true);
      expect(res.message).toContain('despachada a SST');
      expect(mockNotificationClient.notifyByRole).toHaveBeenCalled();
      expect(mockNotificationClient.sendEmail).toHaveBeenCalled();
    });

    it('lanza NotFoundException si la solicitud de comisión no existe', async () => {
      mockSolicitudRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.notificarComisionSst('sol-inexistente', { forzar: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
