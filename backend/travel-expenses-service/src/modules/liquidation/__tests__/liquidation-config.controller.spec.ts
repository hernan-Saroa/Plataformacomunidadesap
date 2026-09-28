import { Test, TestingModule } from '@nestjs/testing';
import { LiquidationConfigController } from '../liquidation-config.controller';
import { LiquidationConfigService } from '../liquidation-config.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions.guard';
import { Permissions } from '../../common/permissions.decorator';

describe('LiquidationConfigController (integration)', () => {
  let controller: LiquidationConfigController;
  let service: LiquidationConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiquidationConfigController],
      providers: [
        {
          provide: LiquidationConfigService,
          useValue: {
            obtenerEscalas: jest.fn(),
            crearEscala: jest.fn(),
            actualizarEscala: jest.fn(),
            eliminarEscala: jest.fn(),
            obtenerTarifasInvestigadores: jest.fn(),
            crearTarifaInvestigador: jest.fn(),
            actualizarTarifaInvestigador: jest.fn(),
            eliminarTarifaInvestigador: jest.fn(),
            obtenerTarifasTransporteTerminal: jest.fn(),
            crearTarifaTransporteTerminal: jest.fn(),
            actualizarTarifaTransporteTerminal: jest.fn(),
            eliminarTarifaTransporteTerminal: jest.fn(),
            obtenerParametros: jest.fn(),
            actualizarParametrosLote: jest.fn(),
            obtenerCatalogoDepartamentos: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LiquidationConfigController>(
      LiquidationConfigController,
    );
    service = module.get<LiquidationConfigService>(LiquidationConfigService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /liquidation/config/escalas', () => {
    it('debe retornar lista de escalas', async () => {
      const mockEscalas = [
        {
          id: 1,
          decretoVigente: 'Decreto 314',
          anoVigencia: 2026,
          rangoMinimo: 1000,
          rangoMaximo: 2000,
          tarifaDiaria: 500,
          activo: true,
        },
      ];
      jest.spyOn(service, 'obtenerEscalas').mockResolvedValue(mockEscalas);

      const result = await controller.obtenerEscalas();
      expect(result).toEqual(mockEscalas);
    });
  });

  describe('POST /liquidation/config/escalas', () => {
    it('debe crear una escala', async () => {
      const dto = {
        decretoVigente: 'Decreto 314',
        anoVigencia: 2026,
        rangoMinimo: 1000,
        rangoMaximo: 2000,
        tarifaDiaria: 500,
      };
      const created = { id: 1, ...dto, activo: true };
      jest.spyOn(service, 'crearEscala').mockResolvedValue(created);

      const result = await controller.crearEscala(dto);
      expect(result).toEqual(created);
    });
  });

  describe('PUT /liquidation/config/escalas/:id', () => {
    it('debe actualizar una escala', async () => {
      const updated = { id: 1, tarifaDiaria: 600 };
      jest.spyOn(service, 'actualizarEscala').mockResolvedValue(updated);

      const result = await controller.actualizarEscala('1', {
        tarifaDiaria: 600,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('DELETE /liquidation/config/escalas/:id', () => {
    it('debe eliminar (soft-delete) una escala', async () => {
      const response = { message: 'Escala eliminada correctamente' };
      jest.spyOn(service, 'eliminarEscala').mockResolvedValue(response);

      const result = await controller.eliminarEscala('1');
      expect(result).toEqual(response);
    });
  });

  describe('GET /liquidation/config/tarifas-investigadores', () => {
    it('debe retornar lista de tarifas', async () => {
      const mockTarifas = [
        {
          id: 1,
          categoriaInvestigador: 'JUNIOR',
          tarifaDiaria: 450000,
          activo: true,
        },
      ];
      jest
        .spyOn(service, 'obtenerTarifasInvestigadores')
        .mockResolvedValue(mockTarifas);

      const result = await controller.obtenerTarifasInvestigadores();
      expect(result).toEqual(mockTarifas);
    });
  });

  describe('POST /liquidation/config/tarifas-investigadores', () => {
    it('debe crear una tarifa', async () => {
      const dto = { categoriaInvestigador: 'JUNIOR', tarifaDiaria: 450000 };
      const created = {
        id: 1,
        categoriaInvestigador: 'JUNIOR',
        tarifaDiaria: 450000,
        activo: true,
      };
      jest.spyOn(service, 'crearTarifaInvestigador').mockResolvedValue(created);

      const result = await controller.crearTarifaInvestigador(dto);
      expect(result).toEqual(created);
    });
  });

  describe('PUT /liquidation/config/tarifas-investigadores/:id', () => {
    it('debe actualizar una tarifa', async () => {
      const updated = { id: 1, tarifaDiaria: 500000 };
      jest
        .spyOn(service, 'actualizarTarifaInvestigador')
        .mockResolvedValue(updated);

      const result = await controller.actualizarTarifaInvestigador('1', {
        tarifaDiaria: 500000,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('DELETE /liquidation/config/tarifas-investigadores/:id', () => {
    it('debe eliminar (soft-delete) una tarifa', async () => {
      const response = {
        message: 'Tarifa de investigador eliminada correctamente',
      };
      jest
        .spyOn(service, 'eliminarTarifaInvestigador')
        .mockResolvedValue(response);

      const result = await controller.eliminarTarifaInvestigador('1');
      expect(result).toEqual(response);
    });
  });

  describe('GET /liquidation/config/tarifas-transporte-terminal', () => {
    it('debe retornar lista de tarifas de transporte terminal', async () => {
      const mockTarifas = [
        { id: 1, departamento: 'ANTIOQUIA', ciudadAeropuerto: 'ANTIOQUIA (Rionegro)', valorMaximoTrayecto: 162634, activo: true },
      ];
      jest
        .spyOn(service, 'obtenerTarifasTransporteTerminal')
        .mockResolvedValue(mockTarifas);

      const result = await controller.obtenerTarifasTransporteTerminal();
      expect(result).toEqual(mockTarifas);
    });
  });

  describe('POST /liquidation/config/tarifas-transporte-terminal', () => {
    it('debe crear una tarifa de transporte terminal', async () => {
      const dto = {
        departamento: 'ANTIOQUIA',
        ciudadAeropuerto: 'ANTIOQUIA (Rionegro)',
        valorMaximoTrayecto: 162634,
      };
      const created = { id: 1, ...dto, activo: true };
      jest.spyOn(service, 'crearTarifaTransporteTerminal').mockResolvedValue(created);

      const result = await controller.crearTarifaTransporteTerminal(dto);
      expect(result).toEqual(created);
    });
  });

  describe('PUT /liquidation/config/tarifas-transporte-terminal/:id', () => {
    it('debe actualizar una tarifa de transporte terminal', async () => {
      const updated = { id: 1, valorMaximoTrayecto: 170000 };
      jest
        .spyOn(service, 'actualizarTarifaTransporteTerminal')
        .mockResolvedValue(updated);

      const result = await controller.actualizarTarifaTransporteTerminal('1', {
        valorMaximoTrayecto: 170000,
      });
      expect(result).toEqual(updated);
    });
  });

  describe('DELETE /liquidation/config/tarifas-transporte-terminal/:id', () => {
    it('debe eliminar (soft-delete) una tarifa de transporte terminal', async () => {
      const response = {
        message: 'Tarifa de transporte a terminal eliminada correctamente',
      };
      jest
        .spyOn(service, 'eliminarTarifaTransporteTerminal')
        .mockResolvedValue(response);

      const result = await controller.eliminarTarifaTransporteTerminal('1');
      expect(result).toEqual(response);
    });
  });

  describe('GET /liquidation/config/parametros', () => {
    it('debe retornar lista de parámetros', async () => {
      const mockParams = [
        { id: 1, clave: 'SMMLV_2026', valor: '1423500', tipo: 'NUMBER' },
      ];
      jest.spyOn(service, 'obtenerParametros').mockResolvedValue(mockParams);

      const result = await controller.obtenerParametros();
      expect(result).toEqual(mockParams);
    });
  });

  describe('PUT /liquidation/config/parametros', () => {
    it('debe actualizar parámetros en lote', async () => {
      const updatedParams = [
        { id: 2, clave: 'FACTOR_CONTRATISTA', valor: '0.75' },
      ];
      jest
        .spyOn(service, 'actualizarParametrosLote')
        .mockResolvedValue(updatedParams);

      const result = await controller.actualizarParametros({
        factorContratista: 0.75,
      });
      expect(result).toEqual(updatedParams);
    });
  });

  describe('GET /liquidation/config/catalogo-departamentos', () => {
    it('debe retornar catálogo de departamentos', async () => {
      const mockDeptos = ['Amazonas', 'Antioquia', 'Cundinamarca'];
      jest
        .spyOn(service, 'obtenerCatalogoDepartamentos')
        .mockResolvedValue(mockDeptos);

      const result = await controller.obtenerCatalogoDepartamentos();
      expect(result).toEqual(mockDeptos);
    });
  });
});
