/**
 * @file hallazgos.service.spec.ts
 * Tests unitarios para HallazgosService
 *
 * Cubre la lógica de negocio pura sin tocar la base de datos:
 * - Serialización de fechas (parseDateOnly, serializeDate, serializeHallazgo)
 * - Validaciones de flujo de estados (aceptar, controversia, decisionAuditor)
 * - Generación de código HAL-YYYY-###
 * - Ajuste de contadores de hallazgos en auditoría
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HallazgosService } from './hallazgos.service';
import { Hallazgo, HallazgoEstado, HallazgoCategoria } from './entities/hallazgo.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { HistorialAuditoria } from '../auditorias/entities/historial-auditoria.entity';

// ─── Mocks ──────────────────────────────────────────────────────────────────
const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(null),
    getMany: jest.fn().mockResolvedValue([]),
  })),
});

// ─── Subclase testeable ─────────────────────────────────────────────────────
class HallazgosServiceTestable extends HallazgosService {
  public testParseDateOnly(dateString: string) {
    return (this as any).parseDateOnly(dateString);
  }
  public testSerializeDate(date: Date | string | undefined | null) {
    return (this as any).serializeDate(date);
  }
  public testSerializeHallazgo(hallazgo: Partial<Hallazgo>) {
    return (this as any).serializeHallazgo(hallazgo);
  }
}

// ─── Suite principal ─────────────────────────────────────────────────────────
describe('HallazgosService — lógica de negocio pura', () => {
  let service: HallazgosServiceTestable;
  let hallazgoRepo: ReturnType<typeof mockRepository>;
  let auditoriaRepo: ReturnType<typeof mockRepository>;
  let historialRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: HallazgosService, useClass: HallazgosServiceTestable },
        { provide: getRepositoryToken(Hallazgo), useFactory: mockRepository },
        { provide: getRepositoryToken(Auditoria), useFactory: mockRepository },
        { provide: getRepositoryToken(HistorialAuditoria), useFactory: mockRepository },
      ],
    }).compile();

    service = module.get<HallazgosService>(HallazgosService) as HallazgosServiceTestable;
    hallazgoRepo = module.get(getRepositoryToken(Hallazgo));
    auditoriaRepo = module.get(getRepositoryToken(Auditoria));
    historialRepo = module.get(getRepositoryToken(HistorialAuditoria));
  });

  // ══════════════════════════════════════════════════════════════════════════
  // parseDateOnly
  // ══════════════════════════════════════════════════════════════════════════
  describe('parseDateOnly()', () => {
    it('parsea YYYY-MM-DD en hora local sin shift de timezone', () => {
      const d = service.testParseDateOnly('2026-03-15');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(2); // 0-indexed
      expect(d.getDate()).toBe(15);
    });

    it('retorna Date para strings no estándar (fallback)', () => {
      const d = service.testParseDateOnly('2026/01/01');
      expect(d).toBeInstanceOf(Date);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // serializeDate
  // ══════════════════════════════════════════════════════════════════════════
  describe('serializeDate()', () => {
    it('retorna undefined para null/undefined', () => {
      expect(service.testSerializeDate(null)).toBeUndefined();
      expect(service.testSerializeDate(undefined)).toBeUndefined();
    });

    it('extrae fecha de ISO string sin zona horaria', () => {
      expect(service.testSerializeDate('2026-05-14T05:00:00.000Z')).toBe('2026-05-14');
    });

    it('devuelve YYYY-MM-DD directamente sin transformar', () => {
      expect(service.testSerializeDate('2026-12-31')).toBe('2026-12-31');
    });

    it('serializa objeto Date a YYYY-MM-DD', () => {
      const d = new Date(2026, 0, 20); // 20 enero 2026
      expect(service.testSerializeDate(d)).toBe('2026-01-20');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // serializeHallazgo
  // ══════════════════════════════════════════════════════════════════════════
  describe('serializeHallazgo()', () => {
    it('serializa correctamente las fechas del hallazgo', () => {
      const hallazgo = {
        id: 'uuid-1',
        codigo: 'HAL-2026-001',
        titulo: 'Test hallazgo',
        fechaDeteccion: new Date(2026, 4, 1),
        fechaNotificacion: '2026-05-10T00:00:00.000Z' as any,
        fechaLimiteCorreccion: undefined,
      };
      const result = service.testSerializeHallazgo(hallazgo);
      expect(result.fechaDeteccion).toBe('2026-05-01');
      expect(result.fechaNotificacion).toBe('2026-05-10');
      expect(result.fechaLimiteCorreccion).toBeUndefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findOne — NotFoundException
  // ══════════════════════════════════════════════════════════════════════════
  describe('findOne()', () => {
    it('lanza NotFoundException si el hallazgo no existe', async () => {
      hallazgoRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('id-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('retorna el hallazgo serializado si existe', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        codigo: 'HAL-2026-001',
        titulo: 'Hallazgo de prueba',
        fechaDeteccion: new Date(2026, 4, 1),
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne.mockResolvedValue(mockHallazgo);
      const result = await service.findOne('uuid-1');
      expect(result.codigo).toBe('HAL-2026-001');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // aceptar — flujo de estados
  // ══════════════════════════════════════════════════════════════════════════
  describe('aceptar()', () => {
    it('lanza BadRequestException si el hallazgo NO está en NOTIFICADO', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        codigo: 'HAL-2026-001',
        estado: HallazgoEstado.BORRADOR,
        auditoriaId: 'aud-1',
        fechaDeteccion: null,
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne.mockResolvedValue(mockHallazgo);

      await expect(service.aceptar('uuid-1')).rejects.toThrow(BadRequestException);
    });

    it('cambia estado a ACEPTADO cuando está en NOTIFICADO', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        codigo: 'HAL-2026-001',
        estado: HallazgoEstado.NOTIFICADO,
        auditoriaId: 'aud-1',
        fechaDeteccion: null,
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne
        .mockResolvedValueOnce(mockHallazgo) // findOne en aceptar()
        .mockResolvedValueOnce({ ...mockHallazgo, estado: HallazgoEstado.ACEPTADO }); // findOne al final

      hallazgoRepo.save.mockResolvedValue({ ...mockHallazgo, estado: HallazgoEstado.ACEPTADO });
      historialRepo.save.mockResolvedValue({});

      const result = await service.aceptar('uuid-1');
      expect(result.estado).toBe(HallazgoEstado.ACEPTADO);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // presentarControversia — validaciones
  // ══════════════════════════════════════════════════════════════════════════
  describe('presentarControversia()', () => {
    it('lanza BadRequestException si argumentos están vacíos', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        estado: HallazgoEstado.NOTIFICADO,
        auditoriaId: 'aud-1',
        fechaDeteccion: null,
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne.mockResolvedValue(mockHallazgo);

      await expect(
        service.presentarControversia('uuid-1', '   ', 'doc-1', 'archivo.pdf'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si estado no es NOTIFICADO', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        estado: HallazgoEstado.ACEPTADO,
        auditoriaId: 'aud-1',
        fechaDeteccion: null,
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne.mockResolvedValue(mockHallazgo);

      await expect(
        service.presentarControversia('uuid-1', 'argumentos válidos', 'doc-1', 'archivo.pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // decisionAuditor — validaciones
  // ══════════════════════════════════════════════════════════════════════════
  describe('decisionAuditor()', () => {
    it('lanza BadRequestException si el hallazgo no está EN_CONTROVERSIA', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        estado: HallazgoEstado.NOTIFICADO,
        auditoriaId: 'aud-1',
        fechaDeteccion: null,
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne.mockResolvedValue(mockHallazgo);

      await expect(
        service.decisionAuditor('uuid-1', 'ratificado', 'Fundamentación válida'),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si fundamentación está vacía', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        estado: HallazgoEstado.EN_CONTROVERSIA,
        auditoriaId: 'aud-1',
        fechaDeteccion: null,
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne.mockResolvedValue(mockHallazgo);

      await expect(
        service.decisionAuditor('uuid-1', 'ratificado', ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('mapea correctamente ratificado → RATIFICADO', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        codigo: 'HAL-2026-001',
        estado: HallazgoEstado.EN_CONTROVERSIA,
        auditoriaId: 'aud-1',
        fechaDeteccion: null,
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne
        .mockResolvedValueOnce(mockHallazgo)
        .mockResolvedValueOnce({ ...mockHallazgo, estado: HallazgoEstado.RATIFICADO });
      hallazgoRepo.save.mockResolvedValue({ ...mockHallazgo, estado: HallazgoEstado.RATIFICADO });
      historialRepo.save.mockResolvedValue({});

      const result = await service.decisionAuditor('uuid-1', 'ratificado', 'Fundamentación sólida');
      expect(result.estado).toBe(HallazgoEstado.RATIFICADO);
    });

    it('mapea correctamente retirado → RETIRADO', async () => {
      const mockHallazgo = {
        id: 'uuid-1',
        codigo: 'HAL-2026-001',
        estado: HallazgoEstado.EN_CONTROVERSIA,
        auditoriaId: 'aud-1',
        fechaDeteccion: null,
        fechaNotificacion: null,
        fechaLimiteCorreccion: null,
      };
      hallazgoRepo.findOne
        .mockResolvedValueOnce(mockHallazgo)
        .mockResolvedValueOnce({ ...mockHallazgo, estado: HallazgoEstado.RETIRADO });
      hallazgoRepo.save.mockResolvedValue({ ...mockHallazgo, estado: HallazgoEstado.RETIRADO });
      historialRepo.save.mockResolvedValue({});

      const result = await service.decisionAuditor('uuid-1', 'retirado', 'Se retira el hallazgo');
      expect(result.estado).toBe(HallazgoEstado.RETIRADO);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // hayControversiasPendientes
  // ══════════════════════════════════════════════════════════════════════════
  describe('hayControversiasPendientes()', () => {
    it('retorna true si hay hallazgos EN_CONTROVERSIA', async () => {
      hallazgoRepo.count.mockResolvedValue(2);
      expect(await service.hayControversiasPendientes('aud-1')).toBe(true);
    });

    it('retorna false si no hay hallazgos EN_CONTROVERSIA', async () => {
      hallazgoRepo.count.mockResolvedValue(0);
      expect(await service.hayControversiasPendientes('aud-1')).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ajustarContadorAuditoria — lógica interna
  // ══════════════════════════════════════════════════════════════════════════
  describe('ajustarContadorAuditoria() — via create()', () => {
    it('no lanza error si auditoriaId es null', async () => {
      // ajustarContadorAuditoria debe ser no-op si no hay auditoriaId
      // Lo testeamos indirectamente verificando que no se llama al repo
      auditoriaRepo.findOne.mockResolvedValue(null);
      // No debe fallar
      await expect(
        (service as any).ajustarContadorAuditoria(null, 1)
      ).resolves.toBeUndefined();
      expect(auditoriaRepo.findOne).not.toHaveBeenCalled();
    });

    it('clampea el contador a 0 mínimo cuando delta es negativo', async () => {
      const mockAuditoria = { id: 'aud-1', hallazgos: 0 };
      auditoriaRepo.findOne.mockResolvedValue(mockAuditoria);
      auditoriaRepo.save.mockResolvedValue({});

      await (service as any).ajustarContadorAuditoria('aud-1', -1);

      expect(auditoriaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ hallazgos: 0 }) // Math.max(0, 0 + (-1)) = 0
      );
    });

    it('incrementa correctamente el contador', async () => {
      const mockAuditoria = { id: 'aud-1', hallazgos: 3 };
      auditoriaRepo.findOne.mockResolvedValue(mockAuditoria);
      auditoriaRepo.save.mockResolvedValue({});

      await (service as any).ajustarContadorAuditoria('aud-1', 1);

      expect(auditoriaRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ hallazgos: 4 })
      );
    });
  });
});
