import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutoService } from './auto.service';
import { LegalAuto, AutoStatus } from '../entities/legal-auto.entity';
import { AutoVersion } from '../entities/auto-version.entity';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { ProcessService } from './process.service';
import { AlertasService } from './alertas.service';
import { PdfModifierService } from './pdf-modifier.service';
import { SequenceService } from './sequence.service';
import { DocumentConversionService } from './document-conversion.service';
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';

describe('AutoService', () => {
  let service: AutoService;
  let autoRepository: Repository<LegalAuto>;
  let versionRepository: Repository<AutoVersion>;

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

  const mockActuacionesRepository = {
    save: jest.fn(),
  };

  const mockProcessService = {
    findById: jest.fn(),
    changeStageByAutoApertura: jest.fn(),
    updateStatus: jest.fn(),
    processRepository: {
      save: jest.fn(),
    },
  };

  const mockAlertasService = {
    crearNotificacionAuto: jest.fn(),
  };

  const mockPdfModifierService = {
    addConsecutive: jest.fn(),
    addSignature: jest.fn(),
  };

  const mockSequenceService = {
    generateAutoConsecutivo: jest.fn().mockResolvedValue('AUTO-00042'),
  };

  const mockDocumentConversionService = {
    convertWordToPdf: jest.fn(),
    getFileSize: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

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
          provide: getRepositoryToken(DisciplinaryProcessActuacion),
          useValue: mockActuacionesRepository,
        },
        {
          provide: ProcessService,
          useValue: mockProcessService,
        },
        {
          provide: AlertasService,
          useValue: mockAlertasService,
        },
        {
          provide: PdfModifierService,
          useValue: mockPdfModifierService,
        },
        {
          provide: SequenceService,
          useValue: mockSequenceService,
        },
        {
          provide: DocumentConversionService,
          useValue: mockDocumentConversionService,
        },
      ],
    }).compile();

    service = module.get<AutoService>(AutoService);
    autoRepository = module.get<Repository<LegalAuto>>(
      getRepositoryToken(LegalAuto),
    );
    versionRepository = module.get<Repository<AutoVersion>>(
      getRepositoryToken(AutoVersion),
    );
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

      const mockAuto = {
        id: 'auto-123',
        ...createAutoDto,
        estado: AutoStatus.BORRADOR,
        process: { id: 'process-123' },
      };

      mockProcessService.findById.mockResolvedValue({ id: 'process-123' });
      mockAutoRepository.create.mockReturnValue(mockAuto);
      mockAutoRepository.save.mockResolvedValue(mockAuto);

      const result = await service.create(createAutoDto as any);

      expect(mockProcessService.findById).toHaveBeenCalledWith(
        'process-123',
        false,
      );
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
        etapaDestino: undefined,
      });
      expect(result).toEqual(mockAuto);
    });
  });

  describe('approve', () => {
    it('should approve auto and assign global number', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.REVISION_JEFE,
        processId: 'process-123',
        process: { id: 'process-123', etapaActual: 'VALORACION' },
        currentVersion: 1,
        contenido: '<p>Contenido</p>',
        tipo: 'AUTO_APERTURA',
        documentUrl: null,
        documentName: null,
        documentType: null,
        documentSize: null,
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockConfigRepository.findOne.mockResolvedValue({
        securitySettings: { auditEnabled: true },
      });
      mockAutoRepository.save.mockResolvedValue({
        ...mockAuto,
        estado: AutoStatus.APROBADO,
        numero: 'AUTO-00042',
      });

      const result = await service.approve(
        'auto-123',
        { action: 'APPROVE' } as any,
        'user-123',
      );

      expect(mockSequenceService.generateAutoConsecutivo).toHaveBeenCalled();
      expect(result.estado).toBe(AutoStatus.APROBADO);
      expect(result.numero).toBe('AUTO-00042');
      expect(versionRepository.save).toHaveBeenCalled();
    });

    it('should not move process stage when approving an apertura auto', async () => {
      const mockAuto = {
        id: 'auto-apertura-123',
        estado: AutoStatus.REVISION_JEFE,
        processId: 'process-123',
        process: { id: 'process-123', etapaActual: 'VALORACION' },
        currentVersion: 1,
        contenido: '<p>Contenido</p>',
        tipo: 'AUTO_APERTURA_INVESTIGACION',
        etapaDestino: 'INVESTIGACION',
        documentUrl: null,
        documentName: null,
        documentType: null,
        documentSize: null,
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockConfigRepository.findOne.mockResolvedValue({
        securitySettings: { auditEnabled: false },
      });
      mockAutoRepository.save.mockResolvedValue({
        ...mockAuto,
        estado: AutoStatus.APROBADO,
        numero: 'AUTO-00042',
      });

      await service.approve(
        'auto-apertura-123',
        { action: 'APPROVE' } as any,
        'user-123',
      );

      expect(mockProcessService.changeStageByAutoApertura).not.toHaveBeenCalled();
      expect(mockActuacionesRepository.save).not.toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'CAMBIO_ETAPA' }),
      );
    });

    it('should convert docx to pdf when approving', async () => {
      const mockAuto = {
        id: 'auto-456',
        estado: AutoStatus.REVISION_JEFE,
        processId: 'process-123',
        process: { id: 'process-123', etapaActual: 'VALORACION' },
        currentVersion: 1,
        contenido: '<p>Contenido</p>',
        tipo: 'AUTO_ARCHIVO',
        documentUrl: '/files/original.docx',
        documentName: 'original.docx',
        documentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        documentSize: 128,
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockConfigRepository.findOne.mockResolvedValue({
        securitySettings: { auditEnabled: false },
      });
      mockDocumentConversionService.convertWordToPdf.mockResolvedValue({
        documentUrl: '/files/AUTO-00042.pdf',
        documentName: 'AUTO-00042.pdf',
        documentType: 'application/pdf',
        documentSize: 2048,
      });
      mockAutoRepository.save.mockResolvedValue({
        ...mockAuto,
        estado: AutoStatus.APROBADO,
        numero: 'AUTO-00042',
        documentUrl: '/files/AUTO-00042.pdf',
        documentName: 'AUTO-00042.pdf',
        documentType: 'application/pdf',
        documentSize: 2048,
      });

      const result = await service.approve(
        'auto-456',
        { action: 'APPROVE' } as any,
        'user-123',
      );

      expect(
        mockDocumentConversionService.convertWordToPdf,
      ).toHaveBeenCalledWith('/files/original.docx', 'AUTO-00042.pdf', [
        { marker: '[Consecutivo_Auto]', value: 'AUTO-00042' },
        { marker: '[CONSECUTIVO_AUTO]', value: 'AUTO-00042' },
        { marker: '[consecutivo_auto]', value: 'AUTO-00042' },
      ]);
      expect(mockPdfModifierService.addConsecutive).toHaveBeenCalledWith(
        '/files/AUTO-00042.pdf',
        'AUTO-00042',
      );
      expect(result.documentType).toBe('application/pdf');
    });

    it('should not stamp consecutive on pdf when docx placeholder was replaced', async () => {
      const mockAuto = {
        id: 'auto-789',
        estado: AutoStatus.REVISION_JEFE,
        processId: 'process-123',
        process: { id: 'process-123', etapaActual: 'VALORACION' },
        currentVersion: 1,
        contenido: '<p>Contenido</p>',
        tipo: 'AUTO_ARCHIVO',
        documentUrl: '/files/original.docx',
        documentName: 'original.docx',
        documentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        documentSize: 128,
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockConfigRepository.findOne.mockResolvedValue({
        securitySettings: { auditEnabled: false },
      });
      mockDocumentConversionService.convertWordToPdf.mockResolvedValue({
        documentUrl: '/files/AUTO-00042.pdf',
        documentName: 'AUTO-00042.pdf',
        documentType: 'application/pdf',
        documentSize: 2048,
        placeholdersReplaced: ['[Consecutivo_Auto]'],
      });
      mockAutoRepository.save.mockResolvedValue({
        ...mockAuto,
        estado: AutoStatus.APROBADO,
        numero: 'AUTO-00042',
        documentUrl: '/files/AUTO-00042.pdf',
        documentName: 'AUTO-00042.pdf',
        documentType: 'application/pdf',
        documentSize: 2048,
      });

      await service.approve(
        'auto-789',
        { action: 'APPROVE' } as any,
        'user-123',
      );

      expect(mockPdfModifierService.addConsecutive).not.toHaveBeenCalled();
    });
  });

  describe('sign', () => {
    it('should sign auto successfully', async () => {
      const mockAuto = {
        id: 'auto-123',
        estado: AutoStatus.APROBADO,
        processId: 'process-123',
        process: { id: 'process-123' },
        currentVersion: 1,
        contenido: '<p>Contenido</p>',
        tipo: 'AUTO_ARCHIVO',
        documentUrl: '/files/AUTO-00042.pdf',
        documentName: 'AUTO-00042.pdf',
        documentType: 'application/pdf',
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockDocumentConversionService.getFileSize.mockResolvedValue(2048);
      mockAutoRepository.save.mockResolvedValue({
        ...mockAuto,
        estado: AutoStatus.FIRMADO,
        firmaUrl: '/files/AUTO-00042.pdf',
      });

      const result = await service.sign('auto-123', 'user-123');

      expect(mockPdfModifierService.addSignature).toHaveBeenCalled();
      expect(result.estado).toBe(AutoStatus.FIRMADO);
    });
  });
});
