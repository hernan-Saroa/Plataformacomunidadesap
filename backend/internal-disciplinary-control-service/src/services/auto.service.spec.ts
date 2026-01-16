import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoService } from './auto.service';
import { LegalAuto, AutoStatus } from '../entities/legal-auto.entity';
import { AutoVersion } from '../entities/auto-version.entity';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { ProcessService } from './process.service';
import { AlertasService } from './alertas.service';

describe('AutoService', () => {
  let service: AutoService;
  let autoRepository: Repository<LegalAuto>;
  let versionRepository: Repository<AutoVersion>;
  let configRepository: Repository<SystemConfiguration>;
  let processService: ProcessService;
  let alertasService: AlertasService;

  const mockAutoRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockVersionRepository = {
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockConfigRepository = {
    findOne: jest.fn(),
  };

  const mockProcessService = {
    findById: jest.fn(),
  };

  const mockAlertasService = {
    crearNotificacionAuto: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutoService,
        {
          provide: getRepositoryToken(LegalAuto),
          useValue: mockAutoRepository,
        },
        {
          provide: getRepositoryToken(AutoVersion),
          useValue: mockVersionRepository,
        },
        {
          provide: getRepositoryToken(SystemConfiguration),
          useValue: mockConfigRepository,
        },
        {
          provide: ProcessService,
          useValue: mockProcessService,
        },
        {
          provide: AlertasService,
          useValue: mockAlertasService,
        },
      ],
    }).compile();

    service = module.get<AutoService>(AutoService);
    autoRepository = module.get<Repository<LegalAuto>>(getRepositoryToken(LegalAuto));
    versionRepository = module.get<Repository<AutoVersion>>(getRepositoryToken(AutoVersion));
    configRepository = module.get<Repository<SystemConfiguration>>(getRepositoryToken(SystemConfiguration));
    processService = module.get<ProcessService>(ProcessService);
    alertasService = module.get<AlertasService>(AlertasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new auto successfully', async () => {
      const createAutoDto = {
        processId: 'process-123',
        tipoAuto: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenidoHtml: '<p>Contenido del auto</p>',
        comentarios: 'Comentarios del auto',
      };

      const mockProcess = { id: 'process-123' };
      const mockAuto = {
        id: 'auto-123',
        ...createAutoDto,
        estado: AutoStatus.BORRADOR,
        process: mockProcess,
      };

      mockProcessService.findById.mockResolvedValue(mockProcess);
      mockAutoRepository.create.mockReturnValue(mockAuto);
      mockAutoRepository.save.mockResolvedValue(mockAuto);

      const result = await service.create(createAutoDto);

      expect(mockProcessService.findById).toHaveBeenCalledWith('process-123', false);
      expect(mockAutoRepository.create).toHaveBeenCalledWith({
        tipo: 'AUTO_APERTURA',
        numero: 'AUTO-001',
        contenido: '<p>Contenido del auto</p>',
        process: { id: 'process-123' },
        estado: AutoStatus.BORRADOR,
        documentUrl: undefined,
        documentName: undefined,
        documentType: undefined,
        documentSize: undefined,
        comentarios: 'Comentarios del auto',
      });
      expect(mockAutoRepository.save).toHaveBeenCalledWith(mockAuto);
      expect(result).toEqual(mockAuto);
    });

    it('should throw HttpException when process does not exist', async () => {
      const createAutoDto = {
        processId: 'invalid-process',
        tipoAuto: 'AUTO_APERTURA',
        numero: 'AUTO-001',
      };

      mockProcessService.findById.mockRejectedValue(new Error('Process not found'));

      await expect(service.create(createAutoDto)).rejects.toThrow();
    });
  });

  describe('findById', () => {
    it('should return auto when found', async () => {
      const mockAuto = { id: 'auto-123', tipo: 'AUTO_APERTURA' };
      mockAutoRepository.findOne.mockResolvedValue(mockAuto);

      const result = await service.findById('auto-123');

      expect(mockAutoRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'auto-123' },
        relations: ['process', 'versions'],
      });
      expect(result).toEqual(mockAuto);
    });

    it('should throw HttpException when auto not found', async () => {
      mockAutoRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('invalid-id')).rejects.toThrow('Auto no encontrado');
    });
  });

  describe('sendToReview', () => {
    it('should send auto to review successfully', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.BORRADOR,
        process: { id: 'process-123' },
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockAutoRepository.save.mockResolvedValue({ ...mockAuto, estado: AutoStatus.REVISION_JEFE });

      const result = await service.sendToReview('auto-123');

      expect(mockAutoRepository.save).toHaveBeenCalledWith({
        ...mockAuto,
        estado: AutoStatus.REVISION_JEFE,
      });
      expect(result.estado).toBe(AutoStatus.REVISION_JEFE);
    });

    it('should throw error when auto is not in BORRADOR state', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.REVISION_JEFE,
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);

      await expect(service.sendToReview('auto-123')).rejects.toThrow(
        'Solo se pueden enviar borradores a revisión'
      );
    });
  });

  describe('approve', () => {
    it('should approve auto successfully', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.REVISION_JEFE,
        process: { id: 'process-123' },
        currentVersion: 1,
      };

      const reviewAutoDto = { action: 'APPROVE' };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockConfigRepository.findOne.mockResolvedValue({ securitySettings: { auditEnabled: true } });
      mockVersionRepository.save.mockResolvedValue({});
      mockAutoRepository.save.mockResolvedValue({ ...mockAuto, estado: AutoStatus.APROBADO });

      const result = await service.approve('auto-123', reviewAutoDto, 'user-123');

      expect(result.estado).toBe(AutoStatus.APROBADO);
      expect(mockVersionRepository.save).toHaveBeenCalled();
    });

    it('should return auto when action is RETURN', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.REVISION_JEFE,
        process: { id: 'process-123' },
      };

      const reviewAutoDto = {
        action: 'RETURN',
        observaciones: 'Necesita correcciones',
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockVersionRepository.save.mockResolvedValue({});
      mockAutoRepository.save.mockResolvedValue({
        ...mockAuto,
        estado: AutoStatus.DEVUELTO,
        rejection_comments: 'Necesita correcciones',
      });

      const result = await service.approve('auto-123', reviewAutoDto, 'user-123');

      expect(result.estado).toBe(AutoStatus.DEVUELTO);
      expect(result.rejection_comments).toBe('Necesita correcciones');
    });
  });

  describe('sign', () => {
    it('should sign auto successfully', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.APROBADO,
        process: { id: 'process-123' },
        currentVersion: 1,
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockVersionRepository.save.mockResolvedValue({});
      mockAutoRepository.save.mockResolvedValue({
        ...mockAuto,
        estado: AutoStatus.FIRMADO,
        firmaUrl: 'mock-signature-url',
      });

      const result = await service.sign('auto-123', 'user-123');

      expect(result.estado).toBe(AutoStatus.FIRMADO);
      expect(result.firmaUrl).toBeDefined();
      expect(mockVersionRepository.save).toHaveBeenCalled();
    });

    it('should throw error when auto is not approved', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.BORRADOR,
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);

      await expect(service.sign('auto-123', 'user-123')).rejects.toThrow(
        'Solo se pueden firmar autos que estén aprobados'
      );
    });
  });

  describe('registerNotification', () => {
    it('should register notification successfully', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.FIRMADO,
        process: { id: 'process-123' },
        currentVersion: 1,
      };

      const dto = {
        notificationDate: '2024-01-15',
        notificationEvidence: 'evidence-url',
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockVersionRepository.save.mockResolvedValue({});
      mockAlertasService.crearNotificacionAuto.mockResolvedValue({});
      mockAutoRepository.save.mockResolvedValue({
        ...mockAuto,
        estado: AutoStatus.NOTIFICADO,
        notificationDate: new Date('2024-01-15'),
        notificationEvidence: 'evidence-url',
      });

      const result = await service.registerNotification('auto-123', dto);

      expect(result.estado).toBe(AutoStatus.NOTIFICADO);
      expect(result.notificationDate).toEqual(new Date('2024-01-15'));
      expect(mockAlertasService.crearNotificacionAuto).toHaveBeenCalled();
    });

    it('should throw error when auto is not signed', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.APROBADO,
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);

      await expect(service.registerNotification('auto-123', {
        notificationDate: '2024-01-15'
      })).rejects.toThrow(
        'Solo se pueden notificar autos que ya han sido firmados'
      );
    });
  });

  describe('delete', () => {
    it('should delete auto successfully', async () => {
      const mockAuto = { id: 'auto-123' };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockAutoRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete('auto-123');

      expect(mockAutoRepository.delete).toHaveBeenCalledWith('auto-123');
    });
  });
});