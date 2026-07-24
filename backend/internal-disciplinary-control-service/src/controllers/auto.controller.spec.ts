import { Test, TestingModule } from '@nestjs/testing';
import { AutoController } from './auto.controller';
import { AutoService } from '../services/auto.service';
import { OnlyOfficeService } from '../services/onlyoffice.service';
import { LegalAuto, AutoStatus } from '../entities/legal-auto.entity';
import { CreateLegalAutoDto } from '../dtos/create-legal-auto.dto';
import { ReviewAutoDto } from '../dtos/review-auto.dto';
import { RegisterNotificationDto } from '../dtos/register-notification.dto';

describe('AutoController', () => {
  let controller: AutoController;
  let service: AutoService;

  const mockAutoService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByProcessId: jest.fn(),
    update: jest.fn(),
    sendToReview: jest.fn(),
    approve: jest.fn(),
    sign: jest.fn(),
    registerNotification: jest.fn(),
    getVersions: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutoController],
      providers: [
        {
          provide: AutoService,
          useValue: mockAutoService,
        },
        {
          provide: OnlyOfficeService,
          useValue: { generateConfig: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<AutoController>(AutoController);
    service = module.get<AutoService>(AutoService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new auto', async () => {
      const createAutoDto: CreateLegalAutoDto = {
        processId: 'process-123',
        tipoAuto: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenidoHtml: '<p>Contenido</p>',
      };

      const mockAuto: LegalAuto = {
        id: 'auto-123',
        tipo: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenido: '<p>Contenido</p>',
        estado: AutoStatus.BORRADOR,
        processId: 'process-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAutoService.create.mockResolvedValue(mockAuto);

      const result = await controller.create(createAutoDto);

      expect(mockAutoService.create).toHaveBeenCalledWith(createAutoDto);
      expect(result).toEqual(mockAuto);
    });
  });

  describe('findAll', () => {
    it('should return all autos with mapped response', async () => {
      const mockAutos: LegalAuto[] = [
        {
          id: 'auto-123',
          tipo: 'AUTO_APERTURA',
          numero: 'AUTO-001',
          contenido: 'Contenido',
          estado: AutoStatus.BORRADOR,
          processId: 'process-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          currentVersion: 1,
        },
      ];

      mockAutoService.findAll.mockResolvedValue(mockAutos);

      const result = await controller.findAll();

      expect(mockAutoService.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('versiones');
      expect(result[0]).toHaveProperty('metadatos');
    });
  });

  describe('findByProcess', () => {
    it('should return autos by process id', async () => {
      const mockAutos = [{ id: 'auto-123', processId: 'process-123' }];
      mockAutoService.findByProcessId.mockResolvedValue(mockAutos);

      const result = await controller.findByProcess('process-123');

      expect(mockAutoService.findByProcessId).toHaveBeenCalledWith('process-123');
      expect(result).toEqual(mockAutos);
    });
  });

  describe('update', () => {
    it('should update an auto', async () => {
      const updateData = { numero: 'AUTO-002', comentarios: 'Updated' };
      const mockAuto: LegalAuto = {
        id: 'auto-123',
        tipo: 'AUTO_APERTURA',
        numero: 'AUTO-002',
        contenido: 'Contenido',
        estado: AutoStatus.BORRADOR,
        processId: 'process-123',
        comentarios: 'Updated',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAutoService.update.mockResolvedValue(mockAuto);

      const result = await controller.update('auto-123', updateData);

      expect(mockAutoService.update).toHaveBeenCalledWith('auto-123', updateData);
      expect(result).toEqual(mockAuto);
    });
  });

  describe('sendToReview', () => {
    it('should send auto to review', async () => {
      const mockAuto: LegalAuto = {
        id: 'auto-123',
        estado: AutoStatus.REVISION_JEFE,
        tipo: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenido: 'Contenido',
        processId: 'process-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAutoService.sendToReview.mockResolvedValue(mockAuto);

      const result = await controller.sendToReview('auto-123');

      expect(mockAutoService.sendToReview).toHaveBeenCalledWith('auto-123');
      expect(result).toEqual(mockAuto);
    });
  });

  describe('approve', () => {
    it('should approve auto', async () => {
      const reviewAutoDto: ReviewAutoDto = { action: 'APPROVE' };
      const mockAuto: LegalAuto = {
        id: 'auto-123',
        estado: AutoStatus.APROBADO,
        tipo: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenido: 'Contenido',
        processId: 'process-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAutoService.approve.mockResolvedValue(mockAuto);

      const req: any = { user: { userId: 'user-123', name: 'Jefe De Prueba' } };
      const result = await controller.approve('auto-123', reviewAutoDto, 'user-123', req);

      expect(mockAutoService.approve).toHaveBeenCalledWith('auto-123', reviewAutoDto, 'user-123', 'Jefe De Prueba');
      expect(result).toEqual(mockAuto);
    });

    it('should throw error when aprobadoPorId is missing', async () => {
      const reviewAutoDto: ReviewAutoDto = { action: 'APPROVE' };

      await expect(controller.approve('auto-123', reviewAutoDto, '', undefined as any)).rejects.toThrow('aprobadoPorId es requerido');
    });
  });

  describe('sign', () => {
    it('should sign auto', async () => {
      const mockAuto: LegalAuto = {
        id: 'auto-123',
        estado: AutoStatus.FIRMADO,
        tipo: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenido: 'Contenido',
        processId: 'process-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAutoService.sign.mockResolvedValue(mockAuto);

      const result = await controller.sign('auto-123', 'user-123');

      expect(mockAutoService.sign).toHaveBeenCalledWith('auto-123', 'user-123');
      expect(result).toEqual(mockAuto);
    });

    it('should throw error when userId is missing', async () => {
      await expect(controller.sign('auto-123', '')).rejects.toThrow('UserId requerido para firma');
    });
  });

  describe('notify', () => {
    it('should register notification', async () => {
      const registerNotificationDto: RegisterNotificationDto = {
        notificationDate: '2024-01-15',
        notificationEvidence: 'evidence-url',
      };

      const mockAuto: LegalAuto = {
        id: 'auto-123',
        estado: AutoStatus.NOTIFICADO,
        tipo: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenido: 'Contenido',
        processId: 'process-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAutoService.registerNotification.mockResolvedValue(mockAuto);

      const result = await controller.notify('auto-123', registerNotificationDto);

      expect(mockAutoService.registerNotification).toHaveBeenCalledWith('auto-123', registerNotificationDto);
      expect(result).toEqual(mockAuto);
    });
  });

  describe('getVersions', () => {
    it('should return versions', async () => {
      const mockVersions = [{ id: 'version-1', versionNumber: 1 }];
      mockAutoService.getVersions.mockResolvedValue(mockVersions);

      const result = await controller.getVersions('auto-123');

      expect(mockAutoService.getVersions).toHaveBeenCalledWith('auto-123');
      expect(result).toEqual(mockVersions);
    });
  });

  describe('delete', () => {
    it('should delete auto', async () => {
      mockAutoService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('auto-123');

      expect(mockAutoService.delete).toHaveBeenCalledWith('auto-123');
      expect(result).toBeUndefined();
    });
  });

  describe('mapAutoResponse', () => {
    it('should map auto response correctly', () => {
      const mockAuto: LegalAuto = {
        id: 'auto-123',
        tipo: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenido: 'Contenido de prueba',
        estado: AutoStatus.BORRADOR,
        processId: 'process-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        currentVersion: 1,
        documentSize: 1024,
      };

      const result = (controller as any).mapAutoResponse(mockAuto);

      expect(result).toHaveProperty('versiones');
      expect(result).toHaveProperty('metadatos');
      expect(result.versiones).toHaveLength(1);
      expect(result.metadatos.firmado).toBe(false);
      expect(result.metadatos.esAutoDigital).toBe(true);
    });
  });
});
