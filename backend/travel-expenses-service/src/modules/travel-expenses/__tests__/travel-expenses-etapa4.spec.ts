import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TravelExpensesService } from '../travel-expenses.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { ConfigService } from '../../config/config.service';
import { EstadoSolicitud } from '../../../entities/estado-solicitud.enum';

describe('TravelExpensesService — Etapa 4 (RF-REC-001)', () => {
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
    autorizacionHabeasData: true,
    fechaAutorizacionHabeasData: new Date(),
    ipRegistroHabeasData: '127.0.0.1',
    idDependencia: 1,
    creadoEn: new Date(),
    actualizadoEn: new Date(),
  } as ComisionadoEntity;

  const createMockModule = (overrides: {
    comisionadoRepo?: any;
    solicitudRepo?: any;
    documentoRepo?: any;
    historialRepo?: any;
    dataSource?: any;
    configService?: any;
  } = {}) => {
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

  describe('obtenerBandejaSecretario', () => {
    it('debe retornar únicamente solicitudes en estado SOLICITADO', async () => {
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
        extemporanea: false,
        motivoDevolucion: null,
        fechaRevision: null,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        creadoPorUsuarioId: 'user-001',
      };

      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(1),
          getMany: jest.fn().mockResolvedValue([entidad]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.obtenerBandejaSecretario();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].estadoSolicitud).toBe('SOLICITADO');
      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
    });

    it('debe aplicar filtro por dependencia_id', async () => {
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await svc.obtenerBandejaSecretario({ dependenciaId: '1', page: 1, limit: 10 });

      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
    });

    it('debe aplicar filtro por prioridad', async () => {
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await svc.obtenerBandejaSecretario({ prioridad: 'ALTA', page: 1, limit: 10 });

      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
    });

    it('debe aplicar filtro por extemporanea', async () => {
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await svc.obtenerBandejaSecretario({ extemporanea: true, page: 1, limit: 10 });

      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
    });

    it('debe aplicar filtro por rango de fechas', async () => {
      const solicitudRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          addOrderBy: jest.fn().mockReturnThis(),
          offset: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
          getMany: jest.fn().mockResolvedValue([]),
        }),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await svc.obtenerBandejaSecretario({
        fechaInicio: '2026-09-01',
        fechaFin: '2026-09-30',
        page: 1,
        limit: 10,
      });

      expect(solicitudRepo.createQueryBuilder).toHaveBeenCalledWith('s');
    });
  });

  describe('actualizarPrioridad', () => {
    it('debe actualizar la prioridad de una solicitud SOLICITADA y marcar fecha_revision', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'SOLICITADO',
        prioridad: 'MEDIA',
        fechaRevision: null,
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(solicitud),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.actualizarPrioridad('sol-001', 'ALTA', 'user-001', false);

      expect(result.prioridad).toBe('ALTA');
      expect(result.fechaRevision).toBeDefined();
    });

    it('debe lanzar 404 si la solicitud no existe', async () => {
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.actualizarPrioridad('no-existe', 'ALTA', 'user-001', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar 400 si la solicitud no está en SOLICITADO (rol no superadmin)', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'sol-001',
          estadoSolicitud: 'RADICADA',
        }),
      };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.actualizarPrioridad('sol-001', 'ALTA', 'user-001', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir actualizar prioridad a SUPER_ADMIN sin importar el estado', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'APROBADO_JEFE',
        prioridad: 'BAJA',
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(solicitud),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.actualizarPrioridad('sol-001', 'ALTA', 'user-001', true);

      expect(result.prioridad).toBe('ALTA');
    });
  });

  describe('devolverSolicitud', () => {
    it('debe transicionar a DEVUELTA y registrar en historial', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'SOLICITADO',
        motivoDevolucion: null,
        fechaRevision: null,
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(solicitud),
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
              if (nombre === 'SolicitudComisionEntity' || nombre === 'solicitudes_comision') return solicitudRepo;
              if (nombre === 'SolicitudHistorialEstadoEntity' || nombre === 'solicitudes_historial_estados') return historialRepo;
              return {};
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({ solicitudRepo, historialRepo, dataSource });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.devolverSolicitud('sol-001', 'Falta soporte digital', 'user-001', false);

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.DEVUELTA);
      expect(result.motivoDevolucion).toBe('Falta soporte digital');
      expect(historialRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          solicitudId: 'sol-001',
          estadoAnterior: 'SOLICITADO',
          estadoNuevo: EstadoSolicitud.DEVUELTA,
          usuarioId: 'user-001',
          comentarios: 'Falta soporte digital',
        }),
      );
    });

    it('debe lanzar 400 si el motivo viene vacío', async () => {
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue({ id: 'sol-001' }) };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.devolverSolicitud('sol-001', '   ', 'user-001', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar 404 si la solicitud no existe', async () => {
      const solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.devolverSolicitud('no-existe', 'Falta soporte', 'user-001', false),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar 400 si la solicitud no está en SOLICITADO (rol no superadmin)', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'sol-001',
          estadoSolicitud: 'RADICADA',
        }),
      };
      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.devolverSolicitud('sol-001', 'Falta soporte', 'user-001', false),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir devolver a SUPER_ADMIN sin importar el estado', async () => {
      const solicitud = {
        id: 'sol-001',
        consecutivoUnico: 'COM-2026-0001',
        estadoSolicitud: 'APROBADO_JEFE',
        motivoDevolucion: null,
        fechaRevision: null,
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue(solicitud),
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
              if (nombre === 'SolicitudComisionEntity' || nombre === 'solicitudes_comision') return solicitudRepo;
              if (nombre === 'SolicitudHistorialEstadoEntity' || nombre === 'solicitudes_historial_estados') return historialRepo;
              return {};
            }),
          };
          return cb(manager);
        }),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({ solicitudRepo, historialRepo, dataSource });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.devolverSolicitud('sol-001', 'Falta soporte', 'user-001', true);

      expect(result.estadoSolicitud).toBe(EstadoSolicitud.DEVUELTA);
    });
  });

  describe('inmutabilidad y bypass Super Admin', () => {
    it('debe bloquear subida de documentos en SOLICITADO para usuario normal', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'sol-001',
          consecutivoUnico: 'COM-2026-0001',
          estadoSolicitud: 'SOLICITADO',
        }),
        create: jest.fn(),
        save: jest.fn(),
        createQueryBuilder: jest.fn(),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      await expect(
        svc.subirDocumento('sol-001', {
          tipoDocumento: 'RUT',
          file: {
            originalname: 'rut.pdf',
            mimetype: 'application/pdf',
            filename: 'rut-123.pdf',
          } as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe permitir subida de documentos en SOLICITADO para SUPER_ADMIN', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'sol-001',
          consecutivoUnico: 'COM-2026-0001',
          estadoSolicitud: 'SOLICITADO',
        }),
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockResolvedValue({ id: 'doc-001' }),
        createQueryBuilder: jest.fn(),
      };

      const documentoRepo = {
        create: jest.fn().mockImplementation((ent) => ent),
        save: jest.fn().mockResolvedValue({ id: 'doc-001' }),
      };

      const module = await createMockModule({ solicitudRepo, documentoRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.subirDocumento('sol-001', {
        tipoDocumento: 'RUT',
        file: {
          originalname: 'rut.pdf',
          mimetype: 'application/pdf',
          filename: 'rut-123.pdf',
        } as any,
        isSuperAdmin: true,
      });

      expect(result).toBeDefined();
    });

    it('debe permitir edición de solicitud en SOLICITADO para SUPER_ADMIN', async () => {
      const solicitudRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 'sol-001',
          estadoSolicitud: 'SOLICITADO',
          prioridad: 'MEDIA',
        }),
        save: jest.fn().mockImplementation(async (ent) => ent),
      };

      const module = await createMockModule({ solicitudRepo });
      const svc = module.get<TravelExpensesService>(TravelExpensesService);

      const result = await svc.actualizarSolicitud('sol-001', { prioridad: 'ALTA' }, true);

      expect(result.prioridad).toBe('ALTA');
    });
  });
});
