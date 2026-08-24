import { Test, TestingModule } from '@nestjs/testing';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { Request, Response } from 'express';

describe('GatewayController', () => {
  let controller: GatewayController;
  let service: GatewayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
      providers: [
        {
          provide: GatewayService,
          useValue: {
            forwardRequest: jest.fn(),
            forwardStatic: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GatewayController>(GatewayController);
    service = module.get<GatewayService>(GatewayService);
  });

  describe('proxyVersioned', () => {
    it('should call forwardRequest with correct parameters', async () => {
      const mockReq = {
        originalUrl: '/legal/api/v1/evidencias/123',
        method: 'GET',
        body: {},
        headers: {},
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;

      await controller.proxyVersioned('legal', '1', mockReq, mockRes);

      expect(service.forwardRequest).toHaveBeenCalledWith('legal', '1', mockReq, mockRes);
    });

    it('should handle versioned routes with path parameter', async () => {
      const mockReq = {
        originalUrl: '/legal/api/v2/actas/456',
        method: 'POST',
        body: {},
        headers: {},
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;

      await controller.proxyVersioned('legal', '2', mockReq, mockRes);

      expect(service.forwardRequest).toHaveBeenCalledWith('legal', '2', mockReq, mockRes);
    });
  });

  describe('proxyDefault', () => {
    it('should call forwardRequest with version 1', async () => {
      const mockReq = {
        originalUrl: '/legal/api/evidencias/123',
        method: 'GET',
        body: {},
        headers: {},
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;

      await controller.proxyDefault('legal', mockReq, mockRes);

      expect(service.forwardRequest).toHaveBeenCalledWith('legal', '1', mockReq, mockRes);
    });
  });

  describe('proxyUploads', () => {
    it('should call forwardStatic with correct parameters', async () => {
      const mockReq = {
        originalUrl: '/legal/uploads/documentos/123.pdf',
        method: 'GET',
        body: {},
        headers: {},
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      } as any;

      await controller.proxyUploads('legal', mockReq, mockRes);

      expect(service.forwardStatic).toHaveBeenCalledWith('legal', mockReq, mockRes);
    });
  });
});
