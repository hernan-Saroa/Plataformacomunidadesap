import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TravelExpensesService } from '../travel-expenses.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { ConfigService } from '../../config/config.service';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { NotificationClientService } from '../../../common/notification-client.service';
import { VerifyAuditDto } from '../../../dto/verify-audit.dto';
import { DevolverAnalistaDto } from '../../../dto/devolver-analista.dto';

describe('TravelExpensesService', () => {
  let service: TravelExpensesService;

  const mockComisionado = {
    id: 'com-001',
    numeroDocumento: '1234567890',
    primerNombre: 'Juan',
    primerApellido: 'Pérez',
    email: 'juan.perez@esap.edu.co',
    telefonoContacto: '3001234567',
    tipoComisionado: 'FUNCIONARIO',
    origenDatos: 'HUMANO',
    autorizacionHabeasData: false,
    fechaAutorizacionHabeasData: null,
    ipRegistroHabeasData: null,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  } as ComisionadoEntity;

  const createMockModule = (
    overrides: {
      comisionadoRepo?: any;
      solicitudRepo?: any;
      documentoRepo?: any;
      historialRepo?: any;
      dataSource?: any;
      configService?: any;
      notificationClient?: any;
    } = {},
  ) => {
    const {
      comisionadoRepo = { findOne: jest.fn(), save: jest.fn() },
      solicitudRepo = {
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
      documentoRepo = { create: jest.fn(), save: jest.fn() },
      historialRepo = { create: jest.fn(), save: jest.fn() },
      dataSource = {
        transaction: jest.fn(),
        createQueryBuilder: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
      },
      configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue(null),
        obtenerConfiguracionPorCodigoFormulario: jest
          .fn()
          .mockResolvedValue(null),
      },
      notificationClient = {
        archiveNotificacionesPorSolicitud: jest
          .fn()
          .mockResolvedValue(undefined),
        deleteNotificacionesPorSolicitud: jest
          .fn()
          .mockResolvedValue(undefined),
      },
    } = overrides;

    return Test.createTestingModule({
      providers: [
        TravelExpensesService,
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(ComisionadoEntity),
          useValue: comisionadoRepo,
        },
        {
          provide: getRepositoryToken(SolicitudComisionEntity),
          useValue: solicitudRepo,
        },
        {
          provide: getRepositoryToken(DocumentoSoporteEntity),
          useValue: documentoRepo,
        },
        {
          provide: getRepositoryToken(SolicitudHistorialEstadoEntity),
          useValue: historialRepo,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: NotificationClientService,
          useValue: notificationClient,
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await createMockModule();
    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  const mockSolicitudQb = (rows: any[] = []) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(rows.length),
    getMany: jest.fn().mockResolvedValue(rows),
  });

  describe('consultarComisionado', () => {
    it('debe retornar comisionado cuando existe en la tabla local', async () => {
      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(mockComisionado),
        save: jest.fn(),
        create: jest.fn((x) => x),
      };
      const dataSource = { query: jest.fn(), transaction: jest.fn() };

      const module = await createMockModule({ comisionadoRepo, dataSource });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);
      const result = await svc.consultarComisionado('1234567890');
      expect(result).toEqual(mockComisionado);
      expect(comisionadoRepo.findOne).toHaveBeenCalledWith({
        where: { numeroDocumento: '1234567890' },
      });
      // No debe consultar auth.personas si lo encuentra localmente.
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('debe materializar comisionado desde auth.personas y persistirlo cuando no existe localmente', async () => {
      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockImplementation(async (x) => ({
          ...x,
          id: 'com-nuevo',
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        })),
        create: jest.fn((x) => x),
      };
      const dataSource = {
        query: jest.fn().mockResolvedValue([
          {
            num_identificacion: '1234567890',
            nom_tercero: 'Juan Pablo',
            pri_apellido: 'Pérez Gómez',
            dir_email: 'juan.perez@esap.edu.co',
            tel_celular: '3001234567',
            id_dependencia: 42,
          },
        ]),
        transaction: jest.fn(),
      };

      const module = await createMockModule({ comisionadoRepo, dataSource });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);
      const result = await svc.consultarComisionado('1234567890');

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM auth.personas p'),
        ['1234567890'],
      );
      expect(comisionadoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          numeroDocumento: '1234567890',
          primerNombre: 'Juan',
          segundoNombre: 'Pablo',
          primerApellido: 'Pérez',
          segundoApellido: 'Gómez',
          email: 'juan.perez@esap.edu.co',
          telefonoContacto: '3001234567',
          tipoComisionado: 'FUNCIONARIO',
          origenDatos: 'ESAP',
          autorizacionHabeasData: false,
          idDependencia: 42,
        }),
      );
      expect(result).toMatchObject({
        numeroDocumento: '1234567890',
        origenDatos: 'ESAP',
        idDependencia: 42,
      });
    });

    it('debe lanzar NotFoundException cuando no existe ni en comisionados ni en auth.personas', async () => {
      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        save: jest.fn(),
        create: jest.fn((x) => x),
      };
      const dataSource = {
        query: jest.fn().mockResolvedValue([]),
        transaction: jest.fn(),
      };

      const module = await createMockModule({ comisionadoRepo, dataSource });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);
      await expect(
        svc.consultarComisionado('9999999999'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(comisionadoRepo.save).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException si el documento viene vacío', async () => {
      const comisionadoRepo = {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn((x) => x),
      };
      const dataSource = {
        query: jest.fn(),
        transaction: jest.fn(),
      };

      const module = await createMockModule({ comisionadoRepo, dataSource });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);
      await expect(svc.consultarComisionado('   ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('obtenerSolicitudes', () => {
    it('debe retornar la lista de solicitudes con datos del comisionado', async () => {
      const entidad = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        comisionadoId: 'com-001',
        comisionado: mockComisionado,
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: new Date('2026-09-03'),
        fechaFin: new Date('2026-09-07'),
        objetoComision: 'Comision de servicios',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        montoViaticos: 560000,
        montoGastosViaje: 120000,
        diasComision: 5,
        estadoSolicitud: 'SOLICITADO',
        radicadoFueraJornada: false,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        creadoPorUsuarioId: 'user-001',
      };

      const solicitudRepo = {
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(mockSolicitudQb([entidad])),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudes();

      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].consecutivoUnico).toBe('COM-2026-0001');
      expect(result.data[0].comisionado.numeroDocumento).toBe('1234567890');
      expect(result.data[0].montoViaticos).toBe(560000);
      expect(result.data[0].diasComision).toBe(5);
      expect(result.data[0].creadoPorUsuarioId).toBe('user-001');
    });

    it('debe filtrar por usuario cuando no es superadmin', async () => {
      const entidad = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        comisionadoId: 'com-001',
        comisionado: mockComisionado,
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: new Date('2026-09-03'),
        fechaFin: new Date('2026-09-07'),
        objetoComision: 'Comision de servicios',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        montoViaticos: 560000,
        montoGastosViaje: 120000,
        diasComision: 5,
        estadoSolicitud: 'SOLICITADO',
        radicadoFueraJornada: false,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        creadoPorUsuarioId: 'user-001',
      };

      const solicitudRepo = {
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(mockSolicitudQb([entidad])),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudes('user-001', false);

      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].esCreadoPorMi).toBeUndefined();
    });

    it('debe marcar esCreadoPorMi cuando es superadmin', async () => {
      const entidad = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        comisionadoId: 'com-001',
        comisionado: mockComisionado,
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: new Date('2026-09-03'),
        fechaFin: new Date('2026-09-07'),
        objetoComision: 'Comision de servicios',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        montoViaticos: 560000,
        montoGastosViaje: 120000,
        diasComision: 5,
        estadoSolicitud: 'SOLICITADO',
        radicadoFueraJornada: false,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        creadoPorUsuarioId: 'user-001',
      };

      const solicitudRepo = {
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(mockSolicitudQb([entidad])),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudes('user-001', true);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].esCreadoPorMi).toBe(true);
    });

    it('debe retornar lista vacía cuando no hay solicitudes', async () => {
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([])),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudes('user-001', false);

      expect(result).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('crearSolicitud', () => {
    it('debe lanzar 400 si comisionado no existe', async () => {
      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const module = await createMockModule({ comisionadoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.crearSolicitud({
          comisionadoId: 'inexistente',
          destinoCiudad: 'Bogotá',
          destinoDepartamento: 'Cundinamarca',
          fechaInicio: '2026-09-03',
          fechaFin: '2026-09-07',
          objetoComision: 'Comisión de gestión',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 01',
          requiereTiquetes: false,
          creadoPorUsuarioId: 'user-001',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 400 si falta aceptación Habeas Data', async () => {
      const comisionado = {
        ...mockComisionado,
        autorizacionHabeasData: false,
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };

      const module = await createMockModule({ comisionadoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.crearSolicitud({
          comisionadoId: 'com-001',
          destinoCiudad: 'Bogotá',
          destinoDepartamento: 'Cundinamarca',
          fechaInicio: '2026-09-03',
          fechaFin: '2026-09-07',
          objetoComision: 'Comisión de gestión',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 01',
          requiereTiquetes: false,
          creadoPorUsuarioId: 'user-001',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe actualizar autorización Habeas Data cuando se acepta', async () => {
      const comisionado = {
        ...mockComisionado,
        autorizacionHabeasData: false,
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn().mockImplementation((entity) => entity),
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({ id: 'sol-nueva' }),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ max: null }),
              }),
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({
        comisionadoRepo,
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-03',
        fechaFin: '2026-09-07',
        objetoComision: 'Comisión de gestión',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        creadoPorUsuarioId: 'user-001',
        aceptaHabeasData: true,
        ipRegistroHabeasData: '192.168.1.1',
      });

      expect(comisionadoRepo.save).toHaveBeenCalled();
    });

    it('debe permitir objetoComision vacío cuando el campo está oculto por configuración', async () => {
      const comisionado = {
        ...mockComisionado,
        autorizacionHabeasData: true,
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        create: jest
          .fn()
          .mockImplementation((ent) => ({ ...ent, id: 'sol-nueva' })),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ max: null }),
              }),
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          camposObligatorios: [],
          camposOpcionales: [],
          camposOcultos: ['objetoComision'],
        }),
        obtenerConfiguracionPorCodigoFormulario: jest
          .fn()
          .mockResolvedValue(null),
      };

      const module = await createMockModule({
        comisionadoRepo,
        solicitudRepo,
        dataSource,
        configService,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-03',
        fechaFin: '2026-09-07',
        objetoComision: '',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        creadoPorUsuarioId: 'user-001',
        modoBorrador: true,
      });

      expect(result).toBeDefined();
      expect(solicitudRepo.save).toHaveBeenCalled();
    });

    it('debe permitir objetoComision vacío cuando el campo está como opcional por configuración', async () => {
      const comisionado = { ...mockComisionado, autorizacionHabeasData: true };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        create: jest
          .fn()
          .mockImplementation((ent) => ({ ...ent, id: 'sol-opcional' })),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) =>
          cb({
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ max: null }),
              }),
            }),
          }),
        ),
        createQueryBuilder: jest.fn(),
      };
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          camposObligatorios: [],
          camposOpcionales: ['objetoComision'],
          camposOcultos: [],
        }),
        obtenerConfiguracionPorCodigoFormulario: jest
          .fn()
          .mockResolvedValue(null),
      };

      const module = await createMockModule({
        comisionadoRepo,
        solicitudRepo,
        dataSource,
        configService,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-03',
        fechaFin: '2026-09-07',
        objetoComision: '',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        creadoPorUsuarioId: 'user-001',
        modoBorrador: true,
      });

      expect(result).toBeDefined();
    });

    it('debe lanzar 409 si hay solapamiento de fechas', async () => {
      const comisionado = {
        ...mockComisionado,
        autorizacionHabeasData: true,
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ id: 'sol-existente' }),
        }),
        create: jest.fn(),
        save: jest.fn(),
      };

      const module = await createMockModule({ comisionadoRepo, solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.crearSolicitud({
          comisionadoId: 'com-001',
          destinoCiudad: 'Bogotá',
          destinoDepartamento: 'Cundinamarca',
          fechaInicio: '2026-09-03',
          fechaFin: '2026-09-07',
          objetoComision: 'Comisión de gestión',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 01',
          requiereTiquetes: false,
          creadoPorUsuarioId: 'user-001',
        }),
      ).rejects.toThrow(ConflictException);

      const respuesta = svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-03',
        fechaFin: '2026-09-07',
        objetoComision: 'Comisión de gestión',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        creadoPorUsuarioId: 'user-001',
      });
      await expect(respuesta).rejects.toThrow(
        /se cruzan con la solicitud sol-existente/,
      );
    });

    it('debe crear solicitud exitosamente con consecutivo único', async () => {
      const comisionado = {
        ...mockComisionado,
        autorizacionHabeasData: true,
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };

      const solicitudCreada = {
        id: 'sol-nueva',
        consecutivoUnico: 'COM-2026-0001',
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        create: jest.fn().mockReturnValue(solicitudCreada),
        save: jest.fn().mockResolvedValue(solicitudCreada),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ max: null }),
              }),
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const documentoRepo = {
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue([]),
      };

      const module = await createMockModule({
        comisionadoRepo,
        solicitudRepo,
        documentoRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-03',
        fechaFin: '2026-09-07',
        objetoComision: 'Comisión de gestión institucional',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        creadoPorUsuarioId: 'user-001',
      });

      expect(result).toBeDefined();
      expect(solicitudRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar 400 si fecha fin es anterior a fecha inicio', async () => {
      const comisionado = {
        ...mockComisionado,
        autorizacionHabeasData: true,
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };

      const module = await createMockModule({ comisionadoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.crearSolicitud({
          comisionadoId: 'com-001',
          destinoCiudad: 'Bogotá',
          destinoDepartamento: 'Cundinamarca',
          fechaInicio: '2026-09-07',
          fechaFin: '2026-09-03',
          objetoComision: 'Comisión de gestión',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 01',
          requiereTiquetes: false,
          creadoPorUsuarioId: 'user-001',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 400 si la fecha de inicio es anterior a la fecha actual', async () => {
      const comisionado = {
        ...mockComisionado,
        autorizacionHabeasData: true,
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };

      const module = await createMockModule({ comisionadoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.crearSolicitud({
          comisionadoId: 'com-001',
          destinoCiudad: 'Bogotá',
          destinoDepartamento: 'Cundinamarca',
          fechaInicio: '2020-01-01',
          fechaFin: '2020-01-05',
          objetoComision: 'Comisión de gestión',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 01',
          requiereTiquetes: false,
          creadoPorUsuarioId: 'user-001',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe radicar como RADICADA sin evaluar anticipación en la creación', async () => {
      const comisionado = {
        ...mockComisionado,
        autorizacionHabeasData: true,
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };

      const inicio = new Date();
      inicio.setDate(inicio.getDate() + 2);
      const fin = new Date();
      fin.setDate(fin.getDate() + 4);
      const toISO = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        create: jest
          .fn()
          .mockImplementation((ent) => ({ ...ent, id: 'sol-ext' })),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ max: null }),
              }),
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({
        comisionadoRepo,
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: toISO(inicio),
        fechaFin: toISO(fin),
        objetoComision: 'Comisión de gestión',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        creadoPorUsuarioId: 'user-001',
      });

      expect(result).toBeDefined();
      expect(result.extemporanea).toBe(false);
      expect(result.estadoSolicitud).toBe('RADICADA');
    });
  });

  describe('subirDocumento', () => {
    it('debe lanzar 400 si solicitud no existe', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.subirDocumento('sol-inexistente', {
          tipoDocumento: 'CDP',
          nombreArchivoOriginal: 'cdp.pdf',
          nombreArchivoSeguro: 'cdp_seguro.pdf',
          urlRepositorio: '/uploads/cdp_seguro.pdf',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe subir documento exitosamente', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'sol-001' }),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
      };

      const documentoRepo = {
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({ id: 'doc-001' }),
      };

      const module = await createMockModule({ solicitudRepo, documentoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.subirDocumento('sol-001', {
        tipoDocumento: 'CDP',
        nombreArchivoOriginal: 'cdp.pdf',
        nombreArchivoSeguro: 'cdp_seguro.pdf',
        urlRepositorio: '/uploads/cdp_seguro.pdf',
      });

      expect(result).toBeDefined();
      expect(documentoRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar 400 si el archivo adjunto no es PDF', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'sol-001' }),
      };
      const documentoRepo = { create: jest.fn(), save: jest.fn() };

      const module = await createMockModule({ solicitudRepo, documentoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.subirDocumento('sol-001', {
          tipoDocumento: 'CDP',
          file: {
            originalname: 'cdp.png',
            mimetype: 'image/png',
            filename: 'cdp.png',
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe persistir el archivo y construir urlRepositorio cuando se envía un file', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 'sol-001' }),
      };
      const documentoRepo = {
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockImplementation((ent) => ent),
      };

      const module = await createMockModule({ solicitudRepo, documentoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.subirDocumento('sol-001', {
        tipoDocumento: 'CDP',
        file: {
          originalname: 'cdp.pdf',
          mimetype: 'application/pdf',
          filename: 'cdp-123.pdf',
        },
      });

      expect(result.tipoMime).toBe('application/pdf');
      expect(result.nombreArchivoOriginal).toBe('cdp.pdf');
      expect(result.urlRepositorio).toBe('/uploads/sol-001/cdp-123.pdf');
      expect(documentoRepo.save).toHaveBeenCalled();
    });
  });

  describe('actualizarSolicitud', () => {
    const baseSolicitud = {
      id: 'sol-001',
      comisionadoId: 'com-001',
      destinoCiudad: 'Bogotá',
      destinoDepartamento: 'Cundinamarca',
      objetoComision: 'Comision de servicios',
      prioridad: 'MEDIA',
      rubroPresupuestal: 'Rubro 01',
      requiereTiquetes: false,
      montoViaticos: 560000,
      montoGastosViaje: 120000,
      diasComision: 5,
      fechaInicio: new Date('2026-10-03T00:00:00'),
      fechaFin: new Date('2026-10-07T00:00:00'),
      estadoSolicitud: 'PENDIENTE',
    };

    it('debe actualizar los campos editables cuando la solicitud está en PENDIENTE', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({ ...baseSolicitud }),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.actualizarSolicitud('sol-001', {
        prioridad: 'ALTA',
        fechaInicio: '2026-10-12',
        fechaFin: '2026-10-12',
        destinoCiudad: 'Medellín',
        montoViaticos: 700000,
      });

      expect(result.prioridad).toBe('ALTA');
      expect(result.destinoCiudad).toBe('Medellín');
      expect(result.montoViaticos).toBe(700000);
      expect(result.fechaInicio).toEqual(new Date('2026-10-12'));
      expect(result.fechaFin).toEqual(new Date('2026-10-12'));
      expect(solicitudRepo.save).toHaveBeenCalled();
    });

    it('debe lanzar 404 si la solicitud no existe', async () => {
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.actualizarSolicitud('no-existe', { prioridad: 'ALTA' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar 400 si la solicitud no está en estado PENDIENTE', async () => {
      const solicitudRepo = {
        findOne: jest
          .fn()
          .mockResolvedValue({ ...baseSolicitud, estadoSolicitud: 'RADICADA' }),
      };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.actualizarSolicitud('sol-001', { prioridad: 'ALTA' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 400 si la fecha fin es anterior a la fecha inicio', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({ ...baseSolicitud }),
      };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.actualizarSolicitud('sol-001', {
          fechaInicio: '2026-10-12',
          fechaFin: '2026-10-07',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('finalizarSolicitud', () => {
    const comisionado = { ...mockComisionado, autorizacionHabeasData: true };

    const baseSolicitud = {
      id: 'sol-001',
      comisionadoId: 'com-001',
      fechaInicio: new Date('2026-10-03T00:00:00'),
      fechaFin: new Date('2026-10-07T00:00:00'),
      estadoSolicitud: 'PENDIENTE',
      comisionado: { tipoComisionado: 'FUNCIONARIO' },
    };

    it('debe lanzar 404 si la solicitud no existe', async () => {
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(svc.finalizarSolicitud('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar 400 si la solicitud no está en estado PENDIENTE', async () => {
      const solicitudRepo = {
        findOne: jest
          .fn()
          .mockResolvedValue({ ...baseSolicitud, estadoSolicitud: 'RADICADA' }),
      };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(svc.finalizarSolicitud('sol-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar 400 si faltan soportes obligatorios', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(baseSolicitud),
      };
      const documentoRepo = { find: jest.fn().mockResolvedValue([]) };
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          documentos: [
            {
              tipoRequisito: 'OBLIGATORIO',
              tipoDocumentoSoporte: {
                codigo: 'CDP',
                nombre: 'CDP',
                descripcion: null,
              },
            },
          ],
        }),
      };
      const module = await createMockModule({
        solicitudRepo,
        documentoRepo,
        configService,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(svc.finalizarSolicitud('sol-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar 400 si un soporte obligatorio no es PDF', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(baseSolicitud),
      };
      const documentoRepo = {
        find: jest.fn().mockResolvedValue([
          {
            solicitudId: 'sol-001',
            tipoDocumento: 'CDP',
            tipoMime: 'image/png',
          },
        ]),
      };
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          documentos: [
            {
              tipoRequisito: 'OBLIGATORIO',
              tipoDocumentoSoporte: {
                codigo: 'CDP',
                nombre: 'CDP',
                descripcion: null,
              },
            },
          ],
        }),
      };
      const module = await createMockModule({
        solicitudRepo,
        documentoRepo,
        configService,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(svc.finalizarSolicitud('sol-001')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe radicar como RADICADA cuando el checklist está completo con PDFs', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(baseSolicitud),
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };
      const documentoRepo = {
        find: jest.fn().mockResolvedValue([
          {
            solicitudId: 'sol-001',
            tipoDocumento: 'CDP',
            tipoMime: 'application/pdf',
          },
        ]),
      };
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          documentos: [
            {
              tipoRequisito: 'OBLIGATORIO',
              tipoDocumentoSoporte: {
                codigo: 'CDP',
                nombre: 'CDP',
                descripcion: null,
              },
            },
          ],
        }),
      };
      const module = await createMockModule({
        solicitudRepo,
        documentoRepo,
        configService,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.finalizarSolicitud('sol-001');

      expect(result.estadoSolicitud).toBe('RADICADA');
    });
  });

  describe('obtenerChecklistDocumentos', () => {
    it('debe retornar obligatorios y opcionales desde la configuración', async () => {
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          documentos: [
            {
              tipoRequisito: 'OBLIGATORIO',
              tipoDocumentoSoporte: {
                codigo: 'CDP',
                nombre: 'CDP',
                descripcion: null,
              },
            },
            {
              tipoRequisito: 'OPCIONAL',
              tipoDocumentoSoporte: {
                codigo: 'SEGURIDAD_SOCIAL',
                nombre: 'Seguridad Social',
                descripcion: null,
              },
            },
          ],
        }),
      };
      const module = await createMockModule({ configService });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerChecklistDocumentos('FUNCIONARIO');

      expect(result.obligatorios).toHaveLength(1);
      expect(result.obligatorios[0].codigo).toBe('CDP');
      expect(result.opcionales).toHaveLength(1);
      expect(result.opcionales[0].codigo).toBe('SEGURIDAD_SOCIAL');
    });
  });

  describe('crearSolicitud (modo borrador)', () => {
    it('debe crear la solicitud en estado PENDIENTE y saltar la validación de solapamiento', async () => {
      const comisionado = { ...mockComisionado, autorizacionHabeasData: true };
      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({}),
        create: jest
          .fn()
          .mockImplementation((ent) => ({ ...ent, id: 'sol-borrador' })),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ max: null }),
              }),
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({
        comisionadoRepo,
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-03',
        fechaFin: '2026-09-07',
        objetoComision: 'Comisión de gestión',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        creadoPorUsuarioId: 'user-001',
        modoBorrador: true,
        tipoComision: 'TERRESTRE',
      });

      expect(result.estadoSolicitud).toBe('PENDIENTE');
      expect(solicitudRepo.save).toHaveBeenCalled();
    });

    it('debe marcar esInternacional=true y tipoComision=INTERNACIONAL cuando la comisión es internacional', async () => {
      const comisionado = { ...mockComisionado, autorizacionHabeasData: true };
      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(comisionado),
        save: jest.fn(),
      };
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({}),
        create: jest
          .fn()
          .mockImplementation((ent) => ({ ...ent, id: 'sol-int' })),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };
      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) =>
          cb({
            getRepository: jest.fn().mockReturnValue({
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawOne: jest.fn().mockResolvedValue({ max: null }),
              }),
            }),
          }),
        ),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({
        comisionadoRepo,
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-03',
        fechaFin: '2026-09-07',
        objetoComision: 'Comisión internacional',
        prioridad: 'ALTA',
        rubroPresupuestal: 'Rubro 01',
        requiereTiquetes: false,
        creadoPorUsuarioId: 'user-001',
        modoBorrador: true,
        esInternacional: true,
      });

      expect(result.esInternacional).toBe(true);
      expect(result.tipoComision).toBe('INTERNACIONAL');
    });
  });
});

describe('TravelExpensesService — Etapa 5 (RF-REC-002)', () => {
  let service: TravelExpensesService;

  const mockComisionado = {
    id: 'com-001',
    numeroDocumento: '1234567890',
    primerNombre: 'Juan',
    primerApellido: 'Pérez',
    segundoNombre: 'Pablo',
    email: 'juan.perez@esap.edu.co',
    telefonoContacto: '3001234567',
    tipoComisionado: 'FUNCIONARIO',
  } as ComisionadoEntity;

  const createMockModuleEtapa5 = (
    overrides: {
      comisionadoRepo?: any;
      solicitudRepo?: any;
      documentoRepo?: any;
      historialRepo?: any;
      dataSource?: any;
      configService?: any;
      notificationClient?: any;
    } = {},
  ) => {
    const {
      comisionadoRepo = { findOne: jest.fn(), save: jest.fn() },
      solicitudRepo = {
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
      },
      documentoRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn() },
      historialRepo = { create: jest.fn(), save: jest.fn() },
      dataSource = {
        transaction: jest.fn(),
        createQueryBuilder: jest.fn(),
        query: jest.fn().mockResolvedValue([]),
      },
      configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue(null),
        obtenerConfiguracionPorCodigoFormulario: jest
          .fn()
          .mockResolvedValue(null),
      },
      notificationClient = {
        archiveNotificacionesPorSolicitud: jest
          .fn()
          .mockResolvedValue(undefined),
        deleteNotificacionesPorSolicitud: jest
          .fn()
          .mockResolvedValue(undefined),
        send: jest.fn().mockResolvedValue(undefined),
      },
    } = overrides;

    return Test.createTestingModule({
      providers: [
        TravelExpensesService,
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
        {
          provide: getRepositoryToken(ComisionadoEntity),
          useValue: comisionadoRepo,
        },
        {
          provide: getRepositoryToken(SolicitudComisionEntity),
          useValue: solicitudRepo,
        },
        {
          provide: getRepositoryToken(DocumentoSoporteEntity),
          useValue: documentoRepo,
        },
        {
          provide: getRepositoryToken(SolicitudHistorialEstadoEntity),
          useValue: historialRepo,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: NotificationClientService,
          useValue: notificationClient,
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await createMockModuleEtapa5();
    service = module.get<TravelExpensesService>(TravelExpensesService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerSolicitudesAsignadasAnalista', () => {
    it('debe retornar solicitudes asignadas al analista en estados activos ordenadas por creadoEn DESC', async () => {
      const solicitudes = [
        {
          id: 'sol-001',
          analistaAsignadoId: 'analista-001',
          estadoSolicitud: EstadoSolicitud.EN_VERIFICACION,
          creadoEn: new Date('2026-09-03'),
          comisionado: mockComisionado,
        },
        {
          id: 'sol-002',
          analistaAsignadoId: 'analista-001',
          estadoSolicitud: EstadoSolicitud.SOLICITADO,
          creadoEn: new Date('2026-09-02'),
          comisionado: mockComisionado,
        },
        {
          id: 'sol-003',
          analistaAsignadoId: 'analista-001',
          estadoSolicitud: EstadoSolicitud.VERIFICADA,
          creadoEn: new Date('2026-09-01'),
          comisionado: mockComisionado,
        },
      ];

      const solicitudRepo = {
        find: jest.fn().mockResolvedValue(solicitudes),
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      const module = await createMockModuleEtapa5({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudesAsignadasAnalista('analista-001');

      expect(solicitudRepo.find).toHaveBeenCalledWith({
        where: {
          analistaAsignadoId: 'analista-001',
          estadoSolicitud: In([
            EstadoSolicitud.SOLICITADO,
            EstadoSolicitud.EN_VERIFICACION,
            EstadoSolicitud.VERIFICADA,
          ]),
        },
        order: { creadoEn: 'DESC' },
        relations: ['comisionado'],
      });
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('sol-001');
      expect(result[0].estadoSolicitud).toBe(EstadoSolicitud.EN_VERIFICACION);
    });

    it('debe lanzar BadRequestException si analistaId esta vacio', async () => {
      await expect(
        service.obtenerSolicitudesAsignadasAnalista(''),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.obtenerSolicitudesAsignadasAnalista(''),
      ).rejects.toThrow('analistaId es obligatorio.');
    });

    it('debe retornar lista vacia cuando no hay solicitudes asignadas', async () => {
      const solicitudRepo = {
        find: jest.fn().mockResolvedValue([]),
        createQueryBuilder: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      };

      const module = await createMockModuleEtapa5({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudesAsignadasAnalista('analista-001');

      expect(result).toEqual([]);
    });
  });

  describe('verificarAuditoria', () => {
    it('debe registrar verificacion exitosamente: validar SoD, estado, log en historial y actualizar consultaRutFacturador', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador-1',
        consultaRutFacturador: false,
        save: jest.fn().mockImplementation(async (ent) => ent),
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
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockResolvedValue({ id: 'hist-001' }),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
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
              return {};
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        historialRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const dto = {
        seguridadSocialVigente: true,
        consultaRutFacturador: true,
      } as VerifyAuditDto;

      const result = await svc.verificarAuditoria(
        'sol-001',
        'analista-001',
        ['ANALISTA'],
        dto,
      );

      expect(result.consultaRutFacturador).toBe(true);
      expect(historialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-001',
          comentarios: expect.stringContaining('VERIFICACION_ANALISTA'),
        }),
      );
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.verificarAuditoria(
          'sol-inexistente',
          'analista-001',
          ['ANALISTA'],
          {} as VerifyAuditDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el estado no es SOLICITADO ni EN_VERIFICACION', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.APROBADO_JEFE,
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador-1',
        consultaRutFacturador: false,
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.verificarAuditoria(
          'sol-001',
          'analista-001',
          ['ANALISTA'],
          {} as VerifyAuditDto,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        svc.verificarAuditoria(
          'sol-001',
          'analista-001',
          ['ANALISTA'],
          {} as VerifyAuditDto,
        ),
      ).rejects.toThrow(
        'Estado no valido para verificacion: APROBADO_JEFE',
      );
    });

    it('debe lanzar ForbiddenException por infraccion SoD cuando el usuario es comisionado', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        comisionadoId: 'user-001',
        creadoPorUsuarioId: 'user-creador-1',
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.verificarAuditoria(
          'sol-001',
          'user-001',
          ['ANALISTA'],
          {} as VerifyAuditDto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException por infraccion SoD cuando el usuario es el creador', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-001',
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.verificarAuditoria(
          'sol-001',
          'user-001',
          ['ANALISTA'],
          {} as VerifyAuditDto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir verificacion a super admin sin importar la relacion', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador-1',
        consultaRutFacturador: false,
        save: jest.fn().mockImplementation(async (ent) => ent),
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
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockResolvedValue({ id: 'hist-001' }),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
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
              return {};
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        historialRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.verificarAuditoria(
        'sol-001',
        'admin-001',
        ['ADMIN'],
        { seguridadSocialVigente: true, consultaRutFacturador: false } as VerifyAuditDto,
      );

      expect(result).toBeDefined();
    });
  });

  describe('devolverAnalista', () => {
    it('debe transicionar a DEVUELTA, establecer motivoDevolucion y registrar historial', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador-1',
        motivoDevolucion: null,
        save: jest.fn().mockImplementation(async (ent) => ent),
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
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockResolvedValue({ id: 'hist-002' }),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
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
              return {};
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        historialRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.devolverAnalista(
        'sol-001',
        'analista-001',
        ['ANALISTA'],
        'Falta documento de soporte',
      );

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.DEVUELTA);
      expect(result.motivoDevolucion).toBe('Falta documento de soporte');
      expect(historialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-001',
          estadoAnterior: EstadoSolicitud.SOLICITADO,
          estadoNuevo: EstadoSolicitud.DEVUELTA,
          usuarioId: 'analista-001',
          comentarios: 'Falta documento de soporte',
        }),
      );
    });

    it('debe lanzar BadRequestException si el estado no es SOLICITADO ni EN_VERIFICACION', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.APROBADO_JEFE,
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador-1',
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.devolverAnalista('sol-001', 'analista-001', ['ANALISTA'], 'Falta soporte'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        svc.devolverAnalista('sol-001', 'analista-001', ['ANALISTA'], 'Falta soporte'),
      ).rejects.toThrow(
        'Estado no valido para devolucion: APROBADO_JEFE',
      );
    });

    it('debe lanzar BadRequestException si el motivo esta vacio', async () => {
      await expect(
        service.devolverAnalista('sol-001', 'analista-001', ['ANALISTA'], '   '),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.devolverAnalista('sol-001', 'analista-001', ['ANALISTA'], '   '),
      ).rejects.toThrow('El motivo de devolucion es obligatorio.');
    });

    it('debe lanzar ForbiddenException por infraccion SoD cuando el usuario es comisionado', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        comisionadoId: 'user-001',
        creadoPorUsuarioId: 'user-creador-1',
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.devolverAnalista('sol-001', 'user-001', ['ANALISTA'], 'Falta soporte'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('exportarSIIF', () => {
    it('debe generar CSV, marcar siifExportado=true y transicionar a SOLICITADA_SIIF', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
        comisionadoId: 'com-001',
        siifExportado: false,
        objetoComision: 'Comision de servicios',
        rubroPresupuestal: 'Rubro 01',
        montoViaticos: 500000,
        montoGastosViaje: 100000,
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue({
          ...mockComisionado,
          primerNombre: 'Juan',
          segundoNombre: 'Pablo',
          primerApellido: 'Pérez',
          segundoApellido: 'Gómez',
        }),
        save: jest.fn(),
      };

      const historialRepo = {
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockResolvedValue({ id: 'hist-003' }),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockImplementation((entity: any) => {
              const nombre = entity?.name || entity?.constructor?.name || '';
              if (
                nombre === 'SolicitudComisionEntity' ||
                nombre === 'solicitudes_comision'
              )
                return solicitudRepo;
              if (
                nombre === 'ComisionadoEntity' ||
                nombre === 'comisionados'
              )
                return comisionadoRepo;
              if (
                nombre === 'SolicitudHistorialEstadoEntity' ||
                nombre === 'solicitudes_historial_estados'
              )
                return historialRepo;
              return {};
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        comisionadoRepo,
        solicitudRepo,
        historialRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.exportarSIIF('sol-001', 'analista-001', ['ANALISTA']);

      expect(result.fileName).toMatch(/^SIIF_COM-2026-0001_\d{4}-\d{2}-\d{2}\.csv$/);
      expect(result.csvContent).toContain('Cedula;Nombre;Objeto;ValorNeto;RubroPresupuestal');
      expect(result.csvContent).toContain('1234567890');
      expect(result.solicitud.siifExportado).toBe(true);
      expect(result.solicitud.fechaExportacionSiif).toBeDefined();
      expect(result.solicitud.usuarioExportadorId).toBe('analista-001');
      expect(result.solicitud.estadoSolicitud).toBe(EstadoSolicitud.SOLICITADA_SIIF);
      expect(historialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-001',
          estadoAnterior: EstadoSolicitud.SOLICITADO,
          estadoNuevo: EstadoSolicitud.SOLICITADA_SIIF,
          comentarios: 'Exportado a SIIF Nacion',
        }),
      );
    });

    it('debe lanzar BadRequestException si la solicitud ya fue exportada', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
        comisionadoId: 'com-001',
        siifExportado: true,
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.exportarSIIF('sol-001', 'analista-001', ['ANALISTA']),
      ).rejects.toThrow(BadRequestException);
      await expect(
        svc.exportarSIIF('sol-001', 'analista-001', ['ANALISTA']),
      ).rejects.toThrow('Esta solicitud ya fue exportada a SIIF.');
    });

    it('debe lanzar BadRequestException si el estado no esta permitido', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.APROBADO_JEFE,
        comisionadoId: 'com-001',
        siifExportado: false,
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.exportarSIIF('sol-001', 'analista-001', ['ANALISTA']),
      ).rejects.toThrow(BadRequestException);
      await expect(
        svc.exportarSIIF('sol-001', 'analista-001', ['ANALISTA']),
      ).rejects.toThrow(
        'Estado no valido para exportacion SIIF: APROBADO_JEFE',
      );
    });

    it('debe lanzar ForbiddenException por infraccion SoD cuando el usuario es comisionado', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
        comisionadoId: 'user-001',
        creadoPorUsuarioId: 'user-creador-1',
        siifExportado: false,
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.exportarSIIF('sol-001', 'user-001', ['ANALISTA']),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir exportar a super admin sin importar la relacion', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
        comisionadoId: 'com-001',
        siifExportado: false,
        objetoComision: 'Comision de servicios',
        rubroPresupuestal: 'Rubro 01',
        montoViaticos: 500000,
        montoGastosViaje: 100000,
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue({
          ...mockComisionado,
          primerNombre: 'Juan',
          segundoNombre: 'Pablo',
          primerApellido: 'Pérez',
          segundoApellido: 'Gómez',
        }),
        save: jest.fn(),
      };

      const historialRepo = {
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockResolvedValue({ id: 'hist-003' }),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockImplementation((entity: any) => {
              const nombre = entity?.name || entity?.constructor?.name || '';
              if (
                nombre === 'SolicitudComisionEntity' ||
                nombre === 'solicitudes_comision'
              )
                return solicitudRepo;
              if (
                nombre === 'ComisionadoEntity' ||
                nombre === 'comisionados'
              )
                return comisionadoRepo;
              if (
                nombre === 'SolicitudHistorialEstadoEntity' ||
                nombre === 'solicitudes_historial_estados'
              )
                return historialRepo;
              return {};
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        comisionadoRepo,
        solicitudRepo,
        historialRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.exportarSIIF('sol-001', 'admin-001', ['SUPER_ADMIN']);

      expect(result.solicitud.estadoSolicitud).toBe(EstadoSolicitud.SOLICITADA_SIIF);
    });
  });

  describe('validarSoD (privada, cubierta por metodos publicos)', () => {
    it('debe permitir super admin en verificarAuditoria', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador-1',
        consultaRutFacturador: false,
        save: jest.fn().mockImplementation(async (ent) => ent),
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
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockResolvedValue({ id: 'hist-001' }),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
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
              return {};
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        historialRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.verificarAuditoria(
        'sol-001',
        'admin-001',
        ['SUPER_ADMIN'],
        { seguridadSocialVigente: true } as VerifyAuditDto,
      );

      expect(result).toBeDefined();
    });

    it('debe bloquear comisionado en devolverAnalista', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.SOLICITADO,
        comisionadoId: 'user-001',
        creadoPorUsuarioId: 'user-creador-1',
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.devolverAnalista('sol-001', 'user-001', ['ANALISTA'], 'Falta soporte'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe bloquear creador en exportarSIIF', async () => {
      const solicitud = {
        id: 'sol-001',
        estadoSolicitud: EstadoSolicitud.VERIFICADA,
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-001',
        siifExportado: false,
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(solicitud),
        }),
        save: jest.fn(),
      };

      const dataSource = {
        transaction: jest.fn().mockImplementation(async (cb) => {
          const manager = {
            getRepository: jest.fn().mockReturnValue(solicitudRepo),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModuleEtapa5({
        solicitudRepo,
        dataSource,
      });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.exportarSIIF('sol-001', 'user-001', ['ANALISTA']),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
