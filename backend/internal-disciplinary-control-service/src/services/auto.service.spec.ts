import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { of } from 'rxjs';
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
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { JuridicaEmailService } from './juridica-email.service';
import { NotificationClientService } from './notification-client.service';
import { AutosConfigurationService } from './autos-configuration.service';
import { HttpService } from '@nestjs/axios';
import { ReviewAction } from '../dtos/review-auto.dto';

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
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    manager: {
      query: jest.fn().mockResolvedValue([]),
    },
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

  const mockProfessionalRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockNotificationClient = {
    send: jest.fn().mockResolvedValue({}),
    sendMany: jest.fn().mockResolvedValue({}),
    notifyByRole: jest.fn().mockResolvedValue({}),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn().mockReturnValue(of({ data: { success: true } })),
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
          provide: getRepositoryToken(DisciplinaryProfessional),
          useValue: mockProfessionalRepository,
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
        {
          provide: JuridicaEmailService,
          useValue: {
            recolectarAdjuntosExpediente: jest.fn().mockResolvedValue([]),
            enviarCorreoJuridica: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: NotificationClientService,
          useValue: mockNotificationClient,
        },
        {
          provide: AutosConfigurationService,
          useValue: {
            getPlantillaAuto: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
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
      expect(mockAutoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'AUTO_APERTURA',
          numero: 'AUTO-001',
          contenido: '<p>Contenido del auto</p>',
          process: { id: 'process-123' },
          estado: AutoStatus.BORRADOR,
          comentarios: 'Comentarios del auto',
        })
      );
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

      expect(mockProcessService.changeStageByAutoApertura).toHaveBeenCalled();
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
      ).toHaveBeenCalledWith(
        '/files/original.docx',
        'AUTO-00042.pdf',
        [
          { marker: '[Consecutivo_Auto]', value: 'AUTO-00042' },
          { marker: '[CONSECUTIVO_AUTO]', value: 'AUTO-00042' },
          { marker: '[consecutivo_auto]', value: 'AUTO-00042' },
        ],
        expect.any(Object)
      );
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

    it('should return auto, set status to DEVUELTO, and send internal and email notifications to involved professional', async () => {
      const mockAuto = {
        id: 'auto-return-123',
        estado: AutoStatus.REVISION_JEFE,
        processId: 'process-123',
        process: {
          id: 'process-123',
          radicadoProceso: 'D-2026-001',
          abogadoAsignadoId: 'prof-uuid-456',
        },
        currentVersion: 1,
        contenido: '<p>Contenido auto</p>',
        tipo: 'AUTO_APERTURA_INVESTIGACION',
        documentUrl: '/files/auto.docx',
        documentName: 'auto.docx',
      };

      const mockProfessional = {
        id: 'prof-uuid-456',
        idUser: 'user-auth-uuid-789',
        nombreCompleto: 'Dra. María Abogada',
        email: 'maria.abogada@esap.edu.co',
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockConfigRepository.findOne.mockResolvedValue({ securitySettings: { auditEnabled: false } });
      mockProfessionalRepository.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'prof-uuid-456') return Promise.resolve(mockProfessional);
        if (where?.id === 'jefe-user-id') {
          return Promise.resolve({
            id: 'jefe-prof-id',
            nombreCompleto: 'Dr. Carlos Jefe OCID',
            email: 'jefe@esap.edu.co',
          });
        }
        return Promise.resolve(null);
      });

      mockAutoRepository.save.mockImplementation((entity: any) =>
        Promise.resolve({ ...entity, id: entity.id || 'auto-return-123' }),
      );

      const result = await service.approve(
        'auto-return-123',
        {
          action: ReviewAction.RETURN,
          observaciones: 'Por favor corregir la motivación jurídica en el considerando tercero.',
        } as any,
        'jefe-user-id',
      );

      expect(result.estado).toBe(AutoStatus.DEVUELTO);
      expect(result.rejection_comments).toBe('Por favor corregir la motivación jurídica en el considerando tercero.');

      // Verificar notificación interna en campana (DISCIPLINARIO)
      expect(mockNotificationClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          id_usuario_destinatario: 'user-auth-uuid-789',
          tipo_notificacion: 'AUTO_DEVUELTO',
          categoria: 'DISCIPLINARIO',
          icono: 'RotateCcw',
          prioridad: 'Alta',
          mensaje: expect.stringContaining('Por favor corregir la motivación jurídica'),
        }),
      );

      // Verificar correo electrónico enviado
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/emails/send'),
        expect.objectContaining({
          to: 'maria.abogada@esap.edu.co',
          subject: expect.stringContaining('[AUTO DEVUELTO]'),
          html: expect.stringContaining('Escuela Superior de Administración Pública'.toUpperCase()),
        }),
      );
    });

    it('EFDS-1582: should include Radicador role associated with process in email and platform notifications upon return (devolución)', async () => {
      const mockAuto = {
        id: 'auto-return-radicador',
        estado: AutoStatus.REVISION_JEFE,
        processId: 'process-rad-123',
        process: {
          id: 'process-rad-123',
          radicadoProceso: 'D-2026-999',
          abogadoAsignadoId: 'prof-uuid-456',
          news: {
            id: 'news-uuid-111',
            radicadorId: 'radicador-user-uuid',
          },
        },
        currentVersion: 1,
        contenido: '<p>Contenido auto</p>',
        tipo: 'AUTO_APERTURA_INVESTIGACION',
        documentUrl: '/files/auto.docx',
        documentName: 'auto.docx',
      };

      const mockProfessional = {
        id: 'prof-uuid-456',
        idUser: 'prof-auth-uuid',
        nombreCompleto: 'Dra. María Abogada',
        email: 'maria.abogada@esap.edu.co',
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockConfigRepository.findOne.mockResolvedValue({ securitySettings: { auditEnabled: false } });
      mockProfessionalRepository.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'prof-uuid-456') return Promise.resolve(mockProfessional);
        return Promise.resolve(null);
      });

      mockAutoRepository.manager.query.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('auth.user') && params?.[0] === 'radicador-user-uuid') {
          return Promise.resolve([
            {
              id_user: 'radicador-user-uuid',
              username: 'radicador.ocid@esap.edu.co',
              nom_largo: 'Carlos Radicador OCID',
              dir_email: 'radicador.ocid@esap.edu.co',
            },
          ]);
        }
        if (sql.includes('auth.user') && params?.[0] === 'prof-uuid-456') {
          return Promise.resolve([
            {
              id_user: 'prof-auth-uuid',
              username: 'maria.abogada@esap.edu.co',
              nom_largo: 'Dra. María Abogada',
              dir_email: 'maria.abogada@esap.edu.co',
            },
          ]);
        }
        return Promise.resolve([]);
      });

      mockAutoRepository.save.mockImplementation((entity: any) =>
        Promise.resolve({ ...entity, id: entity.id || 'auto-return-radicador' }),
      );

      await service.approve(
        'auto-return-radicador',
        {
          action: ReviewAction.RETURN,
          observaciones: 'Falta informe técnico de soporte.',
        } as any,
        'jefe-user-id',
      );

      // 1. Notificación interna en plataforma al Radicador asociado
      expect(mockNotificationClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          id_usuario_destinatario: 'radicador-user-uuid',
          tipo_notificacion: 'AUTO_DEVUELTO',
          categoria: 'DISCIPLINARIO',
        }),
      );

      // 2. Correo electrónico enviado al Radicador asociado
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/emails/send'),
        expect.objectContaining({
          to: 'radicador.ocid@esap.edu.co',
          subject: expect.stringContaining('[AUTO DEVUELTO]'),
          html: expect.stringContaining('Carlos Radicador OCID'),
        }),
      );

      // 3. Correo electrónico enviado también al Profesional responsable
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/emails/send'),
        expect.objectContaining({
          to: 'maria.abogada@esap.edu.co',
          subject: expect.stringContaining('[AUTO DEVUELTO]'),
        }),
      );
    });

    it('EFDS-1582: should include Radicador role associated with process in email and platform notifications upon approval (aprobación)', async () => {
      const mockAuto = {
        id: 'auto-approve-radicador',
        estado: AutoStatus.REVISION_JEFE,
        processId: 'process-rad-123',
        process: {
          id: 'process-rad-123',
          radicadoProceso: 'D-2026-999',
          abogadoAsignadoId: 'prof-uuid-456',
          news: {
            id: 'news-uuid-111',
            radicadorId: 'radicador-user-uuid',
          },
        },
        currentVersion: 1,
        contenido: '<p>Contenido auto</p>',
        tipo: 'AUTO_ARCHIVO',
        documentUrl: '/files/auto.docx',
        documentName: 'auto.docx',
      };

      const mockProfessional = {
        id: 'prof-uuid-456',
        idUser: 'prof-auth-uuid',
        nombreCompleto: 'Dra. María Abogada',
        email: 'maria.abogada@esap.edu.co',
      };

      mockAutoRepository.findOne.mockResolvedValue(mockAuto);
      mockConfigRepository.findOne.mockResolvedValue({ securitySettings: { auditEnabled: false } });
      mockProfessionalRepository.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'prof-uuid-456') return Promise.resolve(mockProfessional);
        return Promise.resolve(null);
      });

      mockAutoRepository.manager.query.mockImplementation((sql: string, params: any[]) => {
        if (sql.includes('auth.user') && params?.[0] === 'radicador-user-uuid') {
          return Promise.resolve([
            {
              id_user: 'radicador-user-uuid',
              username: 'radicador.ocid@esap.edu.co',
              nom_largo: 'Carlos Radicador OCID',
              dir_email: 'radicador.ocid@esap.edu.co',
            },
          ]);
        }
        return Promise.resolve([]);
      });

      mockAutoRepository.save.mockImplementation((entity: any) =>
        Promise.resolve({ ...entity, id: entity.id || 'auto-approve-radicador', estado: AutoStatus.APROBADO }),
      );

      await service.approve(
        'auto-approve-radicador',
        {
          action: ReviewAction.APPROVE,
        } as any,
        'jefe-user-id',
      );

      // Notificación enviada al Radicador asociado al proceso
      expect(mockNotificationClient.sendMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id_usuario_destinatario: 'radicador-user-uuid',
            tipo_notificacion: 'NUEVO_AUTO_RADICADOR',
          }),
        ]),
      );

      // Correo electrónico enviado al Radicador asociado
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/emails/send'),
        expect.objectContaining({
          to: 'radicador.ocid@esap.edu.co',
          subject: expect.stringContaining('Auto aprobado:'),
        }),
      );
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
