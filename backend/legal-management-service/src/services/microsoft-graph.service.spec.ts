import { Test, TestingModule } from '@nestjs/testing';
import { MicrosoftGraphService } from './microsoft-graph.service';
import { Logger } from '@nestjs/common';

describe('MicrosoftGraphService', () => {
  let service: MicrosoftGraphService;
  let logger: Logger;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MicrosoftGraphService,
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

    service = module.get<MicrosoftGraphService>(MicrosoftGraphService);
    logger = module.get<Logger>(Logger);
  });

  describe('Modo Desarrollo', () => {
    it('should throw error when credentials are disabled for development', async () => {
      // Mock environment variables
      process.env.AZURE_TENANT_ID = 'development-disabled';
      process.env.AZURE_CLIENT_ID = 'development-disabled';
      process.env.AZURE_CLIENT_SECRET = 'development-disabled';

      await expect(service.getAllEmailsWithPaging()).rejects.toThrow('Microsoft Graph is disabled in development mode');
      expect(logger.warn).toHaveBeenCalledWith('Azure credentials not configured or disabled for development. Microsoft Graph features will be unavailable.');
    });

    it('should throw error when credentials are missing', async () => {
      // Mock environment variables
      process.env.AZURE_TENANT_ID = '';
      process.env.AZURE_CLIENT_ID = '';
      process.env.AZURE_CLIENT_SECRET = '';

      await expect(service.getUnreadEmails()).rejects.toThrow('Microsoft Graph is disabled in development mode');
      expect(logger.warn).toHaveBeenCalledWith('Azure credentials not configured or disabled for development. Microsoft Graph features will be unavailable.');
    });

    it('should throw error when tenant ID is empty', async () => {
      // Mock environment variables
      process.env.AZURE_TENANT_ID = '';
      process.env.AZURE_CLIENT_ID = 'valid-client-id';
      process.env.AZURE_CLIENT_SECRET = 'valid-secret';

      await expect(service.getRecentEmails()).rejects.toThrow('Microsoft Graph is disabled in development mode');
      expect(logger.warn).toHaveBeenCalledWith('Azure credentials not configured or disabled for development. Microsoft Graph features will be unavailable.');
    });
  });

  describe('Configuración de Variables de Entorno', () => {
    it('should use correct environment variables', () => {
      process.env.AZURE_TENANT_ID = 'test-tenant';
      process.env.AZURE_CLIENT_ID = 'test-client';
      process.env.AZURE_CLIENT_SECRET = 'test-secret';
      process.env.EMAIL_ACCOUNT_QA = 'test@example.com';

      // Access private properties to verify
      const tenantId = (service as any).tenantId;
      const clientId = (service as any).clientId;
      const clientSecret = (service as any).clientSecret;
      const emailAccount = (service as any).emailAccount;

      expect(tenantId).toBe('test-tenant');
      expect(clientId).toBe('test-client');
      expect(clientSecret).toBe('test-secret');
      expect(emailAccount).toBe('test@example.com');
    });
  });

  describe('Métodos de Email', () => {
    beforeEach(() => {
      // Desactivar Microsoft Graph para pruebas
      process.env.AZURE_TENANT_ID = 'development-disabled';
    });

    it('should handle getAllEmailsWithPaging in development mode', async () => {
      await expect(service.getAllEmailsWithPaging()).rejects.toThrow('Microsoft Graph is disabled in development mode');
    });

    it('should handle getUnreadEmails in development mode', async () => {
      await expect(service.getUnreadEmails()).rejects.toThrow('Microsoft Graph is disabled in development mode');
    });

    it('should handle getRecentEmails in development mode', async () => {
      await expect(service.getRecentEmails()).rejects.toThrow('Microsoft Graph is disabled in development mode');
    });

    it('should handle getEmailById in development mode', async () => {
      const result = await service.getEmailById('test-id');
      expect(result).toBeNull();
    });

    it('should handle markAsRead in development mode', async () => {
      const result = await service.markAsRead('test-id');
      expect(result).toBe(false);
    });

    it('should handle sendEmail in development mode', async () => {
      const result = await service.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Body'
      );
      expect(result).toBe(false);
    });

    it('should handle testConnection in development mode', async () => {
      const result = await service.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection failed');
    });
  });
});