import { Test, TestingModule } from '@nestjs/testing';
import { MicrosoftGraphService } from './microsoft-graph.service';

describe('MicrosoftGraphService', () => {
  let service: MicrosoftGraphService;

  beforeEach(async () => {
    process.env.AZURE_TENANT_ID = 'development-disabled';
    process.env.AZURE_CLIENT_ID = 'development-disabled';
    process.env.AZURE_CLIENT_SECRET = 'development-disabled';
    process.env.LEGAL_EMAIL_ACCOUNT = 'desarrollo.ccd@esap.edu.co';

    const module: TestingModule = await Test.createTestingModule({
      providers: [MicrosoftGraphService],
    }).compile();

    service = module.get<MicrosoftGraphService>(MicrosoftGraphService);
  });

  describe('Modo Desarrollo', () => {
    it('should throw error when credentials are disabled for development', async () => {
      // Mock environment variables
      process.env.AZURE_TENANT_ID = 'development-disabled';
      process.env.AZURE_CLIENT_ID = 'development-disabled';
      process.env.AZURE_CLIENT_SECRET = 'development-disabled';
      service = new MicrosoftGraphService();

      await expect(service.getAllEmailsWithPaging()).rejects.toThrow('Microsoft Graph is disabled in development mode');
    });

    it('should throw error when credentials are missing', async () => {
      // Mock environment variables
      process.env.AZURE_TENANT_ID = '';
      process.env.AZURE_CLIENT_ID = '';
      process.env.AZURE_CLIENT_SECRET = '';
      service = new MicrosoftGraphService();

      await expect(service.getUnreadEmails()).rejects.toThrow('Microsoft Graph is disabled in development mode');
    });

    it('should throw error when tenant ID is empty', async () => {
      // Mock environment variables
      process.env.AZURE_TENANT_ID = '';
      process.env.AZURE_CLIENT_ID = 'valid-client-id';
      process.env.AZURE_CLIENT_SECRET = 'valid-secret';
      service = new MicrosoftGraphService();

      await expect(service.getRecentEmails()).rejects.toThrow('Microsoft Graph is disabled in development mode');
    });
  });

  describe('Configuración de Variables de Entorno', () => {
    it('should use correct environment variables', () => {
      process.env.AZURE_TENANT_ID = 'test-tenant';
      process.env.AZURE_CLIENT_ID = 'test-client';
      process.env.AZURE_CLIENT_SECRET = 'test-secret';
      process.env.LEGAL_EMAIL_ACCOUNT = 'test@example.com';
      service = new MicrosoftGraphService();

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
      expect(result).toBe(true);
    });

    it('should handle testConnection in development mode', async () => {
      const result = await service.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Microsoft Graph is disabled in development mode');
    });
  });
});
