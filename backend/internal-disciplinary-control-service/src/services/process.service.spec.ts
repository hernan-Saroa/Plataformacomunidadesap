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
import { DisciplinaryProcessActuacion } from '../entities/disciplinary-process-actuacion.entity';
import { DisciplinaryProcessTask } from '../entities/disciplinary-process-task.entity';
import { DisciplinaryProcessNote } from '../entities/disciplinary-process-note.entity';
import { NewsService } from './news.service';
import { SequenceService } from './sequence.service';
import { StorageService } from './storage.service';
import { NotificationClientService } from './notification-client.service';
import { TerminosCalculatorService } from './terminos-calculator.service';
import { AlertasService } from './alertas.service';
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
          provide: getRepositoryToken(DisciplinaryProcessActuacion),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(DisciplinaryProcessTask),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(DisciplinaryProcessNote),
          useClass: Repository,
        },
        {
          provide: NewsService,
          useValue: {
            findById: jest.fn(),
            updateStatus: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SequenceService,
          useValue: {
            generateRadicadoProceso: jest.fn().mockResolvedValue('PD-2026-0001'),
            generateProcessRadicado: jest.fn().mockResolvedValue('PD-2026-0001'),
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
          },
        },
        {
          provide: TerminosCalculatorService,
          useValue: {
            calcularFechaVencimiento: jest.fn(),
            calculateVencimientoEtapa: jest.fn().mockResolvedValue({ fechaVencimiento: new Date() }),
            calculateFechaPrescripcion: jest.fn().mockResolvedValue(new Date()),
            diasHabilesRestantes: jest.fn().mockResolvedValue(10),
          },
        },
        {
          provide: AlertasService,
          useValue: {
            notificarCambioEtapa: jest.fn(),
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
    const actuacionesRepo = module.get<Repository<DisciplinaryProcessActuacion>>(getRepositoryToken(DisciplinaryProcessActuacion));
    jest.spyOn(actuacionesRepo, 'find').mockResolvedValue([]);
    const tasksRepo = module.get<Repository<DisciplinaryProcessTask>>(getRepositoryToken(DisciplinaryProcessTask));
    jest.spyOn(tasksRepo, 'find').mockResolvedValue([]);
    const notesRepo = module.get<Repository<DisciplinaryProcessNote>>(getRepositoryToken(DisciplinaryProcessNote));
    jest.spyOn(notesRepo, 'find').mockResolvedValue([]);
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
    it('should return an array of processes', async () => {
      const mockProcesses = [{ id: '1', radicadoProceso: 'PD-2026-0001' }];
      jest.spyOn(processRepository, 'find').mockResolvedValue(mockProcesses as any);

      const result = await service.findAll();
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: '1', radicadoProceso: 'PD-2026-0001' }),
        ]),
      );
    });
  });

  describe('findByAbogadoId', () => {
    it('should return processes by abogado id', async () => {
      const mockProcesses = [{ id: '1', radicadoProceso: 'PD-2026-0001' }];
      jest.spyOn(processRepository, 'find').mockResolvedValue(mockProcesses as any);

      const result = await service.findByAbogadoId('abogado-1');
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: '1', radicadoProceso: 'PD-2026-0001' }),
        ]),
      );
    });
  });

  describe('create', () => {
    it('should create a process', async () => {
      const mockNews = { id: 'news-1', estado: 'RADICADA', fechaRecepcion: new Date() };
      const mockProcess = {
        id: 'process-1',
        radicadoProceso: 'PD-2026-0001',
        fechaVencimientoEtapa: new Date(),
        abogadoAsignado: { nombreCompleto: 'Abogado Uno' },
      };
      const mockStage = { id: 'stage-2', etapa: 'VALORACION', orden: 2, activo: true };

      jest.spyOn(newsService, 'findById').mockResolvedValue(mockNews as any);
      jest.spyOn(processRepository, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockProcess as any);
      jest.spyOn(professionalRepository, 'findOne').mockResolvedValue({ id: 'prof-1' } as any);
      jest.spyOn(stageConfigurationRepository, 'findOne').mockResolvedValue(mockStage as any);
      jest.spyOn(sequenceService, 'generateProcessRadicado').mockResolvedValue('PD-2026-0001');
      jest.spyOn(processRepository, 'create').mockReturnValue(mockProcess as any);
      jest.spyOn(processRepository, 'save').mockResolvedValue(mockProcess as any);

      const result = await service.create({
        newsId: 'news-1',
        abogadoId: 'prof-1',
        abogadoNombre: 'Abogado Uno',
      } as any);

      expect(result.id).toEqual(mockProcess.id);
      expect(result.radicadoProceso).toEqual(mockProcess.radicadoProceso);
    });
  });

  describe('changeStage - Secretario/Radicador Cargos to Juzgamiento', () => {
    it('should allow Secretario/Radicador to move process from Cargos to Juzgamiento', async () => {
      const mockProcess = {
        id: 'proc-1',
        radicadoProceso: 'P-001-2026',
        etapaActual: 'CARGOS',
        estado: 'ACTIVO',
      };
      const currentStageConfig = { id: 'stage-cargos', etapa: 'CARGOS', orden: 5, activo: true };
      const targetStageConfig = { id: 'stage-juzgamiento', etapa: 'JUZGAMIENTO', orden: 6, activo: true };

      jest.spyOn(service, 'findById').mockResolvedValue(mockProcess as any);
      jest.spyOn(stageConfigurationRepository, 'findOne')
        .mockResolvedValueOnce(targetStageConfig as any)
        .mockResolvedValueOnce(currentStageConfig as any);
      jest.spyOn(processRepository, 'save').mockImplementation(async (p: any) => p);

      const result = await service.changeStage(
        'proc-1',
        'stage-juzgamiento',
        'Traslado manual',
        ['SECRETARIA_RADICADOR'],
      );

      expect(result.etapaActual).toBe('JUZGAMIENTO');
    });

    it('should reject Secretario/Radicador attempting to move from Juzgamiento to Cargos', async () => {
      const mockProcess = {
        id: 'proc-1',
        radicadoProceso: 'P-001-2026',
        etapaActual: 'JUZGAMIENTO',
        estado: 'ACTIVO',
      };
      const currentStageConfig = { id: 'stage-juzgamiento', etapa: 'JUZGAMIENTO', orden: 6, activo: true };
      const targetStageConfig = { id: 'stage-cargos', etapa: 'CARGOS', orden: 5, activo: true };

      jest.spyOn(service, 'findById').mockResolvedValue(mockProcess as any);
      jest.spyOn(stageConfigurationRepository, 'findOne')
        .mockResolvedValueOnce(targetStageConfig as any)
        .mockResolvedValueOnce(currentStageConfig as any);

      await expect(
        service.changeStage(
          'proc-1',
          'stage-cargos',
          'Intento indebido',
          ['SECRETARIA_RADICADOR'],
        ),
      ).rejects.toThrow('No está permitido el traslado desde Juzgamiento hacia Cargos');
    });

    it('should reject Secretario/Radicador attempting to move between other stages (e.g. Recepción to Valoración)', async () => {
      const mockProcess = {
        id: 'proc-1',
        radicadoProceso: 'P-001-2026',
        etapaActual: 'RECEPCION',
        estado: 'ACTIVO',
      };
      const currentStageConfig = { id: 'stage-recepcion', etapa: 'RECEPCION', orden: 1, activo: true };
      const targetStageConfig = { id: 'stage-valoracion', etapa: 'VALORACION', orden: 2, activo: true };

      jest.spyOn(service, 'findById').mockResolvedValue(mockProcess as any);
      jest.spyOn(stageConfigurationRepository, 'findOne')
        .mockResolvedValueOnce(targetStageConfig as any)
        .mockResolvedValueOnce(currentStageConfig as any);

      await expect(
        service.changeStage(
          'proc-1',
          'stage-valoracion',
          'Intento indebido',
          ['SECRETARIA_RADICADOR'],
        ),
      ).rejects.toThrow('El rol Secretario/Radicador únicamente puede realizar el traslado de procesos desde la etapa Cargos hacia Juzgamiento');
    });
  });
});