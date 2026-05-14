import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessService } from './process.service';
import { DisciplinaryProcess } from '../entities/disciplinary-process.entity';
import { DisciplinaryNews } from '../entities/disciplinary-news.entity';
import { DisciplinaryNewsProcess } from '../entities/disciplinary-news-process.entity';
import { StageConfiguration } from '../entities/stage-configuration.entity';
import { Evidence } from '../entities/evidence.entity';
import { DisciplinaryProfessional } from '../entities/disciplinary-professional.entity';
import { NewsService } from './news.service';
import { SequenceService } from './sequence.service';
import { StorageService } from './storage.service';
import { NotificationClientService } from './notification-client.service';
import { TerminosCalculatorService } from './terminos-calculator.service';
import { HttpService } from '@nestjs/axios';
import { Connection } from 'typeorm';

describe('ProcessService', () => {
  let service: ProcessService;
  let processRepository: Repository<DisciplinaryProcess>;
  let newsRepository: Repository<DisciplinaryNews>;
  let newsProcessRepository: Repository<DisciplinaryNewsProcess>;
  let stageConfigurationRepository: Repository<StageConfiguration>;
  let evidenceRepository: Repository<Evidence>;
  let professionalRepository: Repository<DisciplinaryProfessional>;
  let newsService: NewsService;
  let sequenceService: SequenceService;
  let storageService: StorageService;
  let notificationClient: NotificationClientService;
  let terminosCalculator: TerminosCalculatorService;
  let httpService: HttpService;
  let connection: Connection;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessService,
        {
          provide: getRepositoryToken(DisciplinaryProcess),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(DisciplinaryNews),
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
          provide: getRepositoryToken(Evidence),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(DisciplinaryProfessional),
          useClass: Repository,
        },
        {
          provide: NewsService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: SequenceService,
          useValue: {
            generateRadicadoProceso: jest.fn(),
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
          provide: TerminosCalculatorService,
          useValue: {
            calcularFechaVencimiento: jest.fn(),
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

    service = module.get<ProcessService>(ProcessService);
    processRepository = module.get<Repository<DisciplinaryProcess>>(getRepositoryToken(DisciplinaryProcess));
    newsRepository = module.get<Repository<DisciplinaryNews>>(getRepositoryToken(DisciplinaryNews));
    newsProcessRepository = module.get<Repository<DisciplinaryNewsProcess>>(getRepositoryToken(DisciplinaryNewsProcess));
    stageConfigurationRepository = module.get<Repository<StageConfiguration>>(getRepositoryToken(StageConfiguration));
    evidenceRepository = module.get<Repository<Evidence>>(getRepositoryToken(Evidence));
    professionalRepository = module.get<Repository<DisciplinaryProfessional>>(getRepositoryToken(DisciplinaryProfessional));
    newsService = module.get<NewsService>(NewsService);
    sequenceService = module.get<SequenceService>(SequenceService);
    storageService = module.get<StorageService>(StorageService);
    notificationClient = module.get<NotificationClientService>(NotificationClientService);
    terminosCalculator = module.get<TerminosCalculatorService>(TerminosCalculatorService);
    httpService = module.get<HttpService>(HttpService);
    connection = module.get<Connection>(Connection);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all processes', async () => {
      const mockProcesses = [{ id: '1', radicadoProceso: 'PD-2026-0001' }];
      jest.spyOn(processRepository, 'find').mockResolvedValue(mockProcesses as any);

      const result = await service.findAll();
      expect(result).toEqual(mockProcesses);
    });
  });

  describe('findByAbogadoId', () => {
    it('should return processes by abogado id', async () => {
      const mockProcesses = [{ id: '1', radicadoProceso: 'PD-2026-0001' }];
      jest.spyOn(processRepository, 'find').mockResolvedValue(mockProcesses as any);

      const result = await service.findByAbogadoId('abogado-1');
      expect(result).toEqual(mockProcesses);
    });
  });

  describe('create', () => {
    it('should create a process', async () => {
      const mockNews = { id: 'news-1', estado: 'RADICADA' };
      const mockProcess = { id: 'process-1', radicadoProceso: 'PD-2026-0001' };
      jest.spyOn(newsService, 'findById').mockResolvedValue(mockNews as any);
      jest.spyOn(processRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue({ id: 'prof-1' } as any);
      jest.spyOn(sequenceService, 'generateRadicadoProceso').mockResolvedValue('PD-2026-0001');
      jest.spyOn(processRepository, 'create').mockReturnValue(mockProcess as any);
      jest.spyOn(processRepository, 'save').mockResolvedValue(mockProcess as any);

      const result = await service.create({
        newsId: 'news-1',
        abogadoId: 'prof-1',
        abogadoNombre: 'Abogado Uno',
      } as any);

      expect(result).toEqual(mockProcess);
    });
  });
});