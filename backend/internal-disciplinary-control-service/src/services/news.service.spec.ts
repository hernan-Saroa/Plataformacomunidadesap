import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getConnectionToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsService } from './news.service';
import { DisciplinaryNews, NewsStatus } from '../entities/disciplinary-news.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryNewsProcess } from '../entities/disciplinary-news-process.entity';
import { StageConfiguration } from '../entities/stage-configuration.entity';
import { SequenceService } from './sequence.service';
import { StorageService } from './storage.service';
import { NotificationClientService } from './notification-client.service';
import { HttpService } from '@nestjs/axios';
import { Connection } from 'typeorm';
import { TerminosCalculatorService } from './terminos-calculator.service';
import { of } from 'rxjs';

describe('NewsService', () => {
  let service: NewsService;
  let newsRepository: Repository<DisciplinaryNews>;
  let processRepository: Repository<DisciplinaryProcess>;
  let newsProcessRepository: Repository<DisciplinaryNewsProcess>;
  let stageConfigurationRepository: Repository<StageConfiguration>;
  let sequenceService: SequenceService;
  let storageService: StorageService;
  let notificationClient: NotificationClientService;
  let httpService: HttpService;
  let connection: any;

  const mockQuery = jest.fn().mockImplementation(async (sql: string) => {
    if (sql.includes('auth.user')) {
      return [
        {
          id_user: 'radicador-1',
          username: 'radicador@esap.edu.co',
          nom_largo: 'Radicador General',
          dir_email: 'radicador@esap.edu.co',
        },
      ];
    }
    return [];
  });

  beforeEach(async () => {
    mockQuery.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: getRepositoryToken(DisciplinaryNews),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(DisciplinaryProcess),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(DisciplinaryNewsProcess),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(StageConfiguration),
          useClass: Repository,
        },
        {
          provide: SequenceService,
          useValue: {
            generateRadicado: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFiles: jest.fn(),
          },
        },
        {
          provide: NotificationClientService,
          useValue: {
            sendNotification: jest.fn(),
            send: jest.fn().mockResolvedValue(true),
            sendMany: jest.fn().mockResolvedValue(true),
            notifyByRole: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn().mockReturnValue(of({ data: { success: true } })),
          },
        },
        {
          provide: getConnectionToken(),
          useValue: {
            query: mockQuery,
          },
        },
        {
          provide: Connection,
          useValue: {
            query: mockQuery,
          },
        },
        {
          provide: TerminosCalculatorService,
          useValue: {
            calculateVencimientoEtapa: jest.fn().mockResolvedValue({ fechaVencimiento: new Date() }),
            diasHabilesRestantes: jest.fn().mockResolvedValue(5),
          },
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    newsRepository = module.get<Repository<DisciplinaryNews>>(getRepositoryToken(DisciplinaryNews));
    processRepository = module.get<Repository<DisciplinaryProcess>>(getRepositoryToken(DisciplinaryProcess));
    newsProcessRepository = module.get<Repository<DisciplinaryNewsProcess>>(getRepositoryToken(DisciplinaryNewsProcess));
    stageConfigurationRepository = module.get<Repository<StageConfiguration>>(getRepositoryToken(StageConfiguration));
    sequenceService = module.get<SequenceService>(SequenceService);
    storageService = module.get<StorageService>(StorageService);
    notificationClient = module.get<NotificationClientService>(NotificationClientService);
    httpService = module.get<HttpService>(HttpService);
    connection = module.get(getConnectionToken());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all news', async () => {
      const mockNews = [{ id: '1', radicado: 'ND-2026-0001' }];
      jest.spyOn(newsRepository, 'find').mockResolvedValue(mockNews as any);

      const result = await service.findAll();
      expect(result).toEqual([
        expect.objectContaining({ id: '1', radicado: 'ND-2026-0001' }),
      ]);
    });
  });

  describe('findByProfessionalId', () => {
    it('should return news by professional id', async () => {
      const mockNews = { id: '1', radicado: 'ND-2026-0001' };
      const mockProceso = { id: 'proc-1', abogadoAsignadoId: 'prof-1', news: mockNews };
      jest.spyOn(processRepository, 'find').mockResolvedValue([mockProceso] as any);

      const result = await service.findByProfessionalId('prof-1');
      expect(result).toEqual([mockNews]);
    });
  });

  describe('returnNews', () => {
    it('should return news, set status to DEVUELTA, and send email and in-app notifications to all radicadores', async () => {
      const mockNoticia: any = {
        id: 'news-100',
        radicado: 'ND-2026-0099',
        estado: NewsStatus.RADICADA,
        radicadorId: 'radicador-1',
        historialAuditoria: [],
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockNoticia);
      jest.spyOn(newsRepository, 'save').mockImplementation(async (n: any) => n);

      const result = await service.returnNews('news-100', {
        observaciones: 'Falta información del quejoso',
        radicadorId: 'radicador-1',
      });

      expect(result.estado).toBe(NewsStatus.DEVUELTA);
      expect(result.observaciones).toBe('Falta información del quejoso');

      // Verificación de notificación in-app enviada a los radicadores
      expect(notificationClient.sendMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id_usuario_destinatario: 'radicador-1',
            tipo_notificacion: 'NOTICIA_DEVUELTA',
          }),
        ]),
      );

      // Verificación de correo electrónico enviado a los radicadores
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/emails/send'),
        expect.objectContaining({
          to: 'radicador@esap.edu.co',
          subject: expect.stringContaining('ND-2026-0099'),
          html: expect.stringContaining('Falta información del quejoso'),
        }),
      );
    });
  });
});