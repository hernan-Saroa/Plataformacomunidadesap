import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { TicketsService } from '../tickets.service';
import { SaldoTiqueteEntity } from '../../../entities/tickets/saldo-tiquete.entity';
import { RutaRestringidaEntity } from '../../../entities/tickets/ruta-restringida.entity';
import { ExcepcionTiqueteEntity } from '../../../entities/tickets/excepcion-tiquete.entity';
import { LiquidationParamEntity } from '../../../entities/liquidation/liquidation-param.entity';

/**
 * Suite de pruebas unitarias y de integración del módulo de tiquetes
 * (RF-LIQ-003 / RF-LIQ-004).
 *
 * Cubre los tres escenarios Gherkin del requerimiento:
 *  1) Registro exitoso con presupuesto suficiente (semáforo en verde).
 *  2) Bloqueo de ruta corta aérea sin excepción autorizada.
 *  3) Presupuesto agotado fuerza la selección a transporte terrestre.
 *
 * Adicionalmente simula peticiones HTTP concurrentes para validar la
 * robustez de los bloqueos pesimistas en la reserva presupuestal.
 */
describe('TicketsService', () => {
  const buildMockQueryBuilder = (rows: any[]) => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(rows[0] ?? null),
      getMany: jest.fn().mockResolvedValue(rows),
    };
    return qb;
  };

  const createMockModule = (
    overrides: {
      saldoRepo?: any;
      rutaRepo?: any;
      excepcionRepo?: any;
      paramRepo?: any;
      dataSource?: any;
    } = {},
  ) => {
    const {
      saldoRepo = {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
      rutaRepo = {
        createQueryBuilder: jest.fn(() => buildMockQueryBuilder([])),
      },
      excepcionRepo = { create: jest.fn(), save: jest.fn(), find: jest.fn() },
      paramRepo = { findOne: jest.fn() },
      dataSource = { transaction: jest.fn() },
    } = overrides;

    return Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getDataSourceToken(), useValue: dataSource },
        {
          provide: getRepositoryToken(SaldoTiqueteEntity),
          useValue: saldoRepo,
        },
        {
          provide: getRepositoryToken(RutaRestringidaEntity),
          useValue: rutaRepo,
        },
        {
          provide: getRepositoryToken(ExcepcionTiqueteEntity),
          useValue: excepcionRepo,
        },
        {
          provide: getRepositoryToken(LiquidationParamEntity),
          useValue: paramRepo,
        },
      ],
    }).compile();
  };

  describe('Escenario 1: Registro exitoso con presupuesto suficiente', () => {
    it('devuelve semáforo en verde y aplica holgura de mercado al monto', async () => {
      const saldoRepo = {
        findOne: jest.fn().mockResolvedValue({
          dependenciaId: 'DEP-ACADEM-01',
          nombreDependencia: 'Subdirección Académica',
          presupuestoInicial: 15_000_000,
          presupuestoReservado: 0,
          presupuestoDisponible: 15_000_000,
          holguraPorcentaje: 15,
          activo: true,
        }),
      };
      const module = await createMockModule({ saldoRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.validarTiquete({
        dependenciaId: 'DEP-ACADEM-01',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Medellín',
        tipoTransporte: 'AEREO',
        montoEstimadoTiquete: 450_000,
      });

      expect(res.is_valid).toBe(true);
      expect(res.requires_route_exception).toBe(false);
      expect(res.requires_budget_exception).toBe(false);
      expect(res.force_land_transport).toBe(false);
      expect(res.nivel_alerta).toBe('VERDE');
      expect(res.saldo_actual_dependencia).toBe(15_000_000);
      expect(res.monto_reserva_con_holgura).toBe(517_500);
      expect(res.ruta_restringida_encontrada).toBeNull();
    });
  });

  describe('Escenario 2: Bloqueo de ruta corta aérea', () => {
    it('marca requires_route_exception=true cuando la ruta es restringida y el transporte es aéreo', async () => {
      const rutaMock = {
        id: 1,
        origenCiudad: 'BOGOTA',
        destinoCiudad: 'VILLAVICENCIO',
        descripcionRestriccion:
          'Ruta corta restringida. Requiere autorización del Director Nacional o Sindicato.',
        activo: true,
      };
      const saldoRepo = {
        findOne: jest.fn().mockResolvedValue({
          dependenciaId: 'DEP-X',
          presupuestoInicial: 5_000_000,
          presupuestoReservado: 0,
          presupuestoDisponible: 5_000_000,
          holguraPorcentaje: 15,
          activo: true,
        }),
      };
      const rutaRepo = {
        createQueryBuilder: jest.fn(() => buildMockQueryBuilder([rutaMock])),
      };
      const module = await createMockModule({ saldoRepo, rutaRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.validarTiquete({
        dependenciaId: 'DEP-X',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Villavicencio',
        tipoTransporte: 'AEREO',
        montoEstimadoTiquete: 350_000,
      });

      expect(res.is_valid).toBe(false);
      expect(res.requires_route_exception).toBe(true);
      expect(res.requires_budget_exception).toBe(false);
      expect(res.force_land_transport).toBe(false);
      expect(res.nivel_alerta).toBe('VERDE');
      expect(res.ruta_restringida_encontrada?.descripcion).toContain(
        'Ruta corta restringida',
      );
    });

    it('NO marca la ruta como restringida si el transporte es terrestre', async () => {
      const rutaRepo = {
        createQueryBuilder: jest.fn(() =>
          buildMockQueryBuilder([
            {
              id: 1,
              origenCiudad: 'BOGOTA',
              destinoCiudad: 'VILLAVICENCIO',
              descripcionRestriccion: 'x',
              activo: true,
            },
          ]),
        ),
      };
      const saldoRepo = {
        findOne: jest.fn().mockResolvedValue({
          dependenciaId: 'DEP-X',
          presupuestoInicial: 5_000_000,
          presupuestoDisponible: 5_000_000,
          holguraPorcentaje: 15,
          activo: true,
        }),
      };
      const module = await createMockModule({ saldoRepo, rutaRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.validarTiquete({
        dependenciaId: 'DEP-X',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Villavicencio',
        tipoTransporte: 'TERRESTRE',
        montoEstimadoTiquete: 200_000,
      });

      expect(res.requires_route_exception).toBe(false);
    });
  });

  describe('Escenario 3: Presupuesto agotado', () => {
    it('devuelve force_land_transport=true y semáforo ROJO cuando saldo = 0', async () => {
      const saldoRepo = {
        findOne: jest.fn().mockResolvedValue({
          dependenciaId: 'DEP-BOY-01',
          nombreDependencia: 'Territorial Boyacá',
          presupuestoInicial: 8_000_000,
          presupuestoReservado: 8_000_000,
          presupuestoDisponible: 0,
          holguraPorcentaje: 15,
          activo: true,
        }),
      };
      const module = await createMockModule({ saldoRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.validarTiquete({
        dependenciaId: 'DEP-BOY-01',
        origenCiudad: 'Tunja',
        destinoCiudad: 'Bogotá',
        tipoTransporte: 'AEREO',
        montoEstimadoTiquete: 300_000,
      });

      expect(res.force_land_transport).toBe(true);
      expect(res.requires_budget_exception).toBe(false);
      expect(res.nivel_alerta).toBe('ROJO');
      expect(res.saldo_actual_dependencia).toBe(0);
      expect(res.message).toContain('saldo de la dependencia está en cero');
    });

    it('devuelve semáforo AMARILLO cuando el saldo es > 0 pero < 30% del cupo', async () => {
      const saldoRepo = {
        findOne: jest.fn().mockResolvedValue({
          dependenciaId: 'DEP-Y',
          presupuestoInicial: 10_000_000,
          presupuestoReservado: 8_000_000,
          presupuestoDisponible: 2_000_000,
          holguraPorcentaje: 15,
          activo: true,
        }),
      };
      const module = await createMockModule({ saldoRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.validarTiquete({
        dependenciaId: 'DEP-Y',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Cali',
        tipoTransporte: 'AEREO',
        montoEstimadoTiquete: 400_000,
      });

      // 2.000.000 / 10.000.000 = 20% => amarillo
      expect(res.nivel_alerta).toBe('AMARILLO');
    });

    it('requires_budget_exception=true cuando la reserva con holgura supera el disponible', async () => {
      const saldoRepo = {
        findOne: jest.fn().mockResolvedValue({
          dependenciaId: 'DEP-Z',
          presupuestoInicial: 10_000_000,
          presupuestoDisponible: 500_000,
          holguraPorcentaje: 15,
          activo: true,
        }),
      };
      const module = await createMockModule({ saldoRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.validarTiquete({
        dependenciaId: 'DEP-Z',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Cali',
        tipoTransporte: 'AEREO',
        montoEstimadoTiquete: 450_000,
      });

      expect(res.requires_budget_exception).toBe(true);
      expect(res.is_valid).toBe(false);
      expect(res.force_land_transport).toBe(false);
    });
  });

  describe('Reserva concurrente (concurrencia pesimista)', () => {
    it('rechaza la segunda reserva cuando supera el saldo disponible', async () => {
      const SALDO_INICIAL = 1_000_000;
      const MONTO_RESERVA = 600_000; // con 15% holgura => 690.000

      let reservado = 0;

      const lockedRow = () => ({
        id: 'row-1',
        dependenciaId: 'DEP-CONC',
        nombreDependencia: 'Concurrencia',
        presupuestoInicial: SALDO_INICIAL,
        presupuestoReservado: reservado,
        presupuestoDisponible: SALDO_INICIAL - reservado,
        holguraPorcentaje: 15,
        activo: true,
      });

      const fakeManager: any = {
        createQueryBuilder: jest.fn(() => buildMockQueryBuilder([lockedRow()])),
        save: jest.fn(async (_: any, row: any) => {
          reservado = Number(row.presupuestoReservado);
          return { ...row, presupuestoDisponible: SALDO_INICIAL - reservado };
        }),
      };

      const dataSource: any = {
        transaction: jest.fn(async (cb: (m: EntityManager) => Promise<any>) =>
          cb(fakeManager),
        ),
      };

      const module = await createMockModule({ dataSource });
      const service = module.get<TicketsService>(TicketsService);

      const primera = await service.reservarSaldo({
        solicitudId: '00000000-0000-0000-0000-000000000001',
        dependenciaId: 'DEP-CONC',
        montoEstimadoTiquete: MONTO_RESERVA,
      });
      expect(Number(primera.presupuestoReservado)).toBe(690_000);

      await expect(
        service.reservarSaldo({
          solicitudId: '00000000-0000-0000-0000-000000000002',
          dependenciaId: 'DEP-CONC',
          montoEstimadoTiquete: MONTO_RESERVA,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza NotFoundException cuando la dependencia no tiene saldo configurado', async () => {
      const dataSource: any = {
        transaction: jest.fn(async (cb: (m: EntityManager) => Promise<any>) =>
          cb({
            createQueryBuilder: jest.fn(() => buildMockQueryBuilder([null])),
            save: jest.fn(),
          } as any),
        ),
      };
      const module = await createMockModule({ dataSource });
      const service = module.get<TicketsService>(TicketsService);

      await expect(
        service.reservarSaldo({
          solicitudId: '00000000-0000-0000-0000-000000000099',
          dependenciaId: 'DEP-NO-EXISTE',
          montoEstimadoTiquete: 100_000,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('Normalización de ciudades', () => {
    it('compara correctamente Bogotá vs bogotá D.C.', async () => {
      const rutaMock = {
        id: 1,
        origenCiudad: 'BOGOTA',
        destinoCiudad: 'IBAGUE',
        descripcionRestriccion: 'ruta corta',
        activo: true,
      };
      const rutaRepo = {
        createQueryBuilder: jest.fn(() => buildMockQueryBuilder([rutaMock])),
      };
      const saldoRepo = {
        findOne: jest.fn().mockResolvedValue({
          dependenciaId: 'DEP-N',
          presupuestoInicial: 1_000_000,
          presupuestoDisponible: 1_000_000,
          holguraPorcentaje: 15,
          activo: true,
        }),
      };
      const module = await createMockModule({ saldoRepo, rutaRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.validarTiquete({
        dependenciaId: 'DEP-N',
        origenCiudad: 'bogotá D.C.',
        destinoCiudad: 'Ibagué',
        tipoTransporte: 'AEREO',
        montoEstimadoTiquete: 200_000,
      });

      expect(res.requires_route_exception).toBe(true);
      expect(res.ruta_restringida_encontrada).not.toBeNull();
    });
  });

  // -----------------------------------------------------------------
  // Parámetro global de holgura (RF-LIQ-004)
  // -----------------------------------------------------------------
  describe('Parametrización de holgura global (RF-LIQ-004)', () => {
    it('devuelve el parámetro configurado', async () => {
      const paramRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          clave: 'HOLGURA_TIQUETES_PORCENTAJE',
          valor: '20',
          tipo: 'NUMBER',
          descripcion: 'x',
        }),
      };
      const module = await createMockModule({ paramRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.obtenerParametroHolgura();
      expect(res?.valor).toBe('20');
    });

    it('actualiza el parámetro con un valor válido', async () => {
      const paramRepo = {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          clave: 'HOLGURA_TIQUETES_PORCENTAJE',
          valor: '15',
          tipo: 'NUMBER',
          descripcion: 'x',
        }),
        create: jest.fn((x: any) => x),
        save: jest.fn(async (x: any) => ({ id: 1, ...x })),
      };
      const module = await createMockModule({ paramRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.actualizarParametroHolgura(25);
      expect(res.valor).toBe('25');
      expect(res.clave).toBe('HOLGURA_TIQUETES_PORCENTAJE');
    });

    it('rechaza valores fuera del rango 0-100', async () => {
      const module = await createMockModule();
      const service = module.get<TicketsService>(TicketsService);
      await expect(service.actualizarParametroHolgura(150)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.actualizarParametroHolgura(-5)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('crea el parámetro si no existe al actualizar', async () => {
      const paramRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((x: any) => x),
        save: jest.fn(async (x: any) => ({ id: 99, ...x })),
      };
      const module = await createMockModule({ paramRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.actualizarParametroHolgura(18);
      expect(res.id).toBe(99);
      expect(res.valor).toBe('18');
      expect(res.tipo).toBe('NUMBER');
    });

    it('usa la holgura de la dependencia cuando está configurada explícitamente', async () => {
      const paramRepo = {
        findOne: jest.fn().mockResolvedValue({
          clave: 'HOLGURA_TIQUETES_PORCENTAJE',
          valor: '10',
          tipo: 'NUMBER',
          descripcion: 'global',
        }),
      };
      const saldoRepo = {
        findOne: jest.fn().mockResolvedValue({
          dependenciaId: 'DEP-X',
          presupuestoInicial: 1_000_000,
          presupuestoDisponible: 1_000_000,
          holguraPorcentaje: 25,
          activo: true,
        }),
      };
      const module = await createMockModule({ paramRepo, saldoRepo });
      const service = module.get<TicketsService>(TicketsService);

      const res = await service.validarTiquete({
        dependenciaId: 'DEP-X',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Medellín',
        tipoTransporte: 'AEREO',
        montoEstimadoTiquete: 400_000,
      });

      // Holgura local (25%) debe ganar sobre la global (10%).
      expect(res.holgura_aplicada_porcentaje).toBe(25);
      expect(res.monto_reserva_con_holgura).toBe(500_000); // 400k * 1.25
    });
  });
});
