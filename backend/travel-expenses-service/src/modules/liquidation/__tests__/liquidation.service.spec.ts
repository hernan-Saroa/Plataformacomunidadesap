import { Test, TestingModule } from '@nestjs/testing';
import { LiquidationService } from '../liquidation.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EscalaViaticoEntity } from '../../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../../entities/liquidation/tarifa-investigador.entity';
import { TarifaTransporteTerminalEntity } from '../../../entities/liquidation/tarifa-transporte-terminal.entity';
import { LiquidationParamEntity } from '../../../entities/liquidation/liquidation-param.entity';
import { AuthSystemSettingEntity } from '../../../entities/auth-system-setting.entity';
import {
  TipoComisionadoLiquidacion,
  CategoriaInvestigador,
} from '../../../dto/liquidation/calcular-liquidacion.dto';

describe('LiquidationService - unit by process', () => {
  const createMockModule = (
    overrides: {
      escalaRepo?: any;
      investigadorRepo?: any;
      terminalRepo?: any;
      paramRepo?: any;
      authSettingRepo?: any;
      dataSource?: any;
    } = {},
  ) => {
    const {
      escalaRepo = { find: jest.fn() },
      investigadorRepo = { findOne: jest.fn() },
      terminalRepo = {
        find: jest.fn().mockResolvedValue([
          { ciudad: 'ANTIOQUIA', ciudadAeropuerto: 'ANTIOQUIA (Rionegro)', valorMaximo: 162634, activo: true },
          { ciudad: 'ATLANTICO', ciudadAeropuerto: 'ATLANTICO (Soledad)', valorMaximo: 130704, activo: true },
          { ciudad: 'Otros', ciudadAeropuerto: 'Otros', valorMaximo: 50689, activo: true },
        ]),
      },
      paramRepo = { findOne: jest.fn() },
      authSettingRepo = { findOne: jest.fn() },
      dataSource = {},
    } = overrides;

    return Test.createTestingModule({
      providers: [
        LiquidationService,
        { provide: getDataSourceToken(), useValue: dataSource },
        {
          provide: getRepositoryToken(EscalaViaticoEntity),
          useValue: escalaRepo,
        },
        {
          provide: getRepositoryToken(TarifaInvestigadorEntity),
          useValue: investigadorRepo,
        },
        {
          provide: getRepositoryToken(TarifaTransporteTerminalEntity),
          useValue: terminalRepo,
        },
        {
          provide: getRepositoryToken(LiquidationParamEntity),
          useValue: paramRepo,
        },
        {
          provide: getRepositoryToken(AuthSystemSettingEntity),
          useValue: authSettingRepo,
        },
      ],
    }).compile();
  };

  const buildSvc = async (overrides: any = {}) => {
    const module = await createMockModule(overrides);
    return module.get<LiquidationService>(LiquidationService);
  };

  describe('1) Determinación de salario base', () => {
    it('FUNCIONARIO: usa la asignación básica enviada', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.salarioBaseAplicado).toBe(4500000);
    });

    it('DOBLE ROL: selecciona la asignación más alta', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 5102610,
              rangoMaximo: 6162456,
              tarifaDiaria: 385283,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [3500000, 5500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Medellín',
      });

      expect(result.data.salarioBaseAplicado).toBe(5500000);
    });

    it('ESTUDIANTE: usa SMMLV 2026 como salario base por defecto/contingencia', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 0,
              rangoMaximo: 1917184,
              tarifaDiaria: 173886,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.ESTUDIANTE,
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.salarioBaseAplicado).toBe(1423500);
    });

    it('ESTUDIANTE: usa SMMLV maestro centralizado desde auth.system_settings', async () => {
      const svc = await buildSvc({
        authSettingRepo: {
          findOne: jest.fn().mockResolvedValue({
            key: 'SALARIO_MINIMO_MENSUAL',
            value: JSON.stringify({
              salarioMinimo: 1600000,
              anio: 2026,
              moneda: 'COP',
            }),
          }),
        },
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 0,
              rangoMaximo: 1917184,
              tarifaDiaria: 173886,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.ESTUDIANTE,
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.salarioBaseAplicado).toBe(1600000);
    });

    it('INVESTIGADOR: usa la tarifa de investigador como base', async () => {
      const svc = await buildSvc({
        investigadorRepo: {
          findOne: jest.fn().mockResolvedValue({
            categoriaInvestigador: 'SENIOR',
            tarifaDiaria: 650000,
            activo: true,
          }),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.INVESTIGADOR,
        categoriaInvestigador: CategoriaInvestigador.SENIOR,
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.salarioBaseAplicado).toBe(650000);
    });
  });

  describe('2) Búsqueda de escala por rango salarial', () => {
    it('aplica el rango correcto para 4.500.000', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.tarifaDiariaBase).toBe(335520);
    });

    it('aplica el rango superior para salario alto', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 22958734,
              rangoMaximo: 999999999,
              tarifaDiaria: 1319516,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [30000000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.tarifaDiariaBase).toBe(1319516);
    });

    it('falla si no existe rango para el salario', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 0,
              rangoMaximo: 1000,
              tarifaDiaria: 100,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      await expect(
        svc.calcularLiquidacion({
          tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
          asignacionesBasicas: [5000000],
          fechaInicio: '2026-09-20',
          fechaFin: '2026-09-21',
          pernocta: true,
          destinoCiudad: 'Bogotá',
        }),
      ).rejects.toThrow(
        'No se encontró una escala de viáticos para el salario base 5000000',
      );
    });
  });

  describe('3) Factor por tipo de comisionado', () => {
    it('FUNCIONARIO aplica factor 1.0', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.factorComisionado).toBe(1.0);
      expect(result.data.tarifaFinalAplicadaDia).toBe(335520);
    });

    it('DOCENTE aplica factor 1.0', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.DOCENTE,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.factorComisionado).toBe(1.0);
    });

    it('CONTRATISTA aplica factor 0.8 y redondea COP', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 6162457,
              rangoMaximo: 9293915,
              tarifaDiaria: 434866,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.CONTRATISTA,
        asignacionesBasicas: [7500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Medellín',
      });

      expect(result.data.factorComisionado).toBe(0.8);
      expect(result.data.tarifaFinalAplicadaDia).toBe(347893);
    });

    it('ESTUDIANTE aplica factor 1.0', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 0,
              rangoMaximo: 1917184,
              tarifaDiaria: 173886,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.ESTUDIANTE,
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.factorComisionado).toBe(1.0);
    });

    it('INVESTIGADOR aplica factor 1.0', async () => {
      const svc = await buildSvc({
        investigadorRepo: {
          findOne: jest.fn().mockResolvedValue({
            categoriaInvestigador: 'SENIOR',
            tarifaDiaria: 650000,
            activo: true,
          }),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.INVESTIGADOR,
        categoriaInvestigador: CategoriaInvestigador.SENIOR,
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.factorComisionado).toBe(1.0);
    });
  });

  describe('4) Factor de pernocta (regla 50%)', () => {
    it('sin pernocta aplica 50% y genera alerta', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-20',
        pernocta: false,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.factorPernocta).toBe(0.5);
      expect(result.data.tarifaFinalAplicadaDia).toBe(167760);
      expect(result.data.alertas?.length).toBeGreaterThan(0);
    });

    it('con pernocta aplica 100%', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.factorPernocta).toBe(1.0);
    });
  });

  describe('5) Cálculo de días/noches', () => {
    it('sin pernocta cuenta 0.5 días según formato GF-FO-023', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-20',
        pernocta: false,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.numeroDiasNoches).toBe(0.5);
      expect(result.data.diasPernoctados).toBe(0);
      expect(result.data.diasNoPernoctados).toBe(1);
      expect(result.data.totalNoPernoctados).toBe(167760);
    });

    it('con pernocta cuenta diferencia de días más medio día de retorno', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-23',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      // 3 noches (3.0) + medio día retorno (0.5) = 3.5 días
      expect(result.data.numeroDiasNoches).toBe(3.5);
    });
  });

  describe('6) Generación de desglose diario', () => {
    it('genera un item por día con pernocta y medio día en retorno', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-22',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      // Del 20 al 22 son 2 noches completas + día 22 como retorno medio día (3 ítems en total, 2.5 días)
      expect(result.data.numeroDiasNoches).toBe(2.5);
      expect(result.data.desgloseCalculo).toHaveLength(3);
      expect(result.data.desgloseCalculo[0]).toEqual({
        dia: 1,
        fecha: '2026-09-20',
        valor: 335520,
        pernocta: true,
      });
      expect(result.data.desgloseCalculo[1]).toEqual({
        dia: 2,
        fecha: '2026-09-21',
        valor: 335520,
        pernocta: true,
      });
      // Día de retorno sin pernocta al 50%
      expect(result.data.desgloseCalculo[2]).toEqual({
        dia: 3,
        fecha: '2026-09-22',
        valor: 167760,
        pernocta: false,
      });
      expect(result.data.valorTotalViaticos).toBe(335520 + 335520 + 167760);
    });

    it('genera un solo item sin pernocta', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 4022983,
              rangoMaximo: 5102609,
              tarifaDiaria: 335520,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-20',
        pernocta: false,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.desgloseCalculo).toHaveLength(1);
      expect(result.data.desgloseCalculo[0].pernocta).toBe(false);
    });
  });

  describe('7) Redondeo COP', () => {
    it('redondea tarifa final de contratista a entero', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 6162457,
              rangoMaximo: 9293915,
              tarifaDiaria: 434866,
              anoVigencia: 2026,
            },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.CONTRATISTA,
        asignacionesBasicas: [7500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Medellín',
      });

      expect(Number.isInteger(result.data.tarifaFinalAplicadaDia)).toBe(true);
      expect(result.data.tarifaFinalAplicadaDia).toBe(347893);
    });
  });

  describe('8) Caché en memoria', () => {
    it('consulta BD solo la primera vez y reutiliza cache', async () => {
      const escalaRepo = {
        find: jest.fn().mockResolvedValue([
          {
            rangoMinimo: 4022983,
            rangoMaximo: 5102609,
            tarifaDiaria: 335520,
            anoVigencia: 2026,
          },
        ]),
      };

      const svc = await buildSvc({ escalaRepo });

      await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-21',
        fechaFin: '2026-09-22',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(escalaRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('9) Tarifas de transporte a terminales aéreos (Resolución)', () => {
    it('liquida tarifa especial de Antioquia (Rionegro) por $ 162.634', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            { rangoMinimo: 4000000, rangoMaximo: 6000000, tarifaDiaria: 335520, anoVigencia: 2026 },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [5000000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Rionegro',
        destinoDepartamento: 'Antioquia',
        incluyeTransporteAereo: true,
      });

      expect(result.data.transporteTerminalesAereos).toBe(162634);
    });

    it('liquida tarifa para destino Otros por $ 50.689', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            { rangoMinimo: 4000000, rangoMaximo: 6000000, tarifaDiaria: 335520, anoVigencia: 2026 },
          ]),
        },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [5000000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Bogotá',
        destinoDepartamento: 'Bogotá D.C.',
        incluyeTransporteAereo: true,
      });
      expect(result.data.transporteTerminalesAereos).toBe(50689);
    });
  });

  describe('10) Validaciones de entrada', () => {
    it('falla si fecha fin es anterior a inicio', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([]) },
      });

      await expect(
        svc.calcularLiquidacion({
          tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
          asignacionesBasicas: [4500000],
          fechaInicio: '2026-09-23',
          fechaFin: '2026-09-20',
          pernocta: true,
          destinoCiudad: 'Bogotá',
        }),
      ).rejects.toThrow(
        'La fecha fin no puede ser anterior a la fecha inicio.',
      );
    });

    it('falla si es investigador sin categoría', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([]) },
      });

      await expect(
        svc.calcularLiquidacion({
          tipoComisionado: TipoComisionadoLiquidacion.INVESTIGADOR,
          fechaInicio: '2026-09-20',
          fechaFin: '2026-09-21',
          pernocta: true,
          destinoCiudad: 'Bogotá',
        }),
      ).rejects.toThrow('La categoría de investigador es obligatoria');
    });

    it('falla si fechas son inválidas', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([]) },
      });

      await expect(
        svc.calcularLiquidacion({
          tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
          asignacionesBasicas: [4500000],
          fechaInicio: 'no-es-una-fecha',
          fechaFin: '2026-09-20',
          pernocta: true,
          destinoCiudad: 'Bogotá',
        }),
      ).rejects.toThrow();
    });
  });

  describe('11) Sección 4 GF-FO-023: Liquidación de Gastos de Desplazamiento', () => {
    it('liquida transporte a terminales aéreos cuando incluyeTransporteAereo=true', async () => {
      const svc = await buildSvc({
        escalaRepo: {
          find: jest.fn().mockResolvedValue([
            {
              rangoMinimo: 9000000,
              rangoMaximo: 10000000,
              tarifaDiaria: 434866,
              anoVigencia: 2026,
            },
          ]),
        },
        paramRepo: {
          findOne: jest.fn().mockImplementation(({ where: { clave } }) => {
            if (clave === 'FACTOR_CONTRATISTA') return Promise.resolve({ clave, valor: '0.8' });
            if (clave === 'FACTOR_SIN_PERNOCTA') return Promise.resolve({ clave, valor: '0.5' });
            if (clave === 'TARIFA_TERMINAL_AEREO') return Promise.resolve({ clave, valor: '162634' });
            return Promise.resolve(null);
          }),
        },
      });

      const res = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.CONTRATISTA,
        asignacionesBasicas: [9200000],
        fechaInicio: '2026-02-11',
        fechaFin: '2026-02-11',
        pernocta: false,
        destinoCiudad: 'Rionegro',
        destinoDepartamento: 'Antioquia',
        incluyeTransporteAereo: true,
        montoTransporteTerrestre: 0,
      });

      // Viáticos (Sec 3)
      expect(res.data.tarifaDiariaBase).toBe(434866);
      expect(res.data.tarifaDiaPernoctado).toBe(347893); // 434866 * 0.8
      expect(res.data.tarifaDiaNoPernoctado).toBe(173947); // 347893 * 0.5
      expect(res.data.totalNoPernoctados).toBe(173947);
      expect(res.data.valorTotalViaticos).toBe(173947);

      // Gastos de desplazamiento (Sec 4)
      expect(res.data.transporteTerminalesAereos).toBe(162634);
      expect(res.data.transporteTerrestreFluvial).toBe(0);
      expect(res.data.totalGastosDesplazamiento).toBe(162634);
      // Total Viáticos, Transportes y Desplazamientos
      expect(res.data.totalViaticosYDesplazamientos).toBe(336581); // 173947 + 162634
    });
  });
});
