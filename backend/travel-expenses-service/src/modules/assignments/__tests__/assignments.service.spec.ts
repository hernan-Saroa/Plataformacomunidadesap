import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AssignmentsService } from '../assignments.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AnalistaEntity } from '../../../entities/analista.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';

describe('AssignmentsService — RF-REC-002', () => {
  let service: AssignmentsService;

  const mockAnalista = {
    id: 'analista-1',
    usuarioId: 'user-analista-1',
    idPersona: 'person-1',
    identificacion: '123456',
    nombreCompleto: 'Ana Gómez',
    username: 'ana.gomez',
    email: 'ana@esap.edu.co',
    telefono: '3000000000',
    cargo: 'Analista Viáticos',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const buildDataSource = (
    solicitudRepo: any,
    analistaRepo: any,
    historialRepo: any,
  ): DataSource => ({
    transaction: jest.fn().mockImplementation(async (cb: any) => {
      const manager = {
        getRepository: jest.fn().mockImplementation((entity: any) => {
          const nombre = entity?.name || entity?.constructor?.name || '';
          if (
            nombre === 'SolicitudComisionEntity' ||
            nombre === 'solicitudes_comision'
          )
            return solicitudRepo;
          if (
            nombre === 'SolicitudHistorialEstadoEntity' ||
            nombre === 'solicitudes_historial_estados'
          )
            return historialRepo;
          if (nombre === 'AnalistaEntity' || nombre === 'analistas_viaticos')
            return analistaRepo;
          return {};
        }),
      };
      return cb(manager);
    }),
    createQueryBuilder: jest.fn(),
    query: jest.fn().mockResolvedValue([]),
    getRepository: jest.fn().mockImplementation((entity: any) => {
      const nombre = entity?.name || entity?.constructor?.name || '';
      if (
        nombre === 'SolicitudComisionEntity' ||
        nombre === 'solicitudes_comision'
      )
        return solicitudRepo;
      return {};
    }),
  });

  const createMockModule = (
    overrides: {
      analistaRepo?: any;
      solicitudRepo?: any;
      historialRepo?: any;
      dataSource?: DataSource;
    } = {},
  ) => {
    const {
      analistaRepo = { find: jest.fn(), createQueryBuilder: jest.fn() },
      solicitudRepo = {
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      },
      historialRepo = { create: jest.fn(), save: jest.fn() },
      dataSource = buildDataSource(solicitudRepo, analistaRepo, historialRepo),
    } = overrides;

    return Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(AnalistaEntity),
          useValue: analistaRepo,
        },
        {
          provide: getRepositoryToken(SolicitudComisionEntity),
          useValue: solicitudRepo,
        },
        {
          provide: getRepositoryToken(SolicitudHistorialEstadoEntity),
          useValue: historialRepo,
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await createMockModule();
    service = module.get<AssignmentsService>(AssignmentsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerCargaAnalistas', () => {
    it('debe retornar la lista de analistas con puntaje y color del semáforo', async () => {
      const analistaRepo = {
        find: jest.fn().mockResolvedValue([mockAnalista]),
        createQueryBuilder: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn(),
        createQueryBuilder: jest.fn(),
        query: jest.fn().mockResolvedValue([
          { analista_id: 'user-analista-1', prioridad: 'ALTA', cantidad: 1 },
          { analista_id: 'user-analista-1', prioridad: 'MEDIA', cantidad: 2 },
        ]),
      };

      const module = await createMockModule({
        analistaRepo,
        dataSource: dataSource as any,
      });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      const resultado = await svc.obtenerCargaAnalistas();

      expect(resultado).toHaveLength(1);
      expect(resultado[0].usuarioId).toBe('user-analista-1');
      expect(resultado[0].altas).toBe(1);
      expect(resultado[0].medias).toBe(2);
      expect(resultado[0].puntajeTotal).toBe(7);
      expect(resultado[0].colorSemaforo).toBe('AMARILLO');
    });

    it('debe retornar VERDE para analista sin asignaciones', async () => {
      const analistaRepo = {
        find: jest.fn().mockResolvedValue([mockAnalista]),
        createQueryBuilder: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn(),
        createQueryBuilder: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
      };

      const module = await createMockModule({
        analistaRepo,
        dataSource: dataSource as any,
      });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      const resultado = await svc.obtenerCargaAnalistas();

      expect(resultado[0].puntajeTotal).toBe(0);
      expect(resultado[0].colorSemaforo).toBe('VERDE');
    });

    it('debe retornar ROJO para analista con puntaje mayor a 12', async () => {
      const analistaRepo = {
        find: jest.fn().mockResolvedValue([mockAnalista]),
        createQueryBuilder: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn(),
        createQueryBuilder: jest.fn(),
        query: jest
          .fn()
          .mockResolvedValue([
            { analista_id: 'user-analista-1', prioridad: 'ALTA', cantidad: 5 },
          ]),
      };

      const module = await createMockModule({
        analistaRepo,
        dataSource: dataSource as any,
      });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      const resultado = await svc.obtenerCargaAnalistas();

      expect(resultado[0].puntajeTotal).toBe(15);
      expect(resultado[0].colorSemaforo).toBe('ROJO');
    });
  });

  describe('asignarAnalista', () => {
    it('debe asignar la solicitud y transicionar a EN_VERIFICACION', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        analistaAsignadoId: null,
        save: jest.fn().mockImplementation(async (ent: any) => ent),
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn().mockImplementation(async (ent: any) => ent),
      };

      const analistaQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockAnalista),
      };

      const analistaRepo = {
        find: jest.fn().mockResolvedValue([mockAnalista]),
        createQueryBuilder: jest.fn().mockReturnValue(analistaQueryBuilder),
      };

      const historialRepo = {
        create: jest.fn().mockImplementation((ent: any) => ent),
        save: jest.fn().mockResolvedValue({ id: 'hist-001' }),
      };

      const module = await createMockModule({
        analistaRepo,
        solicitudRepo,
        historialRepo,
      });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      const resultado = await svc.asignarAnalista(
        'sol-001',
        'user-analista-1',
        'secretario-1',
      );

      expect(resultado.solicitud.estadoSolicitud).toBe(
        EstadoSolicitud.EN_VERIFICACION,
      );
      expect(resultado.solicitud.analistaAsignadoId).toBe('user-analista-1');
      expect(historialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-001',
          estadoAnterior: EstadoSolicitud.SOLICITADO,
          estadoNuevo: EstadoSolicitud.EN_VERIFICACION,
          usuarioId: 'secretario-1',
        }),
      );
    });

    it('debe asignar exitosamente una solicitud en estado EXTEMPORANEA', async () => {
      const solicitud = {
        id: 'sol-ext-001',
        consecutivoUnico: 'COM-2026-0002',
        estadoSolicitud: EstadoSolicitud.EXTEMPORANEA,
        analistaAsignadoId: null,
      };

      const analistaRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({
            id: 'analista-1',
            usuarioId: 'user-analista-1',
            username: 'analista1',
          }),
        }),
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const historialRepo = {
        create: jest.fn().mockImplementation((data) => data),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const module = await createMockModule({
        analistaRepo,
        solicitudRepo,
        historialRepo,
      });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      const resultado = await svc.asignarAnalista(
        'sol-ext-001',
        'user-analista-1',
        'secretario-1',
      );

      expect(resultado.solicitud.estadoSolicitud).toBe(
        EstadoSolicitud.EN_VERIFICACION,
      );
      expect(resultado.solicitud.analistaAsignadoId).toBe('user-analista-1');
    });

    it('debe lanzar 400 si la solicitud no está en SOLICITADO ni EXTEMPORANEA', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.RADICADA,
        analistaAsignadoId: null,
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      await expect(
        svc.asignarAnalista('sol-001', 'user-analista-1', 'secretario-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 404 si la solicitud no existe', async () => {
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        save: jest.fn(),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      await expect(
        svc.asignarAnalista('no-existe', 'user-analista-1', 'secretario-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar 400 si el analista no existe o no está activo', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        analistaAsignadoId: null,
        save: jest.fn(),
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const analistaQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      const analistaRepo = {
        find: jest.fn().mockResolvedValue([]),
        createQueryBuilder: jest.fn().mockReturnValue(analistaQueryBuilder),
      };

      const module = await createMockModule({ analistaRepo, solicitudRepo });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      await expect(
        svc.asignarAnalista('sol-001', 'user-inactivo', 'secretario-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('obtenerSolicitudesAsignadas', () => {
    it('debe retornar las solicitudes asignadas al analista', async () => {
      const solicitudesMock = [
        {
          id: 'sol-001',
          consecutivoUnico: 'COM-2026-0001',
          estadoSolicitud: EstadoSolicitud.SOLICITADO,
          analistaAsignadoId: 'user-analista-1',
          creadoEn: new Date(),
        },
        {
          id: 'sol-002',
          consecutivoUnico: 'COM-2026-0002',
          estadoSolicitud: EstadoSolicitud.EN_VERIFICACION,
          analistaAsignadoId: 'user-analista-1',
          creadoEn: new Date(),
        },
      ];

      const solicitudRepo = {
        find: jest.fn().mockResolvedValue(solicitudesMock),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<AssignmentsService>(AssignmentsService);

      const resultado =
        await svc.obtenerSolicitudesAsignadas('user-analista-1');

      expect(resultado).toHaveLength(2);
      expect(resultado[0].estadoSolicitud).toBe(EstadoSolicitud.SOLICITADO);
      expect(resultado[1].estadoSolicitud).toBe(
        EstadoSolicitud.EN_VERIFICACION,
      );
    });

    it('debe lanzar 400 si analistaId no está definido', async () => {
      const module = await createMockModule();
      const svc = module.get<AssignmentsService>(AssignmentsService);

      await expect(svc.obtenerSolicitudesAsignadas('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
