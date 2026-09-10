import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SecondLevelSodGuard, SecondLevelSodProtected } from '../second-level-sod.guard';
import { DataSource } from 'typeorm';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';

/**
 * Pruebas unitarias para el guardia de Segregación de Funciones (SoD)
 * de segunda revisión — RF-REV-002.
 *
 * El guardia valida que el revisor de segundo nivel (CONTROL_VIATICOS) no
 * sea el comisionado, el creador original, el analista que verificó en
 * 1er nivel ni el usuario que exportó a SIIF. El rol SUPER_ADMIN tiene
 * bypass operativo.
 */
describe('SecondLevelSodGuard — RF-REV-002', () => {
  let guard: SecondLevelSodGuard;

  const createMockModule = (dataSource: any = {}) => {
    return Test.createTestingModule({
      providers: [
        SecondLevelSodGuard,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await createMockModule();
    guard = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);
  });

  it('debe estar definido', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const mockSolicitudQb = (rows: any[] = []) => ({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(rows[0] || null),
    });

    const createContext = (
      user: any,
      params: Record<string, any>,
    ): ExecutionContext => {
      const handler = () => {};
      Reflect.defineMetadata('second_level_sod_param_key', 'id', handler);
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user, params }),
        }),
        getHandler: () => handler,
      } as unknown as ExecutionContext;
    };

    it('debe permitir acceso cuando no hay usuario autenticado', async () => {
      const result = await guard.canActivate(
        createContext(undefined, { id: 'sol-001' }),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso cuando no hay solicitudId en params', async () => {
      const result = await guard.canActivate(
        createContext({ userId: 'user-001' }, {}),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso cuando usuario no tiene userId', async () => {
      const result = await guard.canActivate(
        createContext({ roles: ['CONTROL_VIATICOS'] }, { id: 'sol-001' }),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso para super admin (rol SUPER_ADMIN)', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'admin-001', roles: ['SUPER_ADMIN'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso para super admin (rol SUPER_ADMINISTRADOR)', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'admin-001', roles: ['SUPER_ADMINISTRADOR'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso para super admin con rol en user.role (string)', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'admin-001', role: 'ADMIN' },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso para super admin con rol SUPERUSER', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'admin-001', roles: ['SUPERUSER'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso para super admin con rol ADMINISTRATIVO', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'admin-001', roles: ['ADMINISTRATIVO'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe lanzar ForbiddenException cuando el revisor ES el comisionado', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: 'user-001',
        creadoPorUsuarioId: 'user-creador',
        analistaAsignadoId: 'analista-001',
        usuarioExportadorId: 'exportador-001',
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['CONTROL_VIATICOS'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['CONTROL_VIATICOS'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(
        'Violacion de Segregacion de Funciones: El revisor de segundo nivel debe ser diferente del analista que verifico la solicitud',
      );
    });

    it('debe lanzar ForbiddenException cuando el revisor ES el creador', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-001',
        analistaAsignadoId: 'analista-001',
        usuarioExportadorId: 'exportador-001',
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['CONTROL_VIATICOS'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException cuando el revisor ES el analista asignado', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador',
        analistaAsignadoId: 'user-001',
        usuarioExportadorId: 'exportador-001',
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['CONTROL_VIATICOS'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException cuando el revisor ES el exportador SIIF', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador',
        analistaAsignadoId: 'analista-001',
        usuarioExportadorId: 'user-001',
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['CONTROL_VIATICOS'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe permitir acceso cuando el revisor NO participó en etapas previas', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador',
        analistaAsignadoId: 'analista-001',
        usuarioExportadorId: 'exportador-001',
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'revisor-independiente', roles: ['CONTROL_VIATICOS'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso cuando la solicitud no existe en la base de datos', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([])),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'user-001', roles: ['CONTROL_VIATICOS'] },
          { id: 'sol-inexistente' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso cuando comisionadoId está null y userId no coincide', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: null,
        creadoPorUsuarioId: 'user-creador',
        analistaAsignadoId: 'analista-001',
        usuarioExportadorId: null,
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest
            .fn()
            .mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };
      const module = await createMockModule(dataSource);
      const g = module.get<SecondLevelSodGuard>(SecondLevelSodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'revisor-independiente', roles: ['CONTROL_VIATICOS'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });
  });

  describe('SecondLevelSodProtected decorator', () => {
    it('debe registrar el metadata del param key en el target', () => {
      const handler = jest.fn();
      SecondLevelSodProtected('miParam')(handler as any);

      const metadata = Reflect.getMetadata(
        'second_level_sod_param_key',
        handler,
      );
      expect(metadata).toBe('miParam');
    });

    it('debe registrar el metadata por defecto (id) cuando no se pasa paramKey', () => {
      const handler = jest.fn();
      SecondLevelSodProtected()(handler as any);

      const metadata = Reflect.getMetadata(
        'second_level_sod_param_key',
        handler,
      );
      expect(metadata).toBe('id');
    });
  });
});
