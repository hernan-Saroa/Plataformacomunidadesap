import { Test, TestingModule } from '@nestjs/testing';
import { LiquidationService } from '../liquidation.service';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EscalaViaticoEntity } from '../../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../../entities/liquidation/tarifa-investigador.entity';
import { TarifaRegionalExcepcionEntity } from '../../../entities/liquidation/tarifa-regional-excepcion.entity';
import { LiquidationParamEntity } from '../../../entities/liquidation/liquidation-param.entity';
import {
  TipoComisionadoLiquidacion,
  CategoriaInvestigador,
} from '../../../dto/liquidation/calcular-liquidacion.dto';

describe('LiquidationService - unit by process', () => {
  const createMockModule = (overrides: {
    escalaRepo?: any;
    investigadorRepo?: any;
    regionalRepo?: any;
    paramRepo?: any;
    dataSource?: any;
  } = {}) => {
    const {
      escalaRepo = { find: jest.fn() },
      investigadorRepo = { findOne: jest.fn() },
      regionalRepo = { findOne: jest.fn() },
      paramRepo = { findOne: jest.fn() },
      dataSource = {},
    } = overrides;

    return Test.createTestingModule({
      providers: [
        LiquidationService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: getRepositoryToken(EscalaViaticoEntity), useValue: escalaRepo },
        { provide: getRepositoryToken(TarifaInvestigadorEntity), useValue: investigadorRepo },
        { provide: getRepositoryToken(TarifaRegionalExcepcionEntity), useValue: regionalRepo },
        { provide: getRepositoryToken(LiquidationParamEntity), useValue: paramRepo },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 5102610, rangoMaximo: 6162456, tarifaDiaria: 385283, anoVigencia: 2026 },
        ]) },
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

    it('ESTUDIANTE: usa SMMLV 2026 como salario base', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 0, rangoMaximo: 1917184, tarifaDiaria: 173886, anoVigencia: 2026 },
        ]) },
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

    it('INVESTIGADOR: usa la tarifa de investigador como base', async () => {
      const svc = await buildSvc({
        investigadorRepo: { findOne: jest.fn().mockResolvedValue({ categoriaInvestigador: 'SENIOR', tarifaDiaria: 650000, activo: true }) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 22958734, rangoMaximo: 999999999, tarifaDiaria: 1319516, anoVigencia: 2026 },
        ]) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 0, rangoMaximo: 1000, tarifaDiaria: 100, anoVigencia: 2026 },
        ]) },
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
      ).rejects.toThrow('No se encontró una escala de viáticos para el salario base 5000000');
    });
  });

  describe('3) Factor por tipo de comisionado', () => {
    it('FUNCIONARIO aplica factor 1.0', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 6162457, rangoMaximo: 9293915, tarifaDiaria: 434866, anoVigencia: 2026 },
        ]) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 0, rangoMaximo: 1917184, tarifaDiaria: 173886, anoVigencia: 2026 },
        ]) },
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
        investigadorRepo: { findOne: jest.fn().mockResolvedValue({ categoriaInvestigador: 'SENIOR', tarifaDiaria: 650000, activo: true }) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
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
    it('sin pernocta cuenta 1 día', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-20',
        pernocta: false,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.numeroDiasNoches).toBe(1);
    });

    it('con pernocta cuenta diferencia de días', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-23',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.numeroDiasNoches).toBe(4);
    });
  });

  describe('6) Generación de desglose diario', () => {
    it('genera un item por día con pernocta', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [4500000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-22',
        pernocta: true,
        destinoCiudad: 'Bogotá',
      });

      expect(result.data.desgloseCalculo).toHaveLength(3);
      expect(result.data.desgloseCalculo[0]).toEqual({
        dia: 1,
        fecha: '2026-09-20',
        valor: 335520,
        pernocta: true,
      });
      expect(result.data.desgloseCalculo[1].fecha).toBe('2026-09-21');
      expect(result.data.desgloseCalculo[2].fecha).toBe('2026-09-22');
    });

    it('genera un solo item sin pernocta', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
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
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 6162457, rangoMaximo: 9293915, tarifaDiaria: 434866, anoVigencia: 2026 },
        ]) },
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
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
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

  describe('9) Excepción regional Art. 5', () => {
    it('aplica tarifa regional cuando está activa', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([]) },
        regionalRepo: { findOne: jest.fn().mockResolvedValue({ departamento: 'Amazonas', esNuevoDepartamento: true, tarifaDiaria: 380000, activo: true, decretoReferencia: 'Decreto 314 de 2026 - Artículo 5' }) },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [5000000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Leticia',
        destinoDepartamento: 'Amazonas',
        aplicaExcepcionRegional: true,
      });

      expect(result.data.tarifaDiariaBase).toBe(380000);
      expect(result.data.decretoAplicado).toBe('Decreto 314 de 2026 - Artículo 5');
    });

    it('ignora excepción regional cuando aplicaExcepcionRegional=false', async () => {
      const svc = await buildSvc({
        escalaRepo: { find: jest.fn().mockResolvedValue([
          { rangoMinimo: 4022983, rangoMaximo: 5102609, tarifaDiaria: 335520, anoVigencia: 2026 },
        ]) },
        regionalRepo: { findOne: jest.fn().mockResolvedValue({ departamento: 'Amazonas', esNuevoDepartamento: true, tarifaDiaria: 380000, activo: true, decretoReferencia: 'Decreto 314 de 2026 - Artículo 5' }) },
      });

      const result = await svc.calcularLiquidacion({
        tipoComisionado: TipoComisionadoLiquidacion.FUNCIONARIO,
        asignacionesBasicas: [5000000],
        fechaInicio: '2026-09-20',
        fechaFin: '2026-09-21',
        pernocta: true,
        destinoCiudad: 'Leticia',
        destinoDepartamento: 'Amazonas',
        aplicaExcepcionRegional: false,
      });

      expect(result.data.tarifaDiariaBase).toBe(335520);
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
      ).rejects.toThrow('La fecha fin no puede ser anterior a la fecha inicio.');
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
});
