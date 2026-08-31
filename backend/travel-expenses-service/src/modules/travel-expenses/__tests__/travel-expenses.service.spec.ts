import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { TravelExpensesService } from '../travel-expenses.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';

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

  const createMockModule = (overrides: {
    comisionadoRepo?: any;
    solicitudRepo?: any;
    documentoRepo?: any;
    dataSource?: any;
  } = {}) => {
    const {
      comisionadoRepo = { findOne: jest.fn(), save: jest.fn() },
      solicitudRepo = { createQueryBuilder: jest.fn(), create: jest.fn(), save: jest.fn() },
      documentoRepo = { create: jest.fn(), save: jest.fn() },
      dataSource = { transaction: jest.fn(), createQueryBuilder: jest.fn() },
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
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([entidad]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudes();

      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
      expect(result).toHaveLength(1);
      expect(result[0].consecutivoUnico).toBe('COM-2026-0001');
      expect(result[0].comisionado.numeroDocumento).toBe('1234567890');
      expect(result[0].montoViaticos).toBe(560000);
      expect(result[0].diasComision).toBe(5);
      expect(result[0].creadoPorUsuarioId).toBe('user-001');
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
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([entidad]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudes('user-001', false);

      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
      expect(result).toHaveLength(1);
      expect(result[0].esCreadoPorMi).toBeUndefined();
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
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([entidad]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudes('user-001', true);

      expect(result).toHaveLength(1);
      expect(result[0].esCreadoPorMi).toBe(true);
    });

    it('debe retornar lista vacía cuando no hay solicitudes', async () => {
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerSolicitudes('user-001', false);

      expect(result).toEqual([]);
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
        create: jest.fn().mockImplementation((ent) => ({ ...ent, id: 'sol-ext' })),
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
});
