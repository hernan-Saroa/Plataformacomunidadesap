import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { JuridicaEmailService } from './juridica-email.service';
import { StorageService } from './storage.service';

describe('JuridicaEmailService', () => {
  let service: JuridicaEmailService;
  let mockHttpService: any;
  let mockStorageService: any;

  beforeEach(async () => {
    mockHttpService = {
      post: jest.fn().mockReturnValue(of({ data: { success: true } })),
      get: jest.fn().mockReturnValue(of({ data: Buffer.from('test-file'), headers: {} })),
    };

    mockStorageService = {
      getFullPath: jest.fn().mockReturnValue('/uploads/test.pdf'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JuridicaEmailService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<JuridicaEmailService>(JuridicaEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('notificarTransferenciaAModuloLegal', () => {
    it('debe enviar la transferencia a legal-management-service con el payload correcto', async () => {
      const datosConsolidados = {
        radicado: 'RAD-2026-001',
        etapaAlCierre: 'JUZGAMIENTO',
        profesionalResponsable: 'Dr. Perez',
        enviadoPorNombre: 'Jefe Disciplinario',
        enviadoPorEmail: 'jefe@esap.edu.co',
      };

      const evidencias = [
        {
          id: 'ev-1',
          nombreDocumento: 'Evidencia1.pdf',
          archivoUrl: 'uploads/expedientes/2026/Evidencia1.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
        },
      ];

      const autos = [
        {
          id: 'auto-1',
          tipo: 'PLIEGO_CARGOS',
          numero: '001',
          firmaUrl: 'uploads/expedientes/2026/AutoPliego.pdf',
          documentName: 'AutoPliego.pdf',
          documentType: 'application/pdf',
        },
      ];

      const adjuntosNoticia = [
        { id: 'noticia-doc-1', nombre: 'QuejaInicial.pdf', url: 'uploads/QuejaInicial.pdf' },
      ];

      const result = await service.notificarTransferenciaAModuloLegal(
        'proc-123',
        datosConsolidados,
        evidencias,
        autos,
        adjuntosNoticia,
        [],
      );

      expect(result).toBe(true);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/correos/transferencia-disciplinario'),
        expect.objectContaining({
          processId: 'proc-123',
          radicado: 'RAD-2026-001',
          documentos: expect.arrayContaining([
            expect.objectContaining({ nombre: 'Evidencia1.pdf', tipo: 'EVIDENCIA' }),
            expect.objectContaining({ nombre: 'AutoPliego.pdf', tipo: 'AUTO' }),
            expect.objectContaining({ nombre: 'QuejaInicial.pdf', tipo: 'NOTICIA' }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it('no debe lanzar si legal-management-service no responde (manejo resiliente)', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('Connection refused')));

      const result = await service.notificarTransferenciaAModuloLegal(
        'proc-123',
        { radicado: 'RAD-2026-001' },
        [],
        [],
        [],
        [],
      );

      expect(result).toBe(false);
    });
  });
});
