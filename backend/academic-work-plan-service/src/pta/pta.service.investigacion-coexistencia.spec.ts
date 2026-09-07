import { BadRequestException } from '@nestjs/common';
import { PtaService } from './pta.service';

describe('PtaService - coexistencia de proyecto y actividades de investigacion', () => {
  const service = Object.create(PtaService.prototype) as any;
  const baseRules = {
    max_pct_investigacion: 50,
    max_horas_investigacion_global: 400,
    max_horas_inv_fomento: 200,
    max_pct_inv_fomento: 25,
    inv_roles: [{
      nombre: 'COINVESTIGADOR',
      horas_max: 300,
      pct_max: 37.5,
    }],
  };

  const createBody = (projectHours: number, activityHours: number): any => ({
    investigacion_proyecto: {
      rol: 'COINVESTIGADOR',
      horas_solicitadas: projectHours,
    },
    investigacion_actividades: activityHours > 0
      ? [{ actividad_id: 'INV_01', horas_total: activityHours }]
      : [],
  });

  it('mantiene desactivada la coexistencia para configuraciones existentes', () => {
    expect(service.normalizePtaRules({}).inv_permitir_proyecto_actividades_simultaneos)
      .toBe(false);
  });

  it('suma siempre las horas persistidas del proyecto y de las actividades', () => {
    expect(service.computeHorasTotales(createBody(200, 80))).toMatchObject({
      sumInv: 280,
      total: 280,
    });
  });

  it('rechaza proyecto y actividades simultaneos cuando el switch esta apagado', () => {
    const body = createBody(200, 80);
    const hours = service.computeHorasTotales(body);

    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      { ...baseRules, inv_permitir_proyecto_actividades_simultaneos: false },
    )).toThrow(BadRequestException);
    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      { ...baseRules, inv_permitir_proyecto_actividades_simultaneos: false },
    )).toThrow(/proyecto o actividades/);
  });

  it('rechaza una actividad si ya se empezo a diligenciar el proyecto', () => {
    const body = {
      investigacion_proyecto: {
        nombre: 'Proyecto parcialmente diligenciado',
        horas_solicitadas: 0,
      },
      investigacion_actividades: [{ actividad_id: 'INV_01', horas_total: 80 }],
    };
    const hours = service.computeHorasTotales(body);

    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      { ...baseRules, inv_permitir_proyecto_actividades_simultaneos: false },
    )).toThrow(/proyecto o actividades/);
  });

  it('acepta y suma ambos registros cuando el switch esta activo', () => {
    const body = createBody(200, 80);
    const hours = service.computeHorasTotales(body);

    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      { ...baseRules, inv_permitir_proyecto_actividades_simultaneos: true },
    )).not.toThrow();
  });

  it('conserva el tope individual del rol aunque la coexistencia este activa', () => {
    const body = createBody(280, 20); // COINVESTIGADOR: hasta 270h sobre una bolsa de 720h.
    const hours = service.computeHorasTotales(body);

    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      { ...baseRules, inv_permitir_proyecto_actividades_simultaneos: true },
    )).toThrow(/entre 1h y 270h/);
  });

  it('aplica a la suma el tope global de investigacion', () => {
    const body = createBody(250, 120); // Total 370h; tope global: 360h sobre 720h.
    const hours = service.computeHorasTotales(body);

    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      { ...baseRules, inv_permitir_proyecto_actividades_simultaneos: true },
    )).toThrow(/370h \/ 360h/);
  });

  it('permite enviar el proyecto sin adjuntar anticipadamente la resolucion', () => {
    const body = createBody(200, 0);
    const hours = service.computeHorasTotales(body);

    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      { ...baseRules, inv_permitir_proyecto_actividades_simultaneos: false },
    )).not.toThrow();
  });

  it('exige el archivo de resolucion cuando la regla documental esta activa', () => {
    const body = createBody(200, 0);
    const hours = service.computeHorasTotales(body);

    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      {
        ...baseRules,
        inv_adjunto_obligatorio: true,
        inv_permitir_proyecto_actividades_simultaneos: false,
      },
    )).toThrow(/archivo adjunto de la resolución es obligatorio/i);
  });

  it('acepta la resolucion sin solicitar un valor adicional de horas', () => {
    const body = createBody(200, 0);
    body.investigacion_proyecto.resolucion_archivo_url = '/uploads/pta-resoluciones/soporte.pdf';
    const hours = service.computeHorasTotales(body);

    expect(() => service.validateInvestigacionComponent(
      body,
      hours,
      720,
      {
        ...baseRules,
        inv_adjunto_obligatorio: true,
        inv_permitir_proyecto_actividades_simultaneos: false,
      },
    )).not.toThrow();
  });

  it('convierte la resolucion en evidencia usando todas las horas del proyecto', async () => {
    const syncService = Object.create(PtaService.prototype) as any;
    syncService.evidenciaRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value: any) => value),
      save: jest.fn((value: any) => Promise.resolve(value)),
      delete: jest.fn(),
    };

    await syncService.syncResolucionProyectoInvestigacion('pta-1', {
      docente_nombre: 'Docente Prueba',
      investigacion_proyecto: {
        nombre: 'Proyecto Prueba',
        horas_solicitadas: 200,
        resolucion_nombre: 'Resolución 001',
        resolucion_archivo_url: '/uploads/pta-resoluciones/resolucion.pdf',
        resolucion_archivo_nombre: 'resolucion.pdf',
        resolucion_archivo_tipo: 'pdf',
        resolucion_archivo_tamanio: 1024,
        // Un valor histórico distinto debe ignorarse.
        resolucion_horas_justificar: 120,
      },
    });

    expect(syncService.evidenciaRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      ptaId: 'pta-1',
      componentePta: 'investigacion',
      horasAvance: 200,
      storageUrl: '/uploads/pta-resoluciones/resolucion.pdf',
      estadoRevision: 'aprobado',
      revisadoPor: 'Sistema',
      comentarioRevision:
        'Aprobado automáticamente junto con el componente Investigación del PTA.',
    }));
  });
});
