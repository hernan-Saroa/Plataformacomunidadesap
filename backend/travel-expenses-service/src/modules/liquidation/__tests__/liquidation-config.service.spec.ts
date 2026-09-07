import { Test, TestingModule } from '@nestjs/testing';
import { LiquidationConfigService } from '../liquidation-config.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EscalaViaticoEntity } from '../../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../../entities/liquidation/tarifa-investigador.entity';
import { TarifaRegionalExcepcionEntity } from '../../../entities/liquidation/tarifa-regional-excepcion.entity';
import { LiquidationParamEntity } from '../../../entities/liquidation/liquidation-param.entity';
import { LiquidationService } from '../liquidation.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LiquidationConfigService', () => {
  let service: LiquidationConfigService;

  const mockEscalaRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockInvestigadorRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockRegionalRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockParamRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockDataSource = {
    transaction: jest.fn(),
  };
  const mockLiquidationService = {
    recargarParametros: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiquidationConfigService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        {
          provide: getRepositoryToken(EscalaViaticoEntity),
          useValue: mockEscalaRepo,
        },
        {
          provide: getRepositoryToken(TarifaInvestigadorEntity),
          useValue: mockInvestigadorRepo,
        },
        {
          provide: getRepositoryToken(TarifaRegionalExcepcionEntity),
          useValue: mockRegionalRepo,
        },
        {
          provide: getRepositoryToken(LiquidationParamEntity),
          useValue: mockParamRepo,
        },
        { provide: LiquidationService, useValue: mockLiquidationService },
      ],
    }).compile();

    service = module.get<LiquidationConfigService>(LiquidationConfigService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('obtenerEscalas', () => {
    it('debe retornar escalas activas ordenadas', async () => {
      const mockEscalas = [
        {
          id: 1,
          anoVigencia: 2026,
          rangoMinimo: 1000,
          rangoMaximo: 2000,
          tarifaDiaria: 500,
          activo: true,
        },
      ];
      mockEscalaRepo.find.mockResolvedValue(mockEscalas);

      const result = await service.obtenerEscalas();
      expect(result).toEqual(mockEscalas);
      expect(mockEscalaRepo.find).toHaveBeenCalledWith({
        where: { activo: true },
        order: { anoVigencia: 'DESC', rangoMinimo: 'ASC' },
      });
    });
  });

  describe('crearEscala', () => {
    it('debe crear una escala exitosamente', async () => {
      const dto = {
        decretoVigente: 'Decreto 314',
        anoVigencia: 2026,
        rangoMinimo: 1000,
        rangoMaximo: 2000,
        tarifaDiaria: 500,
      };
      mockEscalaRepo.findOne.mockResolvedValue(null);
      const savedEntity = { id: 1, ...dto, activo: true };
      mockEscalaRepo.create.mockReturnValue(savedEntity);
      mockEscalaRepo.save.mockResolvedValue(savedEntity);

      const result = await service.crearEscala(dto);
      expect(result).toEqual(savedEntity);
      expect(mockEscalaRepo.save).toHaveBeenCalledWith(savedEntity);
    });

    it('debe lanzar BadRequestException si ya existe escala activa para el año', async () => {
      const dto = {
        decretoVigente: 'Decreto 314',
        anoVigencia: 2026,
        rangoMinimo: 1000,
        rangoMaximo: 2000,
        tarifaDiaria: 500,
      };
      mockEscalaRepo.findOne.mockResolvedValue({ id: 1, anoVigencia: 2026 });

      await expect(service.crearEscala(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('actualizarEscala', () => {
    it('debe actualizar una escala existente', async () => {
      const existing = {
        id: 1,
        decretoVigente: 'Decreto 314',
        anoVigencia: 2026,
        rangoMinimo: 1000,
        rangoMaximo: 2000,
        tarifaDiaria: 500,
        activo: true,
      };
      mockEscalaRepo.findOne.mockResolvedValue(existing);
      const updated = { ...existing, tarifaDiaria: 600 };
      mockEscalaRepo.save.mockResolvedValue(updated);

      const result = await service.actualizarEscala(1, { tarifaDiaria: 600 });
      expect(result.tarifaDiaria).toBe(600);
    });

    it('debe lanzar NotFoundException si la escala no existe', async () => {
      mockEscalaRepo.findOne.mockResolvedValue(null);
      await expect(
        service.actualizarEscala(999, { tarifaDiaria: 600 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('eliminarEscala', () => {
    it('debe hacer soft-delete de la escala', async () => {
      const existing = { id: 1, activo: true };
      mockEscalaRepo.findOne.mockResolvedValue(existing);
      mockEscalaRepo.save.mockResolvedValue({ ...existing, activo: false });

      const result = await service.eliminarEscala(1);
      expect(result.message).toBe('Escala eliminada correctamente');
      expect(mockEscalaRepo.save).toHaveBeenCalledWith({
        ...existing,
        activo: false,
      });
    });
  });

  describe('obtenerTarifasInvestigadores', () => {
    it('debe retornar tarifas activas', async () => {
      const mockTarifas = [
        {
          id: 1,
          categoriaInvestigador: 'JUNIOR',
          tarifaDiaria: 450000,
          activo: true,
        },
      ];
      mockInvestigadorRepo.find.mockResolvedValue(mockTarifas);

      const result = await service.obtenerTarifasInvestigadores();
      expect(result).toEqual(mockTarifas);
    });
  });

  describe('crearTarifaInvestigador', () => {
    it('debe crear una tarifa exitosamente', async () => {
      const dto = { categoriaInvestigador: 'JUNIOR', tarifaDiaria: 450000 };
      mockInvestigadorRepo.findOne.mockResolvedValue(null);
      const savedEntity = {
        id: 1,
        categoriaInvestigador: 'JUNIOR',
        tarifaDiaria: 450000,
        activo: true,
      };
      mockInvestigadorRepo.create.mockReturnValue(savedEntity);
      mockInvestigadorRepo.save.mockResolvedValue(savedEntity);

      const result = await service.crearTarifaInvestigador(dto);
      expect(result).toEqual(savedEntity);
    });

    it('debe lanzar BadRequestException si ya existe tarifa para la categoría', async () => {
      const dto = { categoriaInvestigador: 'JUNIOR', tarifaDiaria: 450000 };
      mockInvestigadorRepo.findOne.mockResolvedValue({
        id: 1,
        categoriaInvestigador: 'JUNIOR',
      });

      await expect(service.crearTarifaInvestigador(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('obtenerExcepcionesRegionales', () => {
    it('debe retornar excepciones activas', async () => {
      const mockExcepciones = [
        { id: 1, departamento: 'Amazonas', tarifaDiaria: 380000, activo: true },
      ];
      mockRegionalRepo.find.mockResolvedValue(mockExcepciones);

      const result = await service.obtenerExcepcionesRegionales();
      expect(result).toEqual(mockExcepciones);
    });
  });

  describe('crearExcepcionRegional', () => {
    it('debe crear una excepción exitosamente', async () => {
      const dto = {
        departamento: 'Amazonas',
        esNuevoDepartamento: true,
        tarifaDiaria: 380000,
        decretoReferencia: 'Decreto 314',
      };
      mockRegionalRepo.findOne.mockResolvedValue(null);
      const savedEntity = { id: 1, ...dto, activo: true };
      mockRegionalRepo.create.mockReturnValue(savedEntity);
      mockRegionalRepo.save.mockResolvedValue(savedEntity);

      const result = await service.crearExcepcionRegional(dto);
      expect(result).toEqual(savedEntity);
    });

    it('debe lanzar BadRequestException si ya existe excepción para el departamento', async () => {
      const dto = {
        departamento: 'Amazonas',
        esNuevoDepartamento: true,
        tarifaDiaria: 380000,
      };
      mockRegionalRepo.findOne.mockResolvedValue({
        id: 1,
        departamento: 'Amazonas',
      });

      await expect(service.crearExcepcionRegional(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('obtenerParametros', () => {
    it('debe retornar todos los parámetros', async () => {
      const mockParams = [
        { id: 1, clave: 'SMMLV_2026', valor: '1423500', tipo: 'NUMBER' },
      ];
      mockParamRepo.find.mockResolvedValue(mockParams);

      const result = await service.obtenerParametros();
      expect(result).toEqual(mockParams);
    });
  });

  describe('actualizarParametrosLote', () => {
    it('debe actualizar parámetros en una transacción', async () => {
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        const mockManager = {
          findOne: jest
            .fn()
            .mockResolvedValueOnce({
              id: 1,
              clave: 'SMMLV_2026',
              valor: '1300000',
            })
            .mockResolvedValueOnce({
              id: 2,
              clave: 'FACTOR_CONTRATISTA',
              valor: '0.8',
            }),
          create: jest.fn().mockReturnValue({}),
          save: jest.fn().mockResolvedValue({}),
        };
        return cb(mockManager);
      });
      mockLiquidationService.recargarParametros.mockResolvedValue(undefined);

      const result = await service.actualizarParametrosLote({
        smmlv: 1423500,
        factorContratista: 0.8,
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockLiquidationService.recargarParametros).toHaveBeenCalled();
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('obtenerCatalogoDepartamentos', () => {
    it('debe retornar lista de departamentos', async () => {
      const result = await service.obtenerCatalogoDepartamentos();
      expect(result).toContain('Amazonas');
      expect(result).toContain('Cundinamarca');
      expect(result.length).toBeGreaterThan(20);
    });
  });
});
