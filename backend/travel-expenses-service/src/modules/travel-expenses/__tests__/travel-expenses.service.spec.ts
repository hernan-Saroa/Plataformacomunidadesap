import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TravelExpensesService } from '../travel-expenses.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { ConfigService } from '../../config/config.service';

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
      dataSource?: any;
      configService?: any;
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
      dataSource = { transaction: jest.fn(), createQueryBuilder: jest.fn() },
      configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue(null),
        obtenerConfiguracionPorCodigoFormulario: jest.fn().mockResolvedValue(null),
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
          provide: ConfigService,
          useValue: configService,
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
    it('debe retornar comisionado cuando existe', async () => {
      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(mockComisionado),
      };

      const module = await createMockModule({ comisionadoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);
      const result = await svc.consultarComisionado('1234567890');
      expect(result).toEqual(mockComisionado);
      expect(comisionadoRepo.findOne).toHaveBeenCalledWith({
        where: { numeroDocumento: '1234567890' },
      });
    });

    it('debe retornar null cuando no existe', async () => {
      const comisionadoRepo = {
        findOne: jest.fn().mockResolvedValue(null),
      };

      const module = await createMockModule({ comisionadoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);
      const result = await svc.consultarComisionado('9999999999');
      expect(result).toBeNull();
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
        fechaInicio: new Date('2026-09-01'),
        fechaFin: new Date('2026-09-05'),
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
        createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([entidad])),
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
        fechaInicio: new Date('2026-09-01'),
        fechaFin: new Date('2026-09-05'),
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
        createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([entidad])),
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
        fechaInicio: new Date('2026-09-01'),
        fechaFin: new Date('2026-09-05'),
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
        createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([entidad])),
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
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-05',
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
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-05',
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
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-05',
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
        create: jest.fn().mockImplementation((ent) => ({ ...ent, id: 'sol-nueva' })),
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
        obtenerConfiguracionPorCodigoFormulario: jest.fn().mockResolvedValue(null),
      };

      const module = await createMockModule({ comisionadoRepo, solicitudRepo, dataSource, configService });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-05',
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

      const comisionadoRepo = { findOne: jest.fn().mockResolvedValue(comisionado), save: jest.fn() };
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
        create: jest.fn().mockImplementation((ent) => ({ ...ent, id: 'sol-opcional' })),
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
        obtenerConfiguracionPorCodigoFormulario: jest.fn().mockResolvedValue(null),
      };

      const module = await createMockModule({ comisionadoRepo, solicitudRepo, dataSource, configService });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-05',
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
          fechaInicio: '2026-09-01',
          fechaFin: '2026-09-05',
          objetoComision: 'Comisión de gestión',
          prioridad: 'ALTA',
          rubroPresupuestal: 'Rubro 01',
          requiereTiquetes: false,
          creadoPorUsuarioId: 'user-001',
        }),
      ).rejects.toThrow(ConflictException);
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
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-05',
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
          fechaInicio: '2026-09-05',
          fechaFin: '2026-09-01',
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

    it('debe marcar como EXTEMPORANEA cuando la anticipación es menor a 14 días hábiles', async () => {
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
      expect(result.extemporanea).toBe(true);
      expect(result.estadoSolicitud).toBe('EXTEMPORANEA');
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
  });

  describe('finalizarSolicitud', () => {
    const comisionado = { ...mockComisionado, autorizacionHabeasData: true };

    const baseSolicitud = {
      id: 'sol-001',
      comisionadoId: 'com-001',
      fechaInicio: new Date('2026-10-01T00:00:00'),
      fechaFin: new Date('2026-10-05T00:00:00'),
      estadoSolicitud: 'PENDIENTE',
      comisionado: { tipoComisionado: 'FUNCIONARIO' },
    };

    it('debe lanzar 404 si la solicitud no existe', async () => {
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(svc.finalizarSolicitud('no-existe')).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar 400 si la solicitud no está en estado PENDIENTE', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({ ...baseSolicitud, estadoSolicitud: 'RADICADA' }),
      };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(svc.finalizarSolicitud('sol-001')).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 400 si faltan soportes obligatorios', async () => {
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(baseSolicitud) };
      const documentoRepo = { find: jest.fn().mockResolvedValue([]) };
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          documentos: [{ tipoRequisito: 'OBLIGATORIO', tipoDocumentoSoporte: { codigo: 'CDP', nombre: 'CDP', descripcion: null } }],
        }),
      };
      const module = await createMockModule({ solicitudRepo, documentoRepo, configService });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(svc.finalizarSolicitud('sol-001')).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 400 si un soporte obligatorio no es PDF', async () => {
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(baseSolicitud) };
      const documentoRepo = {
        find: jest.fn().mockResolvedValue([
          { solicitudId: 'sol-001', tipoDocumento: 'CDP', tipoMime: 'image/png' },
        ]),
      };
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          documentos: [{ tipoRequisito: 'OBLIGATORIO', tipoDocumentoSoporte: { codigo: 'CDP', nombre: 'CDP', descripcion: null } }],
        }),
      };
      const module = await createMockModule({ solicitudRepo, documentoRepo, configService });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(svc.finalizarSolicitud('sol-001')).rejects.toThrow(BadRequestException);
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
          { solicitudId: 'sol-001', tipoDocumento: 'CDP', tipoMime: 'application/pdf' },
        ]),
      };
      const configService = {
        obtenerConfiguracionPorTipo: jest.fn().mockResolvedValue({
          documentos: [{ tipoRequisito: 'OBLIGATORIO', tipoDocumentoSoporte: { codigo: 'CDP', nombre: 'CDP', descripcion: null } }],
        }),
      };
      const module = await createMockModule({ solicitudRepo, documentoRepo, configService });
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
            { tipoRequisito: 'OBLIGATORIO', tipoDocumentoSoporte: { codigo: 'CDP', nombre: 'CDP', descripcion: null } },
            { tipoRequisito: 'OPCIONAL', tipoDocumentoSoporte: { codigo: 'SEGURIDAD_SOCIAL', nombre: 'Seguridad Social', descripcion: null } },
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
      const comisionadoRepo = { findOne: jest.fn().mockResolvedValue(comisionado), save: jest.fn() };
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({}),
        create: jest.fn().mockImplementation((ent) => ({ ...ent, id: 'sol-borrador' })),
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

      const module = await createMockModule({ comisionadoRepo, solicitudRepo, dataSource });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.crearSolicitud({
        comisionadoId: 'com-001',
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Cundinamarca',
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-05',
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
  });
});
