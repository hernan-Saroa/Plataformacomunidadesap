import { Test, TestingModule } from '@nestjs/testing';
import { LiquidationConfigService } from '../liquidation-config.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EscalaViaticoEntity } from '../../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../../entities/liquidation/tarifa-investigador.entity';
import { TarifaTransporteTerminalEntity } from '../../../entities/liquidation/tarifa-transporte-terminal.entity';
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
  const mockTerminalRepo = {
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
    invalidarCache: jest.fn(),
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
          provide: getRepositoryToken(TarifaTransporteTerminalEntity),
          useValue: mockTerminalRepo,
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

  describe('obtenerTarifasTransporteTerminal', () => {
    it('debe retornar tarifas de terminales activas', async () => {
      const mockTarifas = [
        { id: 1, departamento: 'ANTIOQUIA', ciudadAeropuerto: 'ANTIOQUIA (Rionegro)', valorMaximoTrayecto: 162634, activo: true },
      ];
      mockTerminalRepo.find.mockResolvedValue(mockTarifas);

      const result = await service.obtenerTarifasTransporteTerminal();
      expect(result).toEqual(mockTarifas);
    });
  });

  describe('crearTarifaTransporteTerminal', () => {
    it('debe crear una tarifa de terminal exitosamente', async () => {
      const dto = {
        ciudad: 'ANTIOQUIA',
        ciudadAeropuerto: 'ANTIOQUIA (Rionegro)',
        valorMaximoTrayecto: 162634,
      };
      mockTerminalRepo.findOne.mockResolvedValue(null);
      const savedEntity = { id: 1, ...dto, activo: true };
      mockTerminalRepo.create.mockReturnValue(savedEntity);
      mockTerminalRepo.save.mockResolvedValue(savedEntity);

      const result = await service.crearTarifaTransporteTerminal(dto);
      expect(result).toEqual(savedEntity);
    });

    it('debe lanzar BadRequestException si ya existe tarifa para el departamento y ciudad', async () => {
      const dto = {
        ciudad: 'ANTIOQUIA',
        ciudadAeropuerto: 'ANTIOQUIA (Rionegro)',
        valorMaximoTrayecto: 162634,
      };
      mockTerminalRepo.findOne.mockResolvedValue({
        id: 1,
        ciudad: 'ANTIOQUIA',
        ciudadAeropuerto: 'ANTIOQUIA (Rionegro)',
      });

      await expect(service.crearTarifaTransporteTerminal(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('obtenerParametros', () => {
    it('debe retornar todos los parámetros incluyendo el SMMLV maestro de solo lectura', async () => {
      const mockParams = [
        { id: 2, clave: 'FACTOR_CONTRATISTA', valor: '0.8', tipo: 'NUMBER' },
      ];
      mockParamRepo.find.mockResolvedValue(mockParams);

      const result = await service.obtenerParametros();
      expect(result.some((p) => p.clave === 'SMMLV_2026')).toBe(true);
      expect(result.some((p) => p.clave === 'FACTOR_CONTRATISTA')).toBe(true);
    });
  });

  describe('actualizarParametrosLote', () => {
    it('debe actualizar parámetros en una transacción', async () => {
      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        const mockManager = {
          findOne: jest.fn().mockResolvedValueOnce({
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
