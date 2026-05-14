import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsService } from './news.service';
import { DisciplinaryNews } from '../entities/disciplinary-news.entity';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryNewsProcess } from '../entities/disciplinary-news-process.entity';
import { StageConfiguration } from '../entities/stage-configuration.entity';
import { SequenceService } from './sequence.service';
import { StorageService } from './storage.service';
import { NotificationClientService } from './notification-client.service';
import { HttpService } from '@nestjs/axios';
import { Connection } from 'typeorm';

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
  let connection: Connection;

  beforeEach(async () => {
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
          },
        },
        {
          provide: HttpService,
          useValue: {},
        },
        {
          provide: Connection,
          useValue: {},
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
    connection = module.get<Connection>(Connection);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all news', async () => {
      const mockNews = [{ id: '1', radicado: 'ND-2026-0001' }];
      jest.spyOn(newsRepository, 'find').mockResolvedValue(mockNews as any);

      const result = await service.findAll();
      expect(result).toEqual(mockNews);
    });
  });

  describe('findByProfessionalId', () => {
    it('should return news by professional id', async () => {
      const mockNews = [{ id: '1', radicado: 'ND-2026-0001' }];
      jest.spyOn(newsRepository, 'find').mockResolvedValue(mockNews as any);

      const result = await service.findByProfessionalId('prof-1');
      expect(result).toEqual(mockNews);
    });
  });
});