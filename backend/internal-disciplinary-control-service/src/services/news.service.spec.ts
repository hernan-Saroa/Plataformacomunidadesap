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
    if (sql.includes('JEFE') || sql.includes('es_jefe_ocid')) {
      return [
        {
          id_user: 'jefe-1',
          username: 'jefe.ocid@esap.edu.co',
          nom_largo: 'Jefe OCID',
          dir_email: 'jefe.ocid@esap.edu.co',
        },
      ];
    }
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
            generateNewsRadicado: jest.fn().mockResolvedValue('ND-2026-0001'),
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
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });
  });

  describe('create', () => {
    it('should create news and send email and in-app notifications to Jefe OCID', async () => {
      const mockDto: any = {
        hechos: 'Presunta falta disciplinaria en contratación',
        territorial: 'Sede Central',
        dependenciaDenunciado: 'Secretaría General',
        disciplinable: { nombre: 'Funcionario Investigado', cedula: '12345678' },
        denunciante: { nombre: 'Ciudadano Quejoso', cedula: '87654321' },
      };

      const mockSavedNoticia: any = {
        id: 'news-new-1',
        radicado: 'ND-2026-0001',
        estado: 'RADICADA',
        fechaRecepcion: new Date(),
        ...mockDto,
      };

      jest.spyOn(sequenceService, 'generateNewsRadicado' as any).mockResolvedValue('ND-2026-0001');
      jest.spyOn(stageConfigurationRepository, 'findOne').mockResolvedValue({ id: 'stage-1', orden: 1, activo: true, etapa: 'RECEPCION' } as any);
      jest.spyOn(newsRepository, 'create').mockReturnValue(mockSavedNoticia);
      jest.spyOn(newsRepository, 'save').mockResolvedValue(mockSavedNoticia);

      const result = await service.create(mockDto, undefined, 'user-radicador');

      expect(result.radicado).toBe('ND-2026-0001');

      // Verificación de notificación in-app enviada al Jefe OCID
      expect(notificationClient.sendMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id_usuario_destinatario: 'jefe-1',
            tipo_notificacion: 'NUEVA_NOTICIA',
          }),
        ]),
      );

      // Verificación de correo electrónico enviado al Jefe OCID
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/emails/send'),
        expect.objectContaining({
          to: 'jefe.ocid@esap.edu.co',
          subject: expect.stringContaining('ND-2026-0001'),
          html: expect.stringContaining('Pendiente de Revisión'),
        }),
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });
  });

  describe('resubmitNews', () => {
    it('should update status to EN_VALORACION and send email and in-app notifications to Jefe OCID', async () => {
      const mockNoticia: any = {
        id: 'news-devuelta-1',
        radicado: 'ND-2026-0088',
        estado: NewsStatus.DEVUELTA,
        disciplinable: { nombre: 'Funcionario Subsanado', cedula: '99887766' },
        historialAuditoria: [],
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockNoticia);
      jest.spyOn(newsRepository, 'save').mockImplementation(async (n: any) => n);

      const result = await service.resubmitNews('news-devuelta-1', 'Se adjunta prueba documental solicitada');

      expect(result.estado).toBe(NewsStatus.EN_VALORACION);

      // Verificación de notificación in-app enviada al Jefe OCID
      expect(notificationClient.sendMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id_usuario_destinatario: 'jefe-1',
            tipo_notificacion: 'NOTICIA_REENVIADA',
          }),
        ]),
      );

      // Verificación de correo electrónico enviado al Jefe OCID
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/emails/send'),
        expect.objectContaining({
          to: 'jefe.ocid@esap.edu.co',
          subject: expect.stringContaining('ND-2026-0088'),
          html: expect.stringContaining('Se adjunta prueba documental solicitada'),
        }),
        expect.objectContaining({ timeout: expect.any(Number) }),
      );
    });
  });

  describe('update', () => {
    it('should NOT add history entry when editing without modifying any fields', async () => {
      const initialHistory = [
        {
          id: 'hist-1',
          tipo: 'radicacion',
          usuario: 'Radicador',
          fecha: '2026-01-01T10:00:00.000Z',
          observaciones: 'Radicación exitosa en el sistema',
        },
      ];

      const mockNoticia: any = {
        id: 'news-1',
        radicado: 'ND-2026-0001',
        origen: 'ANONIMO',
        territorial: 'Sede Central',
        dependenciaDenunciado: 'Secretaría General',
        hechos: 'Hechos originales sin cambios',
        fechaQueja: new Date('2026-02-15T12:00:00.000Z'),
        fechaRecepcion: new Date('2026-02-15T12:00:00.000Z'),
        fechaHechos: new Date('2026-01-10T00:00:00.000Z'),
        fechaCaducidad: new Date('2031-01-10T00:00:00.000Z'),
        denunciante: [
          {
            nombre: 'Juan Pérez',
            cedula: '12345678',
            cargo: 'Docente',
            dependencia: 'Facultad',
            telefono: '3001234567',
            correo: 'juan@test.com',
            direccion: 'Calle 10',
            tipo: 'Denunciante',
          },
        ],
        disciplinable: [
          {
            nombre: 'Carlos López',
            cedula: '87654321',
            cargo: 'Coordinador',
            dependencia: 'Sede Central',
          },
        ],
        conductas: ['Incumplimiento de deberes'],
        adjuntos: ['doc1.pdf'],
        historialAuditoria: [...initialHistory],
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockNoticia);
      jest.spyOn(newsRepository, 'save').mockImplementation(async (n: any) => n);

      // Payload from frontend wizard without modifications
      const unchangedPayload = {
        origen: 'Anónimo', // UI label corresponding to ANONIMO
        territorial: 'Sede Central',
        dependenciaDenunciado: 'Secretaría General',
        hechos: 'Hechos originales sin cambios',
        fechaQueja: '2026-02-15',
        fechaHechos: '2026-01-10',
        denunciante: [
          {
            nombre: 'Juan Pérez',
            cedula: '12345678',
            identificacion: '12345678',
            cargo: 'Docente',
            entidad: 'Facultad',
            dependencia: 'Facultad',
            telefono: '3001234567',
            correo: 'juan@test.com',
            direccion: 'Calle 10',
            tipo: 'Denunciante',
          },
        ],
        disciplinable: [
          {
            nombre: 'Carlos López',
            cedula: '87654321',
            identificacion: '87654321',
            cargo: 'Coordinador',
            dependencia: 'Sede Central',
            lugarHechos: 'Sede Central',
          },
        ],
        conductas: ['Incumplimiento de deberes'],
        adjuntosParaEliminar: [],
        usuario: 'Profesional',
      };

      const result = await service.update('news-1', unchangedPayload);

      // historialAuditoria should NOT have grown
      expect(result.historialAuditoria).toHaveLength(1);
      expect(result.historialAuditoria[0].tipo).toBe('radicacion');
    });

    it('should only record actually modified fields in history', async () => {
      const mockNoticia: any = {
        id: 'news-2',
        radicado: 'ND-2026-0002',
        origen: 'OFICIO',
        territorial: 'Sede Central',
        hechos: 'Hechos originales',
        fechaHechos: new Date('2026-01-10T00:00:00.000Z'),
        denunciante: [{ nombre: 'Juan Pérez', cedula: '123' }],
        disciplinable: [{ nombre: 'Carlos López', cedula: '456' }],
        historialAuditoria: [],
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockNoticia);
      jest.spyOn(newsRepository, 'save').mockImplementation(async (n: any) => n);

      // Only "hechos" is modified, others kept identical
      const modifiedPayload = {
        origen: 'De oficio',
        territorial: 'Sede Central',
        hechos: 'Nuevos hechos detallados',
        fechaHechos: '2026-01-10',
        denunciante: [{ nombre: 'Juan Pérez', cedula: '123' }],
        disciplinable: [{ nombre: 'Carlos López', cedula: '456' }],
        usuario: 'Abogado 1',
      };

      const result = await service.update('news-2', modifiedPayload);

      expect(result.historialAuditoria).toHaveLength(1);
      const entry = result.historialAuditoria[0];
      expect(entry.tipo).toBe('edicion');
      expect(entry.usuario).toBe('Abogado 1');
      expect(entry.observaciones).toBe('Campos modificados: Hechos modificados');
      expect(entry.observaciones).not.toContain('denunciante');
      expect(entry.observaciones).not.toContain('denunciado');
      expect(entry.observaciones).not.toContain('Fecha');
    });

    it('should correctly record modification when a person or date actually changes', async () => {
      const mockNoticia: any = {
        id: 'news-3',
        radicado: 'ND-2026-0003',
        origen: 'OFICIO',
        territorial: 'Sede Central',
        hechos: 'Hechos',
        fechaHechos: new Date('2026-01-10T00:00:00.000Z'),
        denunciante: [{ nombre: 'Juan Pérez', cedula: '123' }],
        disciplinable: [{ nombre: 'Carlos López', cedula: '456' }],
        historialAuditoria: [],
      };

      jest.spyOn(service, 'findById').mockResolvedValue(mockNoticia);
      jest.spyOn(newsRepository, 'save').mockImplementation(async (n: any) => n);

      // Modify disciplinable name and fechaHechos
      const modifiedPayload = {
        hechos: 'Hechos',
        fechaHechos: '2026-03-20',
        denunciante: [{ nombre: 'Juan Pérez', cedula: '123' }],
        disciplinable: [{ nombre: 'Carlos Mario López', cedula: '456' }],
        usuario: 'Abogado 2',
      };

      const result = await service.update('news-3', modifiedPayload);

      expect(result.historialAuditoria).toHaveLength(1);
      const entry = result.historialAuditoria[0];
      expect(entry.observaciones).toContain('Fecha de hechos: 2026-03-20');
      expect(entry.observaciones).toContain('Datos de denunciado modificados');
      expect(entry.observaciones).not.toContain('denunciante');
    });
  });
});