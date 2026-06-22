/**
 * @file planes-mejoramiento.service.spec.ts
 * Tests unitarios para PlanesMejoramientoService
 *
 * Estrategia: testar la lógica de negocio pura (métodos privados expuestos
 * a través de una subclase de test) sin tocar la base de datos.
 * Los repositorios se mockan con jest.fn().
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlanesMejoramientoService } from './planes-mejoramiento.service';
import { PlanMejoramiento, PlanMejoramientoEstado } from './entities/plan-mejoramiento.entity';
import { AccionCorrectiva, AccionCorrectivaEstado } from './entities/accion-correctiva.entity';
import { SeguimientoTrimestral } from './entities/seguimiento-trimestral.entity';
import { RegistroSeguimiento } from './entities/registro-seguimiento.entity';
import { EventoTimeline } from './entities/evento-timeline.entity';
import { Hallazgo } from '../hallazgos/entities/hallazgo.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { Aprobacion } from '../aprobaciones/entities/aprobacion.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { DataSource } from 'typeorm';
import { PlanMejoramientoRol4TareaSyncService } from './plan-mejoramiento-rol4-tarea-sync.service';

// ─── Helper: repositorio mock mínimo ────────────────────────────────────────
const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

const mockNotificacionesService = {
  crear: jest.fn(),
  crearMasivo: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

const mockRol4TareaSync = {
  sincronizarDesdePlan: jest.fn().mockResolvedValue(undefined),
  sincronizarVigencia: jest.fn().mockResolvedValue(0),
};

// ─── Subclase que expone métodos privados para testing ──────────────────────
// NestJS no permite llamar métodos privados directamente en tests,
// por eso usamos esta subclase para acceder a ellos de forma segura.
class PlanesMejoramientoServiceTestable extends PlanesMejoramientoService {
  // Exponer métodos privados como públicos para los tests
  public testNormalizarTexto(valor?: string | null) {
    return (this as any).normalizarTexto(valor);
  }

  public testParseDateOnly(dateString: string) {
    return (this as any).parseDateOnly(dateString);
  }

  public testSerializeDate(date: Date | string | undefined | null) {
    return (this as any).serializeDate(date);
  }

  public testCalcularPuntajeCumplimiento(implementadas: number, programadas: number) {
    return (this as any).calcularPuntajeCumplimiento(implementadas, programadas);
  }

  public testCalcularPuntajeEfectividad(
    controles: 'SI' | 'NO' | 'PARCIAL',
    repeticion: 'SI' | 'NO',
  ) {
    return (this as any).calcularPuntajeEfectividad(controles, repeticion);
  }

  public testDeterminarEstadoReal(
    plan: Partial<PlanMejoramiento>,
    totalAcciones: number,
    porcentajeAvance: number,
  ) {
    return (this as any).determinarEstadoReal(plan, totalAcciones, porcentajeAvance);
  }

  public testDeterminarEstadoAccionReal(accion: Partial<AccionCorrectiva>) {
    return (this as any).determinarEstadoAccionReal(accion);
  }

  public testContarAccionesCompletadas(acciones: Partial<AccionCorrectiva>[]) {
    return (this as any).contarAccionesCompletadas(acciones);
  }

  public testPromedioPorcentajeAvanceAcciones(acciones: Partial<AccionCorrectiva>[]) {
    return (this as any).promedioPorcentajeAvanceAcciones(acciones);
  }
}

// ─── Suite de tests ──────────────────────────────────────────────────────────
describe('PlanesMejoramientoService — lógica de negocio pura', () => {
  let service: PlanesMejoramientoServiceTestable;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: PlanesMejoramientoService, useClass: PlanesMejoramientoServiceTestable },
        { provide: getRepositoryToken(PlanMejoramiento), useFactory: mockRepository },
        { provide: getRepositoryToken(AccionCorrectiva), useFactory: mockRepository },
        { provide: getRepositoryToken(SeguimientoTrimestral), useFactory: mockRepository },
        { provide: getRepositoryToken(RegistroSeguimiento), useFactory: mockRepository },
        { provide: getRepositoryToken(EventoTimeline), useFactory: mockRepository },
        { provide: getRepositoryToken(Hallazgo), useFactory: mockRepository },
        { provide: getRepositoryToken(Auditoria), useFactory: mockRepository },
        { provide: getRepositoryToken(Aprobacion), useFactory: mockRepository },
        { provide: NotificacionesService, useValue: mockNotificacionesService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: PlanMejoramientoRol4TareaSyncService, useValue: mockRol4TareaSync },
      ],
    }).compile();

    service = module.get<PlanesMejoramientoService>(
      PlanesMejoramientoService,
    ) as PlanesMejoramientoServiceTestable;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // normalizarTexto
  // ══════════════════════════════════════════════════════════════════════════
  describe('normalizarTexto()', () => {
    it('convierte a minúsculas y elimina tildes', () => {
      expect(service.testNormalizarTexto('Comunicación')).toBe('comunicacion');
      expect(service.testNormalizarTexto('SEGUIMIENTO')).toBe('seguimiento');
      expect(service.testNormalizarTexto('Él')).toBe('el');
    });

    it('maneja undefined y null sin lanzar error', () => {
      expect(service.testNormalizarTexto(undefined)).toBe('');
      expect(service.testNormalizarTexto(null)).toBe('');
    });

    it('recorta espacios en blanco', () => {
      expect(service.testNormalizarTexto('  comunicacion  ')).toBe('comunicacion');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // parseDateOnly
  // ══════════════════════════════════════════════════════════════════════════
  describe('parseDateOnly()', () => {
    it('parsea fechas YYYY-MM-DD en hora local (sin shift de zona horaria)', () => {
      const result = service.testParseDateOnly('2026-05-14');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(4); // 0-indexed: mayo = 4
      expect(result.getDate()).toBe(14);
    });

    it('parsea el 1 de enero sin desplazamiento', () => {
      const result = service.testParseDateOnly('2026-01-01');
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(1);
    });

    it('usa new Date como fallback para formatos no estándar', () => {
      const result = service.testParseDateOnly('invalid');
      expect(result).toBeInstanceOf(Date);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // serializeDate
  // ══════════════════════════════════════════════════════════════════════════
  describe('serializeDate()', () => {
    it('devuelve undefined para valores nulos/undefined', () => {
      expect(service.testSerializeDate(undefined)).toBeUndefined();
      expect(service.testSerializeDate(null)).toBeUndefined();
    });

    it('extrae solo la fecha de un ISO string', () => {
      expect(service.testSerializeDate('2026-05-14T00:00:00.000Z')).toBe('2026-05-14');
    });

    it('devuelve el string YYYY-MM-DD directamente', () => {
      expect(service.testSerializeDate('2026-12-31')).toBe('2026-12-31');
    });

    it('serializa un objeto Date a YYYY-MM-DD', () => {
      const date = new Date(2026, 4, 14); // 14 mayo 2026 hora local
      const result = service.testSerializeDate(date);
      expect(result).toBe('2026-05-14');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // calcularPuntajeCumplimiento
  // ══════════════════════════════════════════════════════════════════════════
  describe('calcularPuntajeCumplimiento()', () => {
    it('retorna 2 cuando implementadas >= programadas', () => {
      expect(service.testCalcularPuntajeCumplimiento(5, 5)).toBe(2);
      expect(service.testCalcularPuntajeCumplimiento(6, 5)).toBe(2);
    });

    it('retorna 1 cuando hay al menos 1 implementada pero menos que programadas', () => {
      expect(service.testCalcularPuntajeCumplimiento(1, 5)).toBe(1);
      expect(service.testCalcularPuntajeCumplimiento(3, 5)).toBe(1);
    });

    it('retorna 0 cuando no hay implementadas', () => {
      expect(service.testCalcularPuntajeCumplimiento(0, 5)).toBe(0);
      expect(service.testCalcularPuntajeCumplimiento(0, 1)).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // calcularPuntajeEfectividad
  // ══════════════════════════════════════════════════════════════════════════
  describe('calcularPuntajeEfectividad()', () => {
    it('retorna 0 cuando el hallazgo se repite (sin importar controles)', () => {
      expect(service.testCalcularPuntajeEfectividad('SI', 'SI')).toBe(0);
      expect(service.testCalcularPuntajeEfectividad('PARCIAL', 'SI')).toBe(0);
      expect(service.testCalcularPuntajeEfectividad('NO', 'SI')).toBe(0);
    });

    it('retorna 2 cuando controles=SI y el hallazgo NO se repite', () => {
      expect(service.testCalcularPuntajeEfectividad('SI', 'NO')).toBe(2);
    });

    it('retorna 1 cuando controles=PARCIAL y hallazgo no se repite', () => {
      expect(service.testCalcularPuntajeEfectividad('PARCIAL', 'NO')).toBe(1);
    });

    it('retorna 1 cuando controles=NO y hallazgo no se repite', () => {
      expect(service.testCalcularPuntajeEfectividad('NO', 'NO')).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // contarAccionesCompletadas
  // ══════════════════════════════════════════════════════════════════════════
  describe('contarAccionesCompletadas()', () => {
    it('retorna 0 con lista vacía', () => {
      expect(service.testContarAccionesCompletadas([])).toBe(0);
    });

    it('cuenta acciones con porcentaje >= 100', () => {
      const acciones = [
        { porcentajeAvance: 100, estado: AccionCorrectivaEstado.EN_PROGRESO },
        { porcentajeAvance: 50, estado: AccionCorrectivaEstado.EN_PROGRESO },
        { porcentajeAvance: 100, estado: AccionCorrectivaEstado.EN_PROGRESO },
      ];
      expect(service.testContarAccionesCompletadas(acciones)).toBe(2);
    });

    it('cuenta acciones con estado "completada" aunque porcentaje < 100', () => {
      const acciones = [
        { porcentajeAvance: 80, estado: 'completada' as AccionCorrectivaEstado },
        { porcentajeAvance: 20, estado: AccionCorrectivaEstado.PROGRAMADA },
      ];
      expect(service.testContarAccionesCompletadas(acciones)).toBe(1);
    });

    it('cuenta acciones con estado "implementada"', () => {
      const acciones = [
        { porcentajeAvance: 0, estado: 'implementada' as AccionCorrectivaEstado },
      ];
      expect(service.testContarAccionesCompletadas(acciones)).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // promedioPorcentajeAvanceAcciones
  // ══════════════════════════════════════════════════════════════════════════
  describe('promedioPorcentajeAvanceAcciones()', () => {
    it('retorna 0 con lista vacía', () => {
      expect(service.testPromedioPorcentajeAvanceAcciones([])).toBe(0);
    });

    it('calcula el promedio correctamente', () => {
      const acciones = [
        { porcentajeAvance: 60 },
        { porcentajeAvance: 40 },
        { porcentajeAvance: 100 },
      ];
      // (60 + 40 + 100) / 3 = 66.67 → round = 67
      expect(service.testPromedioPorcentajeAvanceAcciones(acciones)).toBe(67);
    });

    it('clampea valores mayores a 100 a 100', () => {
      const acciones = [{ porcentajeAvance: 150 }, { porcentajeAvance: 50 }];
      // (100 + 50) / 2 = 75
      expect(service.testPromedioPorcentajeAvanceAcciones(acciones)).toBe(75);
    });

    it('clampea valores negativos a 0', () => {
      const acciones = [{ porcentajeAvance: -10 }, { porcentajeAvance: 100 }];
      // (0 + 100) / 2 = 50
      expect(service.testPromedioPorcentajeAvanceAcciones(acciones)).toBe(50);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // determinarEstadoReal
  // ══════════════════════════════════════════════════════════════════════════
  describe('determinarEstadoReal()', () => {
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 30);

    const fechaPasada = new Date();
    fechaPasada.setDate(fechaPasada.getDate() - 10);

    it('devuelve COMPLETADO cuando porcentaje >= 100 (sin importar fecha)', () => {
      const plan = {
        estado: PlanMejoramientoEstado.EN_EJECUCION,
        fechaLimite: fechaPasada,
      };
      expect(service.testDeterminarEstadoReal(plan as any, 3, 100)).toBe(
        PlanMejoramientoEstado.COMPLETADO,
      );
    });

    it('devuelve VENCIDO cuando la fecha pasó y no está completado', () => {
      const plan = {
        estado: PlanMejoramientoEstado.EN_EJECUCION,
        fechaLimite: fechaPasada,
      };
      expect(service.testDeterminarEstadoReal(plan as any, 3, 50)).toBe(
        PlanMejoramientoEstado.VENCIDO,
      );
    });

    it('devuelve RECHAZADO si el estado es RECHAZADO (sin importar avance)', () => {
      const plan = {
        estado: PlanMejoramientoEstado.RECHAZADO,
        fechaLimite: fechaFutura,
      };
      expect(service.testDeterminarEstadoReal(plan as any, 3, 50)).toBe(
        PlanMejoramientoEstado.RECHAZADO,
      );
    });

    it('devuelve REVISION si el estado es REVISION', () => {
      const plan = {
        estado: PlanMejoramientoEstado.REVISION,
        fechaLimite: fechaFutura,
      };
      expect(service.testDeterminarEstadoReal(plan as any, 3, 50)).toBe(
        PlanMejoramientoEstado.REVISION,
      );
    });

    it('devuelve BORRADOR cuando no hay acciones', () => {
      const plan = {
        estado: PlanMejoramientoEstado.BORRADOR,
        fechaLimite: fechaFutura,
      };
      expect(service.testDeterminarEstadoReal(plan as any, 0, 0)).toBe(
        PlanMejoramientoEstado.BORRADOR,
      );
    });

    it('devuelve EN_EJECUCION cuando está aprobado y tiene avance', () => {
      const plan = {
        estado: PlanMejoramientoEstado.APROBADO,
        fechaLimite: fechaFutura,
      };
      expect(service.testDeterminarEstadoReal(plan as any, 3, 30)).toBe(
        PlanMejoramientoEstado.EN_EJECUCION,
      );
    });

    it('devuelve APROBADO cuando está aprobado pero sin avance aún', () => {
      const plan = {
        estado: PlanMejoramientoEstado.APROBADO,
        fechaLimite: fechaFutura,
      };
      expect(service.testDeterminarEstadoReal(plan as any, 3, 0)).toBe(
        PlanMejoramientoEstado.APROBADO,
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // determinarEstadoAccionReal
  // ══════════════════════════════════════════════════════════════════════════
  describe('determinarEstadoAccionReal()', () => {
    const fechaFutura = new Date();
    fechaFutura.setDate(fechaFutura.getDate() + 30);

    const fechaPasada = new Date();
    fechaPasada.setDate(fechaPasada.getDate() - 5);

    it('devuelve COMPLETADA si porcentaje >= 100', () => {
      const accion = { porcentajeAvance: 100, fechaFin: fechaFutura };
      expect(service.testDeterminarEstadoAccionReal(accion)).toBe(
        AccionCorrectivaEstado.COMPLETADA,
      );
    });

    it('devuelve VENCIDA si fecha pasó y porcentaje < 100', () => {
      const accion = { porcentajeAvance: 50, fechaFin: fechaPasada };
      expect(service.testDeterminarEstadoAccionReal(accion)).toBe(
        AccionCorrectivaEstado.VENCIDA,
      );
    });

    it('devuelve EN_PROGRESO si tiene avance parcial y no está vencida', () => {
      const accion = { porcentajeAvance: 45, fechaFin: fechaFutura };
      expect(service.testDeterminarEstadoAccionReal(accion)).toBe(
        AccionCorrectivaEstado.EN_PROGRESO,
      );
    });

    it('devuelve PROGRAMADA cuando no tiene avance y no está vencida', () => {
      const accion = { porcentajeAvance: 0, fechaFin: fechaFutura };
      expect(service.testDeterminarEstadoAccionReal(accion)).toBe(
        AccionCorrectivaEstado.PROGRAMADA,
      );
    });

    it('devuelve PROGRAMADA cuando no tiene fecha fin', () => {
      const accion = { porcentajeAvance: 0, fechaFin: undefined };
      expect(service.testDeterminarEstadoAccionReal(accion as any)).toBe(
        AccionCorrectivaEstado.PROGRAMADA,
      );
    });
  });
});
