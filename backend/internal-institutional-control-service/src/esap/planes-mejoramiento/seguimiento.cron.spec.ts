/**
 * Tests para la generación de alertas del SeguimientoCron.
 * Cubre CA-S4 (alertas), CA-S5 (cierre), CA-S6 (archivo).
 *
 * Estos tests validan la lógica de negocio del motor de alertas
 * usando mocks de los repositorios TypeORM.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeguimientoCron } from './seguimiento.cron';
import { SeguimientoPlan } from './entities/seguimiento-plan.entity';
import { AlertaPlan, TipoAlertaPlan } from './entities/alerta-plan.entity';
import { AccionCorrectiva } from './entities/accion-correctiva.entity';
import { EvidenciaAccion } from './entities/evidencia-accion.entity';
import { PlanMejoramiento } from './entities/plan-mejoramiento.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

// ── Mock factories ──

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'mock-uuid', ...entity })),
});

const mockNotificacionesService = () => ({
  create: jest.fn().mockResolvedValue({ id: 'notif-uuid' }),
  dispararEvento: jest.fn().mockResolvedValue({ total: 1, exitosos: 1 }),
});

describe('SeguimientoCron — Motor de alertas (CA-S4)', () => {
  let cron: SeguimientoCron;
  let alertaRepo: ReturnType<typeof mockRepository>;
  let accionRepo: ReturnType<typeof mockRepository>;
  let evidenciaRepo: ReturnType<typeof mockRepository>;
  let planRepo: ReturnType<typeof mockRepository>;
  let notifService: ReturnType<typeof mockNotificacionesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeguimientoCron,
        { provide: getRepositoryToken(SeguimientoPlan), useFactory: mockRepository },
        { provide: getRepositoryToken(AlertaPlan), useFactory: mockRepository },
        { provide: getRepositoryToken(AccionCorrectiva), useFactory: mockRepository },
        { provide: getRepositoryToken(EvidenciaAccion), useFactory: mockRepository },
        { provide: getRepositoryToken(PlanMejoramiento), useFactory: mockRepository },
        { provide: NotificacionesService, useFactory: mockNotificacionesService },
      ],
    }).compile();

    cron = module.get(SeguimientoCron);
    alertaRepo = module.get(getRepositoryToken(AlertaPlan));
    accionRepo = module.get(getRepositoryToken(AccionCorrectiva));
    evidenciaRepo = module.get(getRepositoryToken(EvidenciaAccion));
    planRepo = module.get(getRepositoryToken(PlanMejoramiento));
    notifService = module.get(NotificacionesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════════
  // Alerta Tipo 1: VENCIDA_SIN_EVIDENCIA
  // ═══════════════════════════════════════════════════════════════════════

  it('genera alerta VENCIDA_SIN_EVIDENCIA cuando acción vencida sin evidencia aceptada', async () => {
    const accionVencida = {
      id: 'accion-1',
      planId: 'plan-1',
      descripcion: 'Implementar controles administrativos para prevenir reincidencia',
      estadoAccionSeguimiento: 'abierta',
      fechaFin: new Date('2020-01-01'), // vencida
      efectividadVerificada: false,
      efectividadEmfo: null,
    };

    accionRepo.find.mockResolvedValue([accionVencida]);
    evidenciaRepo.find.mockResolvedValue([]); // sin evidencias
    alertaRepo.findOne.mockResolvedValue(null); // no existe alerta previa
    planRepo.findOne.mockResolvedValue({ id: 'plan-1', responsableImplementacion: 'user-1' });

    const total = await cron.generarAlertasGlobales();

    expect(total).toBeGreaterThanOrEqual(1);
    expect(alertaRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        planId: 'plan-1',
        accionId: 'accion-1',
        tipo: TipoAlertaPlan.VENCIDA_SIN_EVIDENCIA,
      }),
    );
    expect(notifService.create).toHaveBeenCalled(); // US-024
  });

  it('NO genera alerta si la acción vencida YA tiene evidencia aceptada', async () => {
    const accionVencida = {
      id: 'accion-1',
      planId: 'plan-1',
      descripcion: 'Acción con evidencia',
      estadoAccionSeguimiento: 'abierta',
      fechaFin: new Date('2020-01-01'),
      efectividadVerificada: false,
      efectividadEmfo: null,
    };

    accionRepo.find.mockResolvedValue([accionVencida]);
    evidenciaRepo.find.mockResolvedValue([{ estadoValidacion: 'aceptado' }]);
    planRepo.findOne.mockResolvedValue({ id: 'plan-1', responsableImplementacion: 'user-1' });

    const total = await cron.generarAlertasGlobales();

    // No debería crearse alerta tipo 1 (pero podrían crearse tipos 3 o 4)
    const createCalls = alertaRepo.create.mock.calls;
    const alertasTipo1 = createCalls.filter(
      (call: any) => call[0].tipo === TipoAlertaPlan.VENCIDA_SIN_EVIDENCIA,
    );
    expect(alertasTipo1).toHaveLength(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Alerta Tipo 2: INEFECTIVA
  // ═══════════════════════════════════════════════════════════════════════

  it('genera alerta INEFECTIVA cuando efectividad verificada y = 0', async () => {
    const accionInefectiva = {
      id: 'accion-2',
      planId: 'plan-1',
      descripcion: 'Acción calificada como inefectiva por auditor',
      estadoAccionSeguimiento: 'abierta',
      fechaFin: new Date('2030-01-01'), // futura
      efectividadVerificada: true,
      efectividadEmfo: 0,
    };

    accionRepo.find.mockResolvedValue([accionInefectiva]);
    alertaRepo.findOne.mockResolvedValue(null);
    planRepo.findOne.mockResolvedValue({ id: 'plan-1', responsableImplementacion: 'user-1' });

    const total = await cron.generarAlertasGlobales();

    expect(total).toBeGreaterThanOrEqual(1);
    const createCalls = alertaRepo.create.mock.calls;
    const alertasTipo2 = createCalls.filter(
      (call: any) => call[0].tipo === TipoAlertaPlan.INEFECTIVA,
    );
    expect(alertasTipo2).toHaveLength(1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Deduplicación: no crear alertas duplicadas
  // ═══════════════════════════════════════════════════════════════════════

  it('NO crea alerta duplicada si ya existe una no atendida del mismo tipo', async () => {
    const accionVencida = {
      id: 'accion-1',
      planId: 'plan-1',
      descripcion: 'Ya tiene alerta',
      estadoAccionSeguimiento: 'abierta',
      fechaFin: new Date('2020-01-01'),
      efectividadVerificada: false,
      efectividadEmfo: null,
    };

    accionRepo.find.mockResolvedValue([accionVencida]);
    evidenciaRepo.find.mockResolvedValue([]); // sin evidencias
    // Simular que ya existe alerta
    alertaRepo.findOne.mockResolvedValue({ id: 'alerta-existente', atendida: false });
    planRepo.findOne.mockResolvedValue({ id: 'plan-1', responsableImplementacion: 'user-1' });

    await cron.generarAlertasGlobales();

    // No debería crear nuevas alertas
    expect(alertaRepo.create).not.toHaveBeenCalled();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Sin acciones abiertas = 0 alertas
  // ═══════════════════════════════════════════════════════════════════════

  it('retorna 0 alertas cuando no hay acciones abiertas', async () => {
    accionRepo.find.mockResolvedValue([]);

    const total = await cron.generarAlertasGlobales();

    expect(total).toBe(0);
    expect(alertaRepo.create).not.toHaveBeenCalled();
  });
});
