import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { SodGuard, SodProtected } from '../sod.guard';
import { DataSource } from 'typeorm';
import { SolicitudComisionEntity } from '../../entities/solicitud-comision.entity';

describe('SodGuard — RF-REC-002 Etapa 5', () => {
  let guard: SodGuard;

  const createMockModule = (dataSource: any = {}) => {
    return Test.createTestingModule({
      providers: [
        SodGuard,
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();
  };

  beforeEach(async () => {
    const module = await createMockModule();
    guard = module.get<SodGuard>(SodGuard);
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
      Reflect.defineMetadata('sod_param_key', 'id', handler);
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
        createContext({ roles: ['ANALISTA'] }, { id: 'sol-001' }),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso para super admin (rol ADMIN)', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };

      const module = await createMockModule(dataSource);
      const g = module.get<SodGuard>(SodGuard);

      const result = await g.canActivate(
        createContext({ userId: 'admin-001', roles: ['ADMIN'] }, { id: 'sol-001' }),
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
      const g = module.get<SodGuard>(SodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'super-001', roles: ['SUPER_ADMIN'] },
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
      const g = module.get<SodGuard>(SodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'admin-001', roles: ['ADMINISTRATIVO'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso para super admin con rol SUPER_ADMINISTRADOR', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };

      const module = await createMockModule(dataSource);
      const g = module.get<SodGuard>(SodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'admin-001', roles: ['SUPER_ADMINISTRADOR'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso cuando el usuario no es comisionado ni creador', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-creador-1',
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };

      const module = await createMockModule(dataSource);
      const g = module.get<SodGuard>(SodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'analista-001', roles: ['ANALISTA'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe lanzar ForbiddenException cuando el usuario ES el comisionado', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: 'user-001',
        creadoPorUsuarioId: 'user-creador-1',
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };

      const module = await createMockModule(dataSource);
      const g = module.get<SodGuard>(SodGuard);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['ANALISTA'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['ANALISTA'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(
        'Infraccion de Segregacion de Funciones: Un comisionado o creador de solicitud no puede auto-auditarse',
      );
    });

    it('debe lanzar ForbiddenException cuando el usuario ES el creador', async () => {
      const solicitud = {
        id: 'sol-001',
        comisionadoId: 'com-001',
        creadoPorUsuarioId: 'user-001',
      } as SolicitudComisionEntity;

      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([solicitud])),
        }),
      };

      const module = await createMockModule(dataSource);
      const g = module.get<SodGuard>(SodGuard);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['ANALISTA'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        g.canActivate(
          createContext(
            { userId: 'user-001', roles: ['ANALISTA'] },
            { id: 'sol-001' },
          ),
        ),
      ).rejects.toThrow(
        'Infraccion de Segregacion de Funciones: Un comisionado o creador de solicitud no puede auto-auditarse',
      );
    });

    it('debe retornar true cuando la solicitud no existe en la base de datos', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb([])),
        }),
      };

      const module = await createMockModule(dataSource);
      const g = module.get<SodGuard>(SodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'user-001', roles: ['ANALISTA'] },
          { id: 'sol-inexistente' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso cuando el usuario tiene rol SUPERUSER', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };

      const module = await createMockModule(dataSource);
      const g = module.get<SodGuard>(SodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'super-001', roles: ['SUPERUSER'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });

    it('debe permitir acceso cuando el usuario tiene rol en minusculas super_administrador', async () => {
      const dataSource = {
        getRepository: jest.fn().mockReturnValue({
          createQueryBuilder: jest.fn().mockReturnValue(mockSolicitudQb()),
        }),
      };

      const module = await createMockModule(dataSource);
      const g = module.get<SodGuard>(SodGuard);

      const result = await g.canActivate(
        createContext(
          { userId: 'admin-001', roles: ['super_administrador'] },
          { id: 'sol-001' },
        ),
      );
      expect(result).toBe(true);
    });
  });
});
