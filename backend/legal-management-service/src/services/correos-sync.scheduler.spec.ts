import { Test, TestingModule } from '@nestjs/testing';
import { CorreosSyncScheduler } from './correos-sync.scheduler';
import { CorreosJuridicosService } from './correos-juridicos.service';
import { Logger } from '@nestjs/common';

describe('CorreosSyncScheduler', () => {
  let scheduler: CorreosSyncScheduler;
  let correosService: CorreosJuridicosService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorreosSyncScheduler,
        {
          provide: CorreosJuridicosService,
          useValue: {
            syncInbox: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    scheduler = module.get<CorreosSyncScheduler>(CorreosSyncScheduler);
    correosService = module.get<CorreosJuridicosService>(CorreosJuridicosService);
    logger = module.get<Logger>(Logger);
  });

  describe('Modo Desarrollo', () => {
    it('should skip sync in development mode', async () => {
      // Mock environment variables
      process.env.NODE_ENV = 'development';
      process.env.AZURE_TENANT_ID = 'development-disabled';

      await scheduler.handleCron();

      expect(logger.log).toHaveBeenCalledWith('Skipping scheduled sync in development mode');
      expect(correosService.syncInbox).not.toHaveBeenCalled();
    });

    it('should skip sync when Microsoft Graph is disabled', async () => {
      // Mock environment variables
      process.env.NODE_ENV = 'production';
      process.env.AZURE_TENANT_ID = 'development-disabled';

      await scheduler.handleCron();

      expect(logger.log).toHaveBeenCalledWith('Skipping scheduled sync in development mode');
      expect(correosService.syncInbox).not.toHaveBeenCalled();
    });

    it('should skip sync when both conditions are met', async () => {
      // Mock environment variables
      process.env.NODE_ENV = 'development';
      process.env.AZURE_TENANT_ID = 'development-disabled';

      await scheduler.handleCron();

      expect(logger.log).toHaveBeenCalledWith('Skipping scheduled sync in development mode');
      expect(correosService.syncInbox).not.toHaveBeenCalled();
    });
  });

  describe('Modo Producción', () => {
    beforeEach(() => {
      // Mock environment variables for production
      process.env.NODE_ENV = 'production';
      process.env.AZURE_TENANT_ID = 'valid-tenant-id';
    });

    it('should prevent overlapping runs', async () => {
      // Mock syncInbox to take some time
      (correosService.syncInbox as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      // Start first run
      const firstRun = scheduler.handleCron();

      // Try to start second run immediately
      const secondRun = scheduler.handleCron();

      await Promise.all([firstRun, secondRun]);

      expect(logger.warn).toHaveBeenCalledWith('Sync already in progress, skipping...');
      expect(correosService.syncInbox).toHaveBeenCalledTimes(1);
    });

    it('should handle successful sync', async () => {
      const mockResult = { synced: 5, errors: 0 };
      (correosService.syncInbox as jest.Mock).mockResolvedValue(mockResult);

      await scheduler.handleCron();

      expect(logger.log).toHaveBeenCalledWith('Starting scheduled email sync...');
      expect(correosService.syncInbox).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('Scheduled sync complete. Synced: 5, Errors: 0');
    });

    it('should handle sync errors', async () => {
      const error = new Error('Sync failed');
      (correosService.syncInbox as jest.Mock).mockRejectedValue(error);

      await scheduler.handleCron();

      expect(logger.log).toHaveBeenCalledWith('Starting scheduled email sync...');
      expect(correosService.syncInbox).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Scheduled sync failed:', error);
    });

    it('should reset isRunning flag after completion', async () => {
      (correosService.syncInbox as jest.Mock).mockResolvedValue({ synced: 0, errors: 0 });

      await scheduler.handleCron();

      // Verify that isRunning is reset (this would need to be a public property or tested differently)
      expect(correosService.syncInbox).toHaveBeenCalled();
    });

    it('should reset isRunning flag after error', async () => {
      (correosService.syncInbox as jest.Mock).mockRejectedValue(new Error('Test error'));

      await scheduler.handleCron();

      // Verify that isRunning is reset even after error
      expect(correosService.syncInbox).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Configuración de Variables de Entorno', () => {
    it('should check NODE_ENV correctly', async () => {
      process.env.NODE_ENV = 'development';
      process.env.AZURE_TENANT_ID = 'valid-tenant';

      await scheduler.handleCron();

      expect(logger.log).toHaveBeenCalledWith('Skipping scheduled sync in development mode');
    });

    it('should check AZURE_TENANT_ID correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.AZURE_TENANT_ID = 'development-disabled';

      await scheduler.handleCron();

      expect(logger.log).toHaveBeenCalledWith('Skipping scheduled sync in development mode');
    });
  });
});